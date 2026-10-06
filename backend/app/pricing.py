import math
from datetime import datetime, timedelta
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app.models import Lot, PriceRule, VehicleClass

def get_duration_band(duration_hours: float) -> str:
    if duration_hours <= 1.0:
        return "Upto 1 hr"
    elif duration_hours <= 3.0:
        return "1-3 hrs"
    elif duration_hours <= 6.0:
        return "3-6 hrs"
    else:
        return "6-12 hrs"

def calculate_booking_price(
    db: Session,
    lot: Lot,
    vehicle_class: str,
    start_time: datetime,
    end_time: datetime
) -> Tuple[float, str, float, float, bool, Optional[str]]:
    """
    Returns (total_price, duration_band, base_price, multiplier, is_free, free_badge_note)
    """
    duration_seconds = (end_time - start_time).total_seconds()
    if duration_seconds < 3600:
        duration_hours = 1.0
    else:
        duration_hours = math.ceil(duration_seconds / 3600.0)
    
    if duration_hours > 12.0:
        duration_hours = 12.0

    duration_band = get_duration_band(duration_hours)
    
    is_free = False
    free_badge_note = None
    if lot.free_parking == "Y":
        free_badge_note = "Free for limited time, check on site"

    # Admin price override if present
    if lot.price_override is not None:
        base_price = lot.price_override * duration_hours
        total = round(base_price * (lot.pricing_multiplier or 1.0), 2)
        return total, duration_band, base_price, (lot.pricing_multiplier or 1.0), is_free, free_badge_note

    # Check PriceRule for lot or price_category
    rule = None
    if lot.id:
        rule = db.query(PriceRule).filter(
            PriceRule.lot_id == lot.id,
            PriceRule.vehicle_class == vehicle_class,
            PriceRule.duration_band == duration_band
        ).first()

    if not rule and lot.price_category:
        rule = db.query(PriceRule).filter(
            PriceRule.price_category == lot.price_category,
            PriceRule.vehicle_class == vehicle_class,
            PriceRule.duration_band == duration_band
        ).first()

    if not rule:
        # Default fallback standard rate
        defaults = {
            VehicleClass.TWO_WHEELER: {"Upto 1 hr": 15, "1-3 hrs": 25, "3-6 hrs": 35, "6-12 hrs": 50},
            VehicleClass.FOUR_WHEELER: {"Upto 1 hr": 60, "1-3 hrs": 100, "3-6 hrs": 150, "6-12 hrs": 220},
            VehicleClass.LCV: {"Upto 1 hr": 90, "1-3 hrs": 150, "3-6 hrs": 220, "6-12 hrs": 320},
            VehicleClass.AUTO_TAXI: {"Upto 1 hr": 30, "1-3 hrs": 50, "3-6 hrs": 75, "6-12 hrs": 110},
        }
        base_price = defaults.get(vehicle_class, defaults[VehicleClass.FOUR_WHEELER]).get(duration_band, 60.0)
    else:
        base_price = rule.price_inr

    multiplier = lot.pricing_multiplier or 1.0
    total = round(base_price * multiplier, 2)
    return total, duration_band, base_price, multiplier, is_free, free_badge_note

def calculate_cancellation_refund(amount_paid: float, start_time: datetime, cancel_time: datetime) -> Tuple[float, float, str]:
    """
    Returns (refund_amount, refund_percentage, tier_reason)
    Rules:
      > 2 hours before start: 100%
      30 mins to 2 hours before start: 50%
      < 30 mins before start: 0%
    """
    diff_minutes = (start_time - cancel_time).total_seconds() / 60.0
    if diff_minutes > 120:
        return amount_paid, 100.0, "Cancelled >2 hours before start (100% refund)"
    elif diff_minutes >= 30:
        refund = round(amount_paid * 0.5, 2)
        return refund, 50.0, "Cancelled between 30 min and 2 hours before start (50% refund)"
    else:
        return 0.0, 0.0, "Cancelled <30 minutes before start (No refund)"

def calculate_overstay_fee(db: Session, lot: Lot, vehicle_class: str, scheduled_end: datetime, actual_end: datetime) -> Tuple[int, float]:
    """
    Overstay: 1.5x the applicable 1-hour rate per started 30-minute block.
    Returns (overstay_minutes, overstay_amount)
    """
    if actual_end <= scheduled_end:
        return 0, 0.0

    overstay_seconds = (actual_end - scheduled_end).total_seconds()
    overstay_minutes = math.ceil(overstay_seconds / 60.0)
    blocks_30m = math.ceil(overstay_minutes / 30.0)

    # 1 hr base rate
    rule = db.query(PriceRule).filter(
        PriceRule.price_category == (lot.price_category or "A"),
        PriceRule.vehicle_class == vehicle_class,
        PriceRule.duration_band == "Upto 1 hr"
    ).first()
    rate_1hr = rule.price_inr if rule else 60.0

    # Rate per 30m block is 1.5x * (rate_1hr / 2)
    rate_per_block = (rate_1hr / 2.0) * 1.5
    overstay_amount = round(blocks_30m * rate_per_block, 2)
    return overstay_minutes, overstay_amount
