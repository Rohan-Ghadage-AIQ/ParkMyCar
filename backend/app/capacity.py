import math
from datetime import datetime
from typing import Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models import Lot, Booking, BookingStatus, VehicleClass, ParkingSession

def get_lot_capacity_for_class(lot: Lot, vehicle_class: str) -> int:
    if vehicle_class == VehicleClass.TWO_WHEELER:
        return lot.capacity_2w or 0
    elif vehicle_class == VehicleClass.LCV:
        return lot.capacity_lcv or 0
    else: # FOUR_WHEELER or AUTO_TAXI
        return lot.capacity_4w or 0

def calculate_lot_availability(
    db: Session,
    lot: Lot,
    vehicle_class: str,
    start_time: datetime,
    end_time: datetime
) -> Tuple[int, int, int]:
    """
    Returns (available_bays, total_capacity, quota_capacity)
    """
    total_capacity = get_lot_capacity_for_class(lot, vehicle_class)
    if total_capacity <= 0 or not lot.bookable:
        return 0, total_capacity, 0

    quota_pct = lot.bookable_quota_percent if lot.bookable_quota_percent is not None else 30
    quota_capacity = math.floor(total_capacity * (quota_pct / 100.0))
    if quota_capacity <= 0:
        quota_capacity = 1 if total_capacity > 0 else 0

    # Count overlapping bookings
    overlapping_count = db.query(Booking).filter(
        Booking.lot_id == lot.id,
        Booking.vehicle_class == vehicle_class,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]),
        Booking.start_time < end_time,
        Booking.end_time > start_time
    ).count()

    available_bays = max(0, quota_capacity - overlapping_count)
    return available_bays, total_capacity, quota_capacity

def reserve_slot_transactional(
    db: Session,
    lot_id: int,
    vehicle_class: str,
    start_time: datetime,
    end_time: datetime
) -> Tuple[bool, Lot, int]:
    """
    Locks lot row and checks concurrency safety.
    Returns (is_available, lot_object, available_bays)
    """
    # Use with_for_update if not sqlite or default select
    query = db.query(Lot).filter(Lot.id == lot_id)
    if db.bind.dialect.name != "sqlite":
        query = query.with_for_update()
    
    lot = query.first()
    if not lot or not lot.bookable:
        return False, None, 0

    available_bays, total_capacity, quota_capacity = calculate_lot_availability(
        db, lot, vehicle_class, start_time, end_time
    )

    if available_bays <= 0:
        return False, lot, 0

    return True, lot, available_bays
