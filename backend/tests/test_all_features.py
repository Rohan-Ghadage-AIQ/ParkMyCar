import datetime
import pytest
from app.models import (
    Lot, PriceRule, User, Vehicle, Booking, BookingStatus,
    ParkingSession, VerificationResult, Payment, UserRole, VehicleClass
)
from app.pricing import (
    calculate_booking_price, calculate_cancellation_refund, calculate_overstay_fee
)
from app.capacity import calculate_lot_availability, reserve_slot_transactional
from app.services.payment_service import payment_service
from app.tasks.no_show_task import process_no_shows
from app.importers.mcgm_import import clean_int, import_mcgm_data
from app.config import settings

def test_importer_and_quirks(db_session):
    # Test clean_int handles text "ALLOWED" or blanks
    val, note = clean_int("ALLOWED")
    assert val is None
    assert "ALLOWED" in note

    val_blank, note_blank = clean_int("")
    assert val_blank is None

    val_num, note_num = clean_int("250")
    assert val_num == 250
    assert note_num is None

    # Verify MCGM lots are present in db
    mcgm_lots = db_session.query(Lot).filter(Lot.agency == "MCGM").all()
    assert len(mcgm_lots) >= 20

    # Verify BEST lots have bookable=False by default
    best_lots = db_session.query(Lot).filter(Lot.agency == "BEST").all()
    assert len(best_lots) >= 15
    for b in best_lots:
        assert b.bookable is False

    # Verify Private lots
    pvt_lots = db_session.query(Lot).filter(Lot.agency == "PRIVATE").all()
    assert len(pvt_lots) == 3

    # Test Idempotent re-run
    rep = import_mcgm_data(settings.DATA_DIR, db_session)
    assert rep["errors"] == []

def test_pricing_calculation(db_session):
    lot_a = db_session.query(Lot).filter(Lot.price_category == "A", Lot.price_override == None).first()
    assert lot_a is not None

    now = datetime.datetime.utcnow()
    # 1 hour
    price_1h, band_1h, base, mult, is_free, _ = calculate_booking_price(
        db_session, lot_a, VehicleClass.FOUR_WHEELER, now, now + datetime.timedelta(hours=1)
    )
    assert band_1h == "Upto 1 hr"
    assert price_1h == 60.0

    # 2.5 hours -> band "1-3 hrs"
    price_3h, band_3h, _, _, _, _ = calculate_booking_price(
        db_session, lot_a, VehicleClass.FOUR_WHEELER, now, now + datetime.timedelta(hours=2, minutes=30)
    )
    assert band_3h == "1-3 hrs"
    assert price_3h == 100.0

    # Price override check
    lot_pvt = db_session.query(Lot).filter(Lot.agency == "PRIVATE").first()
    assert lot_pvt is not None
    p_pvt, _, _, _, _, _ = calculate_booking_price(
        db_session, lot_pvt, VehicleClass.FOUR_WHEELER, now, now + datetime.timedelta(hours=2)
    )
    assert p_pvt == lot_pvt.price_override * 2.0

def test_cancellation_refund_tiers():
    amount = 200.0
    now = datetime.datetime.utcnow()

    # Tier 1: > 2 hours -> 100%
    start_future = now + datetime.timedelta(hours=3)
    refund, pct, reason = calculate_cancellation_refund(amount, start_future, now)
    assert pct == 100.0
    assert refund == 200.0

    # Tier 2: 1 hour before start -> 50%
    start_1h = now + datetime.timedelta(minutes=60)
    refund, pct, reason = calculate_cancellation_refund(amount, start_1h, now)
    assert pct == 50.0
    assert refund == 100.0

    # Tier 3: 15 mins before start -> 0%
    start_soon = now + datetime.timedelta(minutes=15)
    refund, pct, reason = calculate_cancellation_refund(amount, start_soon, now)
    assert pct == 0.0
    assert refund == 0.0

def test_overstay_calculation(db_session):
    lot = db_session.query(Lot).filter(Lot.price_category == "A").first()
    start = datetime.datetime.utcnow()
    scheduled_end = start + datetime.timedelta(hours=2)

    # 40 mins overstay -> 2 started 30m blocks
    actual_end = scheduled_end + datetime.timedelta(minutes=40)
    minutes, amount = calculate_overstay_fee(db_session, lot, VehicleClass.FOUR_WHEELER, scheduled_end, actual_end)
    assert minutes == 40
    # 1 hr rate = 60. 30 min base = 30. 1.5x = 45 per block. 2 blocks = 90.
    assert amount == 90.0

def test_availability_and_concurrency_race(db_session):
    # Create small test lot with capacity 4 and quota 50% -> max 2 online bookings
    test_lot = Lot(
        agency="TEST",
        name="Small Test Lot",
        capacity_4w=4,
        bookable=True,
        bookable_quota_percent=50,
        price_category="A"
    )
    db_session.add(test_lot)
    db_session.flush()

    user = db_session.query(User).first()
    veh = db_session.query(Vehicle).first()
    now = datetime.datetime.utcnow()
    start = now + datetime.timedelta(hours=1)
    end = now + datetime.timedelta(hours=3)

    # Initial availability should be floor(4 * 0.5) = 2
    avail, total, quota = calculate_lot_availability(db_session, test_lot, VehicleClass.FOUR_WHEELER, start, end)
    assert total == 4
    assert quota == 2
    assert avail == 2

    # First booking
    ok1, _, left1 = reserve_slot_transactional(db_session, test_lot.id, VehicleClass.FOUR_WHEELER, start, end)
    assert ok1 is True
    b1 = Booking(
        booking_code="TST001",
        owner_id=user.id,
        vehicle_id=veh.id,
        plate_at_booking="MH01AA1111",
        lot_id=test_lot.id,
        start_time=start,
        end_time=end,
        amount_paid=100.0,
        status=BookingStatus.CONFIRMED
    )
    db_session.add(b1)
    db_session.flush()

    # Second booking
    ok2, _, left2 = reserve_slot_transactional(db_session, test_lot.id, VehicleClass.FOUR_WHEELER, start, end)
    assert ok2 is True
    b2 = Booking(
        booking_code="TST002",
        owner_id=user.id,
        vehicle_id=veh.id,
        plate_at_booking="MH01AA2222",
        lot_id=test_lot.id,
        start_time=start,
        end_time=end,
        amount_paid=100.0,
        status=BookingStatus.CONFIRMED
    )
    db_session.add(b2)
    db_session.flush()

    # Third booking should fail (quota exhausted)
    ok3, _, left3 = reserve_slot_transactional(db_session, test_lot.id, VehicleClass.FOUR_WHEELER, start, end)
    assert ok3 is False
    assert left3 == 0

def test_payment_idempotency(db_session):
    req_id = "uniq-client-req-998877"
    res1 = payment_service.process_payment(
        db=db_session,
        amount=150.0,
        method="UPI",
        payment_type="ADVANCE",
        client_request_id=req_id,
        simulate_status="SUCCESS"
    )
    assert res1.success is True
    first_receipt = res1.receipt_no

    # Second call with same client_request_id returns existing payment
    res2 = payment_service.process_payment(
        db=db_session,
        amount=150.0,
        method="UPI",
        payment_type="ADVANCE",
        client_request_id=req_id,
        simulate_status="SUCCESS"
    )
    assert res2.success is True
    assert res2.receipt_no == first_receipt
    assert "Idempotent" in res2.message

def test_no_show_task_penalty(db_session):
    lot = db_session.query(Lot).first()
    user = db_session.query(User).first()
    veh = db_session.query(Vehicle).first()

    # Create a booking that started 30 mins ago (past 15 min grace)
    past_start = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
    past_end = past_start + datetime.timedelta(hours=2)

    b = Booking(
        booking_code="NOSHW1",
        owner_id=user.id,
        vehicle_id=veh.id,
        plate_at_booking="MH01NS1234",
        lot_id=lot.id,
        start_time=past_start,
        end_time=past_end,
        amount_paid=100.0,
        status=BookingStatus.CONFIRMED
    )
    db_session.add(b)
    db_session.commit()

    # Run no show processor
    processed = process_no_shows(db_session)
    assert b.id in processed

    db_session.refresh(b)
    assert b.status == BookingStatus.NO_SHOW
    assert b.cancellation_refund_amount == 80.0 # 80% refunded, 20% retained
