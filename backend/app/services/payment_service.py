import uuid
import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Payment, PaymentMethod, PaymentType, PaymentStatus, AuditLog

class PaymentResult:
    def __init__(self, success: bool, payment_id: Optional[int], receipt_no: Optional[str], status: str, message: str):
        self.success = success
        self.payment_id = payment_id
        self.receipt_no = receipt_no
        self.status = status
        self.message = message

class IPaymentGateway:
    def process_payment(
        self,
        db: Session,
        amount: float,
        method: str,
        payment_type: str,
        client_request_id: str,
        booking_id: Optional[int] = None,
        collected_by_marshal_id: Optional[int] = None,
        simulate_status: str = "SUCCESS"
    ) -> PaymentResult:
        raise NotImplementedError

class MockPaymentService(IPaymentGateway):
    """
    Mock payment service for development & demo.
    All payments clearly labelled 'MOCK'.
    """
    def process_payment(
        self,
        db: Session,
        amount: float,
        method: str,
        payment_type: str,
        client_request_id: str,
        booking_id: Optional[int] = None,
        collected_by_marshal_id: Optional[int] = None,
        simulate_status: str = "SUCCESS"
    ) -> PaymentResult:
        # Check idempotency
        existing = db.query(Payment).filter(Payment.client_request_id == client_request_id).first()
        if existing:
            return PaymentResult(
                success=(existing.status == PaymentStatus.SUCCESS),
                payment_id=existing.id,
                receipt_no=existing.receipt_no,
                status=existing.status,
                message="Idempotent: Payment already processed"
            )

        # Generate receipt
        timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
        short_id = uuid.uuid4().hex[:6].upper()
        receipt_no = f"MOCK-RCP-{timestamp_str}-{short_id}"

        status = simulate_status.upper()
        if status not in [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.PENDING]:
            status = PaymentStatus.SUCCESS

        payment = Payment(
            booking_id=booking_id,
            amount=amount,
            method=method.upper(),
            type=payment_type.upper(),
            status=status,
            collected_by_marshal_id=collected_by_marshal_id,
            receipt_no=receipt_no,
            client_request_id=client_request_id,
        )
        db.add(payment)
        db.flush()

        # Audit log
        audit = AuditLog(
            actor_id=collected_by_marshal_id,
            action="PAYMENT_PROCESSED",
            entity="Payment",
            entity_id=str(payment.id),
            metadata_json={
                "amount": amount,
                "method": method,
                "type": payment_type,
                "status": status,
                "receipt_no": receipt_no,
                "client_request_id": client_request_id,
                "is_mock": True
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(payment)

        return PaymentResult(
            success=(status == PaymentStatus.SUCCESS),
            payment_id=payment.id,
            receipt_no=payment.receipt_no,
            status=status,
            message="Payment completed successfully [MOCK]" if status == PaymentStatus.SUCCESS else f"Payment {status.lower()}"
        )

# Global default payment service
payment_service = MockPaymentService()
