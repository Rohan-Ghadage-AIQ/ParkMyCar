import datetime
from app.models import (
    Lot, PriceRule, User, Vehicle, Booking, BookingStatus,
    ParkingSession, VerificationResult, Dispute, DisputeStatus,
    Payment, PaymentMethod, PaymentType, PaymentStatus
)

def test_marshal_checkin_match_flow(client, db_session):
    # Login as marshal
    res = client.post("/api/v1/auth/demo-login/marshal")
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    lot = db_session.query(Lot).filter(Lot.bookable == True).first()
    owner = db_session.query(User).filter(User.role == "OWNER").first()
    veh = db_session.query(Vehicle).filter(Vehicle.owner_id == owner.id).first()

    now = datetime.datetime.utcnow()
    b = Booking(
        booking_code="MATCH1",
        owner_id=owner.id,
        vehicle_id=veh.id,
        plate_at_booking="MH02CB4567",
        lot_id=lot.id,
        start_time=now - datetime.timedelta(minutes=5),
        end_time=now + datetime.timedelta(hours=2),
        amount_paid=100.0,
        status=BookingStatus.CONFIRMED
    )
    db_session.add(b)
    db_session.commit()

    # Scan lookup
    scan_res = client.get(f"/api/v1/marshal/scan/{b.booking_code}", headers=headers)
    assert scan_res.status_code == 200
    assert scan_res.json()["expected_plate"] == "MH02CB4567"
    assert scan_res.json()["is_valid_time_window"] is True

    # Check in with MATCH
    checkin_res = client.post(
        "/api/v1/marshal/check-in",
        data={
            "booking_code": b.booking_code,
            "plate_actual": "MH02CB4567",
            "verification_result": "MATCH",
            "client_request_id": "req-match-01"
        },
        headers=headers
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "SUCCESS"

    # Verify booking status changed to CHECKED_IN
    db_session.refresh(b)
    assert b.status == BookingStatus.CHECKED_IN

def test_marshal_mismatch_reject_flow(client, db_session):
    res = client.post("/api/v1/auth/demo-login/marshal")
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    lot = db_session.query(Lot).filter(Lot.bookable == True).first()
    owner = db_session.query(User).filter(User.role == "OWNER").first()
    veh = db_session.query(Vehicle).filter(Vehicle.owner_id == owner.id).first()

    now = datetime.datetime.utcnow()
    b = Booking(
        booking_code="MISMT1",
        owner_id=owner.id,
        vehicle_id=veh.id,
        plate_at_booking="MH02CB4567",
        lot_id=lot.id,
        start_time=now,
        end_time=now + datetime.timedelta(hours=2),
        amount_paid=100.0,
        status=BookingStatus.CONFIRMED
    )
    db_session.add(b)
    db_session.commit()

    # Check in with MISMATCH & REJECT
    checkin_res = client.post(
        "/api/v1/marshal/check-in",
        data={
            "booking_code": b.booking_code,
            "plate_actual": "MH04XY9999",
            "verification_result": "MISMATCH",
            "mismatch_action": "REJECT",
            "mismatch_reason": "Completely different car arrived",
            "client_request_id": "req-mismatch-reject-01"
        },
        headers=headers
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "REJECTED"

    db_session.refresh(b)
    assert b.status == BookingStatus.MISMATCH_REJECTED

    # Dispute should be opened
    dispute = db_session.query(Dispute).filter(Dispute.booking_id == b.id).first()
    assert dispute is not None
    assert dispute.status == DisputeStatus.OPEN

def test_marshal_mismatch_allow_with_fee_flow(client, db_session):
    res = client.post("/api/v1/auth/demo-login/marshal")
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    lot = db_session.query(Lot).filter(Lot.bookable == True).first()
    owner = db_session.query(User).filter(User.role == "OWNER").first()
    veh = db_session.query(Vehicle).filter(Vehicle.owner_id == owner.id).first()

    now = datetime.datetime.utcnow()
    b = Booking(
        booking_code="MISFEE",
        owner_id=owner.id,
        vehicle_id=veh.id,
        plate_at_booking="MH02CB4567",
        lot_id=lot.id,
        start_time=now,
        end_time=now + datetime.timedelta(hours=2),
        amount_paid=100.0,
        status=BookingStatus.CONFIRMED
    )
    db_session.add(b)
    db_session.commit()

    # Check in with MISMATCH & ALLOW_WITH_FEE
    checkin_res = client.post(
        "/api/v1/marshal/check-in",
        data={
            "booking_code": b.booking_code,
            "plate_actual": "MH02CB9999",
            "verification_result": "MISMATCH",
            "mismatch_action": "ALLOW_WITH_FEE",
            "mismatch_reason": "Owner brought alternate family car",
            "client_request_id": "req-mismatch-fee-01"
        },
        headers=headers
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "ALLOWED_WITH_FEE"
    assert checkin_res.json()["fee"] == 50.0

    db_session.refresh(b)
    assert b.status == BookingStatus.CHECKED_IN

    # Fee payment should be logged
    fee_pmt = db_session.query(Payment).filter(
        Payment.booking_id == b.id,
        Payment.type == PaymentType.VEHICLE_CHANGE_FEE
    ).first()
    assert fee_pmt is not None
    assert fee_pmt.amount == 50.0
