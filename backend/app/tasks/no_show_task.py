import datetime
from sqlalchemy.orm import Session
from app.models import Booking, BookingStatus, Payment, PaymentType, PaymentMethod, PaymentStatus, AuditLog

def process_no_shows(db: Session) -> list[int]:
    """
    Finds bookings past their (start_time + grace_minutes) still in CONFIRMED status.
    Transitions them to NO_SHOW, keeps 20% no-show fee, mock refunds 80%.
    """
    now = datetime.datetime.utcnow()
    # We query confirmed bookings
    bookings = db.query(Booking).filter(
        Booking.status == BookingStatus.CONFIRMED,
        Booking.start_time < now
    ).all()

    processed_ids = []
    for b in bookings:
        grace = b.lot.grace_minutes if b.lot and b.lot.grace_minutes else 15
        cutoff = b.start_time + datetime.timedelta(minutes=grace)
        if now > cutoff:
            b.status = BookingStatus.NO_SHOW
            amount_paid = b.amount_paid or 0.0
            no_show_fee = round(amount_paid * 0.20, 2)
            refund_amount = round(amount_paid * 0.80, 2)
            b.cancellation_refund_amount = refund_amount

            # Record 20% No-Show Fee payment
            if no_show_fee > 0:
                fee_pmt = Payment(
                    booking_id=b.id,
                    amount=no_show_fee,
                    method=PaymentMethod.UPI,
                    type=PaymentType.NO_SHOW_FEE,
                    status=PaymentStatus.SUCCESS,
                    receipt_no=f"MOCK-FEE-{b.booking_code}",
                    client_request_id=f"fee-{b.id}-{int(now.timestamp())}"
                )
                db.add(fee_pmt)

            # Record 80% Mock Refund
            if refund_amount > 0:
                ref_pmt = Payment(
                    booking_id=b.id,
                    amount=refund_amount,
                    method=PaymentMethod.UPI,
                    type=PaymentType.REFUND,
                    status=PaymentStatus.SUCCESS,
                    receipt_no=f"MOCK-REF-{b.booking_code}",
                    client_request_id=f"refund-{b.id}-{int(now.timestamp())}"
                )
                db.add(ref_pmt)

            audit = AuditLog(
                actor_id=None,
                action="NO_SHOW_EXPIRED",
                entity="Booking",
                entity_id=str(b.id),
                metadata_json={
                    "booking_code": b.booking_code,
                    "amount_paid": amount_paid,
                    "no_show_fee": no_show_fee,
                    "refund_amount": refund_amount,
                    "grace_minutes": grace
                }
            )
            db.add(audit)
            processed_ids.append(b.id)

    if processed_ids:
        db.commit()

    return processed_ids
