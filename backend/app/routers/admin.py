import os
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.config import settings
from app.models import (
    User, Lot, Booking, BookingStatus, ParkingSession, MarshalShift,
    Dispute, DisputeStatus, DataReport, AuditLog, Payment, PaymentMethod,
    PaymentType, PaymentStatus
)
from app.schemas import (
    LotOut, LotUpdateAdmin, BookingOut, DisputeOut, DisputeResolveRequest,
    DataReportOut, AuditLogOut, ShiftOut
)
from app.auth import get_current_user, require_role
from app.importers.mcgm_import import import_mcgm_data

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard-summary")
def get_dashboard_summary(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    total_bookings = db.query(Booking).count()
    active_bookings = db.query(Booking).filter(Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN])).count()
    completed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()
    cancelled_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CANCELLED).count()
    disputes_count = db.query(Dispute).filter(Dispute.status == DisputeStatus.OPEN).count()

    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.SUCCESS).scalar() or 0.0
    digital_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.SUCCESS,
        Payment.method == PaymentMethod.UPI
    ).scalar() or 0.0
    cash_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.SUCCESS,
        Payment.method == PaymentMethod.CASH
    ).scalar() or 0.0

    total_lots = db.query(Lot).count()
    active_sessions = db.query(ParkingSession).filter(ParkingSession.check_out_at == None).count()

    # Per lot breakdown
    lots = db.query(Lot).all()
    lot_summaries = []
    for l in lots:
        occ = db.query(ParkingSession).filter(
            ParkingSession.lot_id == l.id,
            ParkingSession.check_out_at == None
        ).count()
        tot = (l.capacity_4w or 0) + (l.capacity_2w or 0)
        lot_summaries.append({
            "id": l.id,
            "name": l.name,
            "ward": l.ward,
            "source": l.source,
            "bookable": l.bookable,
            "quota_percent": l.bookable_quota_percent,
            "capacity": tot,
            "current_occupancy": occ
        })

    return {
        "metrics": {
            "total_bookings": total_bookings,
            "active_bookings": active_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "open_disputes": disputes_count,
            "total_revenue": round(total_revenue, 2),
            "digital_revenue": round(digital_revenue, 2),
            "cash_revenue": round(cash_revenue, 2),
            "total_lots": total_lots,
            "active_sessions": active_sessions
        },
        "lots": lot_summaries
    }

@router.put("/lots/{lot_id}", response_model=LotOut)
def update_lot(
    lot_id: int,
    payload: LotUpdateAdmin,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(lot, k, v)

    audit = AuditLog(
        actor_id=current_user.id,
        action="LOT_UPDATED",
        entity="Lot",
        entity_id=str(lot.id),
        metadata_json=update_dict
    )
    db.add(audit)
    db.commit()
    db.refresh(lot)
    return lot

@router.get("/bookings", response_model=List[BookingOut])
def list_all_bookings(
    status: Optional[str] = None,
    lot_id: Optional[int] = None,
    ward: Optional[str] = None,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status.upper())
    if lot_id:
        query = query.filter(Booking.lot_id == lot_id)
    if ward:
        query = query.join(Lot).filter(Lot.ward.ilike(ward))
    return query.order_by(Booking.created_at.desc()).limit(100).all()

@router.get("/disputes", response_model=List[DisputeOut])
def list_disputes(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(Dispute)
    if status:
        query = query.filter(Dispute.status == status.upper())
    return query.order_by(Dispute.created_at.desc()).all()

@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: int,
    payload: DisputeResolveRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.status = payload.status.upper()
    dispute.resolved_by = current_user.id
    dispute.resolved_at = datetime.datetime.utcnow()

    # If REFUNDED, issue mock refund payment for the booking
    if dispute.status == DisputeStatus.REFUNDED and dispute.booking:
        ref_pmt = Payment(
            booking_id=dispute.booking.id,
            amount=dispute.booking.amount_paid,
            method=PaymentMethod.UPI,
            type=PaymentType.REFUND,
            status=PaymentStatus.SUCCESS,
            receipt_no=f"MOCK-DISPUTE-REF-{dispute.booking.booking_code}",
            client_request_id=f"dispute-refund-{dispute.id}-{int(datetime.datetime.utcnow().timestamp())}"
        )
        db.add(ref_pmt)
        dispute.booking.status = BookingStatus.CANCELLED
        dispute.booking.cancellation_refund_amount = dispute.booking.amount_paid

    audit = AuditLog(
        actor_id=current_user.id,
        action="DISPUTE_RESOLVED",
        entity="Dispute",
        entity_id=str(dispute.id),
        metadata_json={"status": dispute.status, "note": payload.note}
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Dispute marked as {dispute.status}"}

@router.get("/shifts", response_model=List[ShiftOut])
def list_marshal_shifts(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return db.query(MarshalShift).order_by(MarshalShift.started_at.desc()).all()

@router.post("/import-data")
def trigger_data_import(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    report = import_mcgm_data(settings.DATA_DIR, db)
    return {
        "status": "SUCCESS",
        "message": "Data import completed",
        "report": report
    }

@router.post("/upload-csv")
async def upload_csv_files(
    file_type: str, # mcgm, best, charges
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    filename_map = {
        "mcgm": "mcgm_offstreet_lots.csv",
        "best": "best_depots_terminals.csv",
        "charges": "parking_charges.csv"
    }
    target_name = filename_map.get(file_type.lower())
    if not target_name:
        raise HTTPException(status_code=400, detail="Invalid file_type. Must be mcgm, best, or charges")

    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    target_path = settings.DATA_DIR / target_name
    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    return {"status": "SUCCESS", "message": f"Uploaded {target_name}. You can now trigger import."}

@router.get("/reports", response_model=List[DataReportOut])
def list_data_reports(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return db.query(DataReport).order_by(DataReport.created_at.desc()).all()

@router.get("/audit-logs", response_model=List[AuditLogOut])
def list_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
