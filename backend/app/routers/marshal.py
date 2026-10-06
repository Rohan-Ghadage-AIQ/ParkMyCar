import os
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.config import settings
from app.models import (
    User, Lot, Booking, BookingStatus, ParkingSession, VerificationResult,
    MarshalShift, Payment, PaymentMethod, PaymentType, PaymentStatus,
    Dispute, DisputeStatus, AuditLog, VehicleClass
)
from app.schemas import (
    VerificationScanResponse, CheckInRequest, WalkInRequest, CheckOutEstimateResponse,
    CheckOutRequest, ShiftStartRequest, ShiftEndRequest, ShiftOut, BookingOut
)
from app.auth import get_current_user, require_role
from app.pricing import calculate_overstay_fee, calculate_booking_price
from app.capacity import calculate_lot_availability
from app.services.payment_service import payment_service

router = APIRouter(prefix="/marshal", tags=["Marshal"])

@router.get("/shifts/active", response_model=Optional[ShiftOut])
def get_active_shift(
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    shift = db.query(MarshalShift).filter(
        MarshalShift.marshal_id == current_user.id,
        MarshalShift.ended_at == None
    ).order_by(MarshalShift.started_at.desc()).first()
    return shift

@router.post("/shifts/start", response_model=ShiftOut)
def start_shift(
    payload: ShiftStartRequest,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.id == payload.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Close any lingering open shift
    open_shifts = db.query(MarshalShift).filter(
        MarshalShift.marshal_id == current_user.id,
        MarshalShift.ended_at == None
    ).all()
    for s in open_shifts:
        s.ended_at = datetime.datetime.utcnow()

    shift = MarshalShift(
        marshal_id=current_user.id,
        lot_id=lot.id,
        started_at=datetime.datetime.utcnow(),
        cash_collected=0.0
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift

@router.post("/shifts/end", response_model=ShiftOut)
def end_shift(
    payload: ShiftEndRequest,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    shift = db.query(MarshalShift).filter(MarshalShift.id == payload.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    if shift.marshal_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    shift.ended_at = datetime.datetime.utcnow()
    shift.cash_submitted = payload.cash_submitted
    shift.discrepancy = round(payload.cash_submitted - shift.cash_collected, 2)
    shift.notes = payload.notes

    audit = AuditLog(
        actor_id=current_user.id,
        action="SHIFT_CLOSED",
        entity="MarshalShift",
        entity_id=str(shift.id),
        metadata_json={
            "lot_id": shift.lot_id,
            "cash_collected": shift.cash_collected,
            "cash_submitted": shift.cash_submitted,
            "discrepancy": shift.discrepancy,
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(shift)
    return shift

@router.get("/occupancy/{lot_id}")
def get_lot_occupancy(
    lot_id: int,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    now = datetime.datetime.utcnow()
    one_hr = now + datetime.timedelta(hours=1)

    # Active on-ground sessions
    active_sessions = db.query(ParkingSession).filter(
        ParkingSession.lot_id == lot.id,
        ParkingSession.check_out_at == None
    ).all()

    # Expected arrivals within the next 2 hours
    expected_arrivals = db.query(Booking).filter(
        Booking.lot_id == lot.id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.start_time >= (now - datetime.timedelta(minutes=30)),
        Booking.start_time <= (now + datetime.timedelta(hours=2))
    ).all()

    total_cap = (lot.capacity_4w or 0) + (lot.capacity_2w or 0)
    avail, _, _ = calculate_lot_availability(db, lot, VehicleClass.FOUR_WHEELER, now, one_hr)

    return {
        "lot_id": lot.id,
        "lot_name": lot.name,
        "total_capacity": total_cap,
        "capacity_4w": lot.capacity_4w or 0,
        "capacity_2w": lot.capacity_2w or 0,
        "current_occupancy": len(active_sessions),
        "available_online_bays": avail,
        "expected_arrivals_count": len(expected_arrivals),
        "expected_arrivals": [
            {
                "booking_code": b.booking_code,
                "plate": b.plate_at_booking,
                "vehicle_class": b.vehicle_class,
                "start_time": b.start_time,
                "end_time": b.end_time,
            } for b in expected_arrivals
        ]
    }

@router.get("/scan/{code}")
def scan_lookup(
    code: str,
    lot_id: Optional[int] = None,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_code == code.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail=f"No booking found for code '{code.upper()}'")

    now = datetime.datetime.utcnow()
    # Check-in window: [start - 15m, end]
    start_window = booking.start_time - datetime.timedelta(minutes=15)
    is_valid_window = (start_window <= now <= booking.end_time)
    
    time_msg = "Valid for check-in"
    if now < start_window:
        diff_min = int((start_window - now).total_seconds() / 60)
        time_msg = f"Early arrival. Check-in opens in {diff_min} mins."
    elif now > booking.end_time:
        time_msg = "Booking slot has expired."

    already_in = (booking.status == BookingStatus.CHECKED_IN)
    wrong_lot = (lot_id is not None and booking.lot_id != lot_id)

    return {
        "booking": booking,
        "lot_name": booking.lot.name if booking.lot else "",
        "expected_plate": booking.plate_at_booking,
        "vehicle_class": booking.vehicle_class,
        "is_valid_time_window": is_valid_window,
        "time_window_message": time_msg,
        "already_checked_in": already_in,
        "wrong_lot": wrong_lot,
        "status": booking.status,
        "amount_paid": booking.amount_paid,
        "payment_status": "PAID_ONLINE"
    }

@router.post("/check-in")
async def process_check_in(
    booking_code: str = Form(...),
    plate_actual: str = Form(...),
    verification_result: str = Form(...), # MATCH or MISMATCH
    mismatch_action: Optional[str] = Form(None), # REJECT, ALLOW_WITH_FEE, ESCALATE
    mismatch_reason: Optional[str] = Form(None),
    mismatch_note: Optional[str] = Form(None),
    client_request_id: str = Form(...),
    lot_id: Optional[int] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_code == booking_code.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.CHECKED_IN:
        raise HTTPException(status_code=400, detail="Vehicle is already checked in")

    if booking.status in [BookingStatus.CANCELLED, BookingStatus.NO_SHOW, BookingStatus.MISMATCH_REJECTED]:
        raise HTTPException(status_code=400, detail=f"Cannot check in booking with status '{booking.status}'")

    # Save photo if provided
    photo_rel_path = None
    if photo:
        ext = photo.filename.split(".")[-1] if "." in photo.filename else "jpg"
        filename = f"verify_{booking.booking_code}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = settings.UPLOAD_DIR / filename
        content = await photo.read()
        with open(filepath, "wb") as f:
            f.write(content)
        photo_rel_path = f"/uploads/{filename}"

    now = datetime.datetime.utcnow()
    clean_plate = plate_actual.strip().upper()

    if verification_result.upper() == VerificationResult.MATCH:
        # Successful match -> start session
        booking.status = BookingStatus.CHECKED_IN
        session = ParkingSession(
            booking_id=booking.id,
            lot_id=booking.lot_id,
            vehicle_class=booking.vehicle_class,
            plate_actual=clean_plate,
            check_in_at=now,
            photo_path=photo_rel_path,
            verification_result=VerificationResult.MATCH,
            marshal_id=current_user.id
        )
        db.add(session)
        audit = AuditLog(
            actor_id=current_user.id,
            action="CHECK_IN_MATCH",
            entity="ParkingSession",
            entity_id=str(booking.id),
            metadata_json={"plate": clean_plate, "booking_code": booking.booking_code}
        )
        db.add(audit)
        db.commit()
        return {"status": "SUCCESS", "message": "Check-in successful (Plate Matched)", "session_id": session.id}

    else:
        # MISMATCH FLOW
        action = (mismatch_action or "REJECT").upper()
        if action == "REJECT":
            booking.status = BookingStatus.MISMATCH_REJECTED
            dispute = Dispute(
                booking_id=booking.id,
                reason=mismatch_reason or "Plate mismatch rejected by attendant",
                note=mismatch_note,
                photo_path=photo_rel_path,
                status=DisputeStatus.OPEN
            )
            db.add(dispute)
            audit = AuditLog(
                actor_id=current_user.id,
                action="MISMATCH_REJECTED",
                entity="Booking",
                entity_id=str(booking.id),
                metadata_json={"expected": booking.plate_at_booking, "actual": clean_plate, "reason": mismatch_reason}
            )
            db.add(audit)
            db.commit()
            return {"status": "REJECTED", "message": "Entry rejected due to license plate mismatch. Dispute ticket logged."}

        elif action == "ALLOW_WITH_FEE":
            # Collect ₹50 vehicle-change fee
            fee_pmt = Payment(
                booking_id=booking.id,
                amount=50.0,
                method=PaymentMethod.CASH,
                type=PaymentType.VEHICLE_CHANGE_FEE,
                status=PaymentStatus.SUCCESS,
                collected_by_marshal_id=current_user.id,
                receipt_no=f"MOCK-CHGFEE-{booking.booking_code}-{uuid.uuid4().hex[:4].upper()}",
                client_request_id=f"chgfee-{booking.id}-{int(now.timestamp())}"
            )
            db.add(fee_pmt)

            # Update active shift cash collected
            active_shift = db.query(MarshalShift).filter(
                MarshalShift.marshal_id == current_user.id,
                MarshalShift.ended_at == None
            ).first()
            if active_shift:
                active_shift.cash_collected = (active_shift.cash_collected or 0.0) + 50.0

            booking.status = BookingStatus.CHECKED_IN
            session = ParkingSession(
                booking_id=booking.id,
                lot_id=booking.lot_id,
                vehicle_class=booking.vehicle_class,
                plate_actual=clean_plate,
                check_in_at=now,
                photo_path=photo_rel_path,
                verification_result=VerificationResult.MISMATCH,
                marshal_id=current_user.id
            )
            db.add(session)
            audit = AuditLog(
                actor_id=current_user.id,
                action="MISMATCH_ALLOWED_WITH_FEE",
                entity="ParkingSession",
                entity_id=str(booking.id),
                metadata_json={
                    "expected": booking.plate_at_booking,
                    "actual": clean_plate,
                    "fee": 50.0,
                    "reason": mismatch_reason
                }
            )
            db.add(audit)
            db.commit()
            return {
                "status": "ALLOWED_WITH_FEE",
                "message": "Allowed entry with ₹50 vehicle-change fee recorded.",
                "session_id": session.id,
                "fee": 50.0
            }

        elif action == "ESCALATE":
            dispute = Dispute(
                booking_id=booking.id,
                reason=f"ESCALATION: {mismatch_reason or 'Attendant requested Admin review'}",
                note=mismatch_note,
                photo_path=photo_rel_path,
                status=DisputeStatus.OPEN
            )
            db.add(dispute)
            audit = AuditLog(
                actor_id=current_user.id,
                action="MISMATCH_ESCALATED",
                entity="Booking",
                entity_id=str(booking.id),
                metadata_json={"expected": booking.plate_at_booking, "actual": clean_plate}
            )
            db.add(audit)
            db.commit()
            return {"status": "ESCALATED", "message": "Dispute escalated to Admin Queue. Gate entry on hold."}

@router.post("/walkin")
def create_walkin(
    payload: WalkInRequest,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.id == payload.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    now = datetime.datetime.utcnow()
    end_time = now + datetime.timedelta(hours=payload.duration_hours)

    total_price, _, _, _, _, _ = calculate_booking_price(
        db, lot, payload.vehicle_class, now, end_time
    )

    clean_plate = payload.plate_number.strip().upper()

    # Process walkin payment
    pmt_result = payment_service.process_payment(
        db=db,
        amount=total_price,
        method=payload.payment_method.upper(),
        payment_type=PaymentType.WALKIN,
        client_request_id=payload.client_request_id,
        collected_by_marshal_id=current_user.id,
        simulate_status="SUCCESS"
    )

    # If Cash, add to active shift
    if payload.payment_method.upper() == PaymentMethod.CASH:
        active_shift = db.query(MarshalShift).filter(
            MarshalShift.marshal_id == current_user.id,
            MarshalShift.ended_at == None
        ).first()
        if active_shift:
            active_shift.cash_collected = (active_shift.cash_collected or 0.0) + total_price

    session = ParkingSession(
        lot_id=lot.id,
        vehicle_class=payload.vehicle_class,
        plate_actual=clean_plate,
        check_in_at=now,
        verification_result=VerificationResult.WALKIN,
        marshal_id=current_user.id,
        is_overstay_paid=True
    )
    db.add(session)

    audit = AuditLog(
        actor_id=current_user.id,
        action="WALKIN_REGISTERED",
        entity="ParkingSession",
        entity_id=clean_plate,
        metadata_json={
            "lot_id": lot.id,
            "amount": total_price,
            "method": payload.payment_method,
            "receipt_no": pmt_result.receipt_no
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(session)

    return {
        "status": "SUCCESS",
        "session_id": session.id,
        "receipt_no": pmt_result.receipt_no,
        "amount_collected": total_price,
        "plate": clean_plate
    }

@router.get("/checkout-estimate/{session_id}", response_model=CheckOutEstimateResponse)
def get_checkout_estimate(
    session_id: int,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    session = db.query(ParkingSession).filter(ParkingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Parking session not found")

    now = datetime.datetime.utcnow()
    scheduled_end = session.booking.end_time if session.booking else session.check_in_at + datetime.timedelta(hours=2)

    overstay_min, overstay_amt = calculate_overstay_fee(
        db, session.lot, session.vehicle_class, scheduled_end, now
    )

    return CheckOutEstimateResponse(
        session_id=session.id,
        booking_id=session.booking_id,
        plate_actual=session.plate_actual,
        check_in_at=session.check_in_at,
        check_out_at=now,
        expected_end_at=scheduled_end,
        overstay_minutes=overstay_min,
        overstay_amount=overstay_amt,
        is_overstay_paid=session.is_overstay_paid if overstay_amt > 0 else True
    )

@router.post("/checkout")
def complete_checkout(
    payload: CheckOutRequest,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    session = db.query(ParkingSession).filter(ParkingSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.check_out_at:
        raise HTTPException(status_code=400, detail="Vehicle has already checked out")

    now = datetime.datetime.utcnow()
    scheduled_end = session.booking.end_time if session.booking else session.check_in_at + datetime.timedelta(hours=2)

    overstay_min, overstay_amt = calculate_overstay_fee(
        db, session.lot, session.vehicle_class, scheduled_end, now
    )

    if overstay_amt > 0:
        # Collect overstay fee
        pmt_result = payment_service.process_payment(
            db=db,
            amount=overstay_amt,
            method=(payload.payment_method or "CASH").upper(),
            payment_type=PaymentType.OVERSTAY,
            client_request_id=payload.client_request_id,
            booking_id=session.booking_id,
            collected_by_marshal_id=current_user.id,
            simulate_status="SUCCESS"
        )
        if (payload.payment_method or "CASH").upper() == PaymentMethod.CASH:
            active_shift = db.query(MarshalShift).filter(
                MarshalShift.marshal_id == current_user.id,
                MarshalShift.ended_at == None
            ).first()
            if active_shift:
                active_shift.cash_collected = (active_shift.cash_collected or 0.0) + overstay_amt

    session.check_out_at = now
    session.overstay_minutes = overstay_min
    session.overstay_amount = overstay_amt
    session.is_overstay_paid = True

    if session.booking:
        session.booking.status = BookingStatus.COMPLETED

    audit = AuditLog(
        actor_id=current_user.id,
        action="CHECK_OUT_COMPLETED",
        entity="ParkingSession",
        entity_id=str(session.id),
        metadata_json={"plate": session.plate_actual, "overstay_fee": overstay_amt, "overstay_min": overstay_min}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "COMPLETED",
        "message": "Check-out completed successfully",
        "overstay_amount": overstay_amt,
        "overstay_minutes": overstay_min
    }

@router.post("/lot-full/{lot_id}")
def mark_lot_full(
    lot_id: int,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    now = datetime.datetime.utcnow()
    # Find bookings arriving within next 1 hour
    affected = db.query(Booking).filter(
        Booking.lot_id == lot.id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.start_time <= (now + datetime.timedelta(hours=1))
    ).all()

    refunded_count = 0
    for b in affected:
        b.status = BookingStatus.CANCELLED
        b.cancellation_refund_amount = b.amount_paid
        # Mock full refund
        ref_pmt = Payment(
            booking_id=b.id,
            amount=b.amount_paid,
            method=PaymentMethod.UPI,
            type=PaymentType.REFUND,
            status=PaymentStatus.SUCCESS,
            receipt_no=f"MOCK-REF-LOTFULL-{b.booking_code}",
            client_request_id=f"lotfull-{b.id}-{int(now.timestamp())}"
        )
        db.add(ref_pmt)
        refunded_count += 1

    audit = AuditLog(
        actor_id=current_user.id,
        action="LOT_FULL_TRIGGERED",
        entity="Lot",
        entity_id=str(lot.id),
        metadata_json={"affected_bookings_refunded": refunded_count}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Lot declared FULL. {refunded_count} affected upcoming bookings automatically refunded 100%."
    }

@router.get("/active-sessions/{lot_id}")
def list_active_sessions(
    lot_id: int,
    current_user: User = Depends(require_role(["MARSHAL", "ADMIN"])),
    db: Session = Depends(get_db)
):
    sessions = db.query(ParkingSession).filter(
        ParkingSession.lot_id == lot_id,
        ParkingSession.check_out_at == None
    ).order_by(ParkingSession.check_in_at.desc()).all()
    return sessions
