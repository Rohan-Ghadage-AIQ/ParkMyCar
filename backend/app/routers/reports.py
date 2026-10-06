from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DataReport, Lot, User
from app.schemas import DataReportCreate, DataReportOut
from app.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=DataReportOut)
def submit_data_report(
    payload: DataReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.id == payload.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    report = DataReport(
        lot_id=lot.id,
        user_id=current_user.id,
        message=payload.message.strip(),
        status="OPEN"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
