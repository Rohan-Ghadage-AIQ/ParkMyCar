import random
import string
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Booking, BookingStatus, Lot, Vehicle, User, Payment, PaymentMethod,
    PaymentType, PaymentStatus, AuditLog, VehicleClass
)
from app.schemas import BookingCreateRequest, BookingOut, UpdatePlateRequest
from app.auth import get_current_user
from app.pricing import calculate_booking_price, calculate_cancellation_refund
from app.capacity import reserve_slot_transactional, calculate_lot_availability
from app.services.payment_service import payment_service

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def generate_booking_code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" # Exclude similar chars O,0,1,I
    return "".join(random.choices(chars, k=6))

@router.post("", response_model=BookingOut)
def create_booking(
    payload: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == payload.vehicle_id,
        Vehicle.owner_id == current_user.id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or does not belong to you")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    duration_hours = (payload.end_time - payload.start_time).total_seconds() / 3600.0
    if duration_hours < 1.0 or duration_hours > 12.0:
        raise HTTPException(status_code=400, detail="Booking duration must be between 1 and 12 hours")

    # Transactional check & reserve
    is_available, lot, available_bays = reserve_slot_transactional(
        db, payload.lot_id, vehicle.vehicle_class, payload.start_time, payload.end_time
    )

    if not is_available or not lot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sorry, this lot has reached online booking quota for the selected slot. Please pick another time or alternative lot."
        )

    # Calculate price
    total_price, band, base, mult, is_free, _ = calculate_booking_price(
        db, lot, vehicle.vehicle_class, payload.start_time, payload.end_time
    )

    # Generate unique 6-character code
    for _ in range(10):
        code = generate_booking_code()
        if not db.query(Booking).filter(Booking.booking_code == code).first():
            break

    # Process payment
    pmt_result = payment_service.process_payment(
        db=db,
        amount=total_price,
        method=PaymentMethod.UPI,
        payment_type=PaymentType.ADVANCE,
        client_request_id=payload.client_request_id,
        simulate_status="SUCCESS"
    )

    if not pmt_result.success:
        raise HTTPException(status_code=400, detail=f"Payment failed: {pmt_result.message}")

    booking = Booking(
        booking_code=code,
        owner_id=current_user.id,
        vehicle_id=vehicle.id,
        vehicle_class=vehicle.vehicle_class,
        plate_at_booking=vehicle.plate_number,
        lot_id=lot.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        amount_paid=total_price,
        status=BookingStatus.CONFIRMED,
        plate_edit_count=0
    )
    db.add(booking)
    db.flush()

    # Link payment to booking
    pmt = db.query(Payment).filter(Payment.id == pmt_result.payment_id).first()
    if pmt:
        pmt.booking_id = booking.id

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        action="BOOKING_CREATED",
        entity="Booking",
        entity_id=str(booking.id),
        metadata_json={
            "booking_code": booking.booking_code,
            "lot_name": lot.name,
            "plate": vehicle.plate_number,
            "amount_paid": total_price,
            "start_time": str(payload.start_time),
            "end_time": str(payload.end_time),
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(booking)

    return booking

@router.get("/my", response_model=List[BookingOut])
def get_my_bookings(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).filter(Booking.owner_id == current_user.id)
    if status_filter:
        query = query.filter(Booking.status == status_filter.upper())
    return query.order_by(Booking.start_time.desc()).all()

@router.get("/{booking_code}", response_model=BookingOut)
def get_booking_details(
    booking_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_code == booking_code.upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.owner_id != current_user.id and current_user.role not in ["ADMIN", "MARSHAL"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")

    return booking

@router.patch("/{booking_id}/update-plate", response_model=BookingOut)
def update_booking_plate(
    booking_id: int,
    payload: UpdatePlateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_admin = current_user.role == "ADMIN"
    if booking.owner_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Owners can edit once before start time. Admin can override anytime.
    if not is_admin:
        now = datetime.datetime.utcnow()
        if now >= booking.start_time:
            raise HTTPException(status_code=400, detail="Cannot edit vehicle plate after booking start time")
        if booking.plate_edit_count >= 1:
            raise HTTPException(status_code=400, detail="License plate can only be edited once before arrival")

    old_plate = booking.plate_at_booking
    new_plate = payload.new_plate.strip().upper()
    booking.plate_at_booking = new_plate
    booking.plate_edit_count += 1

    audit = AuditLog(
        actor_id=current_user.id,
        action="PLATE_UPDATED",
        entity="Booking",
        entity_id=str(booking.id),
        metadata_json={"old_plate": old_plate, "new_plate": new_plate, "is_admin": is_admin}
    )
    db.add(audit)
    db.commit()
    db.refresh(booking)
    return booking

@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.owner_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking with status '{booking.status}'")

    now = datetime.datetime.utcnow()
    refund_amount, refund_pct, reason = calculate_cancellation_refund(
        booking.amount_paid, booking.start_time, now
    )

    booking.status = BookingStatus.CANCELLED
    booking.cancellation_refund_amount = refund_amount

    # Record mock refund payment
    if refund_amount > 0:
        ref_pmt = Payment(
            booking_id=booking.id,
            amount=refund_amount,
            method=PaymentMethod.UPI,
            type=PaymentType.REFUND,
            status=PaymentStatus.SUCCESS,
            receipt_no=f"MOCK-REF-CNCL-{booking.booking_code}",
            client_request_id=f"cancel-refund-{booking.id}-{int(now.timestamp())}"
        )
        db.add(ref_pmt)

    audit = AuditLog(
        actor_id=current_user.id,
        action="BOOKING_CANCELLED",
        entity="Booking",
        entity_id=str(booking.id),
        metadata_json={
            "refund_amount": refund_amount,
            "refund_percentage": refund_pct,
            "reason": reason
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(booking)
    return booking
