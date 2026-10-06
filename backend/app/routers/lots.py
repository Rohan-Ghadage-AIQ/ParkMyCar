import math
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Lot, PriceRule, VehicleClass, Booking, BookingStatus, ParkingSession
from app.schemas import LotOut, PriceEstimateRequest, PriceEstimateResponse, PriceRuleOut
from app.pricing import calculate_booking_price
from app.capacity import calculate_lot_availability

router = APIRouter(prefix="/lots", tags=["Lots"])

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

@router.get("", response_model=List[LotOut])
def list_lots(
    q: Optional[str] = Query(None, description="Search by name, address, ward"),
    ward: Optional[str] = Query(None),
    source: Optional[str] = Query(None, description="MCGM, BEST, PRIVATE, DEMO"),
    vehicle_class: str = Query("FOUR_WHEELER"),
    only_bookable: bool = Query(False),
    user_lat: Optional[float] = Query(None),
    user_lng: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Lot)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Lot.name.ilike(search),
                Lot.address.ilike(search),
                Lot.ward.ilike(search),
                Lot.gis_id.ilike(search)
            )
        )

    if ward:
        query = query.filter(Lot.ward.ilike(ward))

    if source:
        query = query.filter(Lot.source == source.upper())

    if only_bookable:
        query = query.filter(Lot.bookable == True)

    lots = query.all()
    results = []
    now = datetime.utcnow()
    one_hr_later = now + timedelta(hours=1)

    for lot in lots:
        # Calculate instant 1-hour availability & price
        avail, total, quota = calculate_lot_availability(db, lot, vehicle_class, now, one_hr_later)
        total_price, _, base_p, _, _, _ = calculate_booking_price(db, lot, vehicle_class, now, one_hr_later)

        dist = None
        if user_lat is not None and user_lng is not None and lot.lat is not None and lot.lng is not None:
            dist = haversine(user_lat, user_lng, lot.lat, lot.lng)

        # Count current checked-in occupancy
        occupied = db.query(ParkingSession).filter(
            ParkingSession.lot_id == lot.id,
            ParkingSession.check_out_at == None
        ).count()

        lot_out = LotOut.model_validate(lot)
        lot_out.distance_km = dist
        lot_out.available_bays = avail
        lot_out.current_occupancy = occupied
        lot_out.calculated_price_per_hr = total_price
        results.append(lot_out)

    if user_lat is not None and user_lng is not None:
        results.sort(key=lambda x: (x.distance_km if x.distance_km is not None else 9999))

    return results

@router.get("/{lot_id}", response_model=LotOut)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    
    now = datetime.utcnow()
    one_hr_later = now + timedelta(hours=1)
    avail, total, quota = calculate_lot_availability(db, lot, VehicleClass.FOUR_WHEELER, now, one_hr_later)
    total_price, _, _, _, _, _ = calculate_booking_price(db, lot, VehicleClass.FOUR_WHEELER, now, one_hr_later)

    occupied = db.query(ParkingSession).filter(
        ParkingSession.lot_id == lot.id,
        ParkingSession.check_out_at == None
    ).count()

    lot_out = LotOut.model_validate(lot)
    lot_out.available_bays = avail
    lot_out.current_occupancy = occupied
    lot_out.calculated_price_per_hr = total_price
    return lot_out

@router.get("/{lot_id}/rules", response_model=List[PriceRuleOut])
def get_lot_price_rules(lot_id: int, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")

    rules = db.query(PriceRule).filter(
        or_(
            PriceRule.lot_id == lot.id,
            PriceRule.price_category == (lot.price_category or "A")
        )
    ).all()
    return rules

@router.post("/estimate-price", response_model=PriceEstimateResponse)
def estimate_booking_price(payload: PriceEstimateRequest, db: Session = Depends(get_db)):
    lot = db.query(Lot).filter(Lot.id == payload.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    duration_hours = (payload.end_time - payload.start_time).total_seconds() / 3600.0
    if duration_hours < 1.0 or duration_hours > 12.0:
        raise HTTPException(status_code=400, detail="Booking duration must be between 1 and 12 hours")

    total, band, base, mult, is_free, free_note = calculate_booking_price(
        db, lot, payload.vehicle_class, payload.start_time, payload.end_time
    )

    avail, total_cap, quota_cap = calculate_lot_availability(
        db, lot, payload.vehicle_class, payload.start_time, payload.end_time
    )

    return PriceEstimateResponse(
        lot_id=lot.id,
        vehicle_class=payload.vehicle_class,
        duration_hours=round(duration_hours, 2),
        duration_band=band,
        base_price=base,
        multiplier=mult,
        total_price=total,
        is_free=is_free,
        free_badge_note=free_note,
        available_bays=avail,
        total_capacity=total_cap,
        quota_capacity=quota_cap
    )

@router.get("/{lot_id}/nearby-alternatives", response_model=List[LotOut])
def get_nearby_alternatives(lot_id: int, limit: int = 4, db: Session = Depends(get_db)):
    current_lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not current_lot or current_lot.lat is None or current_lot.lng is None:
        raise HTTPException(status_code=404, detail="Lot or coordinates not found")

    other_lots = db.query(Lot).filter(
        Lot.id != lot_id,
        Lot.bookable == True,
        Lot.lat != None,
        Lot.lng != None
    ).all()

    now = datetime.utcnow()
    one_hr = now + timedelta(hours=1)
    results = []

    for o in other_lots:
        dist = haversine(current_lot.lat, current_lot.lng, o.lat, o.lng)
        avail, _, _ = calculate_lot_availability(db, o, VehicleClass.FOUR_WHEELER, now, one_hr)
        if avail > 0:
            total_price, _, _, _, _, _ = calculate_booking_price(db, o, VehicleClass.FOUR_WHEELER, now, one_hr)
            out = LotOut.model_validate(o)
            out.distance_km = dist
            out.available_bays = avail
            out.calculated_price_per_hr = total_price
            results.append(out)

    results.sort(key=lambda x: x.distance_km)
    return results[:limit]
