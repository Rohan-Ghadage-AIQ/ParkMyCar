import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text, Enum
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str):
    OWNER = "OWNER"
    MARSHAL = "MARSHAL"
    ADMIN = "ADMIN"

class VehicleClass(str):
    TWO_WHEELER = "TWO_WHEELER"
    FOUR_WHEELER = "FOUR_WHEELER"
    LCV = "LCV"
    AUTO_TAXI = "AUTO_TAXI"

class BookingStatus(str):
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    MISMATCH_REJECTED = "MISMATCH_REJECTED"

class PaymentMethod(str):
    UPI = "UPI"
    CASH = "CASH"

class PaymentType(str):
    ADVANCE = "ADVANCE"
    OVERSTAY = "OVERSTAY"
    WALKIN = "WALKIN"
    REFUND = "REFUND"
    NO_SHOW_FEE = "NO_SHOW_FEE"
    VEHICLE_CHANGE_FEE = "VEHICLE_CHANGE_FEE"

class PaymentStatus(str):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"

class VerificationResult(str):
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    WALKIN = "WALKIN"

class DisputeStatus(str):
    OPEN = "OPEN"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REFUNDED = "REFUNDED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), default=UserRole.OWNER, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="owner")
    bookings = relationship("Booking", back_populates="owner")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plate_number = Column(String(20), index=True, nullable=False) # Normalized uppercase
    vehicle_class = Column(String(30), default=VehicleClass.FOUR_WHEELER, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")


class Lot(Base):
    __tablename__ = "lots"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(20), default="MCGM", nullable=False) # MCGM, BEST, PRIVATE, DEMO
    agency = Column(String(50), nullable=False) # MCGM, BEST, PRIVATE
    gis_id = Column(String(50), index=True, nullable=True)
    ward = Column(String(20), index=True, nullable=True)
    name = Column(String(255), index=True, nullable=False)
    address = Column(Text, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    structure_type = Column(String(100), nullable=True) # Surface, Multi-Level, Underground
    access_type = Column(String(100), nullable=True) # Public, Designated
    operator = Column(String(100), nullable=True)
    sub_type = Column(String(50), nullable=True) # Depot, Terminal, etc.
    free_parking = Column(String(5), default="N") # Y / N
    price_category = Column(String(20), nullable=True) # A, B, C, BEST_FIXED
    
    capacity_2w = Column(Integer, nullable=True)
    capacity_4w = Column(Integer, nullable=True)
    capacity_lcv = Column(Integer, nullable=True)
    capacity_note = Column(String(255), nullable=True)
    
    open_time = Column(String(10), default="00:00")
    close_time = Column(String(10), default="23:59")
    day_night_hours = Column(String(100), nullable=True)
    
    facilities_cctv = Column(Boolean, default=False)
    facilities_sensors = Column(Boolean, default=False)
    facilities_toilets = Column(Boolean, default=False)
    facilities_secguard = Column(Boolean, default=False)
    handicap_reservation = Column(Boolean, default=False)
    
    payment_mode = Column(String(100), default="Digital + Cash")
    status = Column(String(50), default="Operational")
    
    bookable = Column(Boolean, default=True)
    bookable_quota_percent = Column(Integer, default=30)
    grace_minutes = Column(Integer, default=15)
    pricing_multiplier = Column(Float, default=1.0)
    price_override = Column(Float, nullable=True)
    
    raw_source = Column(JSON, nullable=True)
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)

    bookings = relationship("Booking", back_populates="lot")
    sessions = relationship("ParkingSession", back_populates="lot")
    price_rules = relationship("PriceRule", back_populates="lot")


class PriceRule(Base):
    __tablename__ = "price_rules"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=True)
    price_category = Column(String(20), nullable=True) # A, B, C, BEST_FIXED
    agency = Column(String(50), nullable=False) # MCGM, BEST, PRIVATE
    vehicle_class = Column(String(30), nullable=False)
    duration_band = Column(String(50), nullable=False) # Upto 1 hr, 1-3 hrs, 3-6 hrs, 6-12 hrs
    price_inr = Column(Float, nullable=False)

    lot = relationship("Lot", back_populates="price_rules")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(6), unique=True, index=True, nullable=False) # 6 chars alphanumeric
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    vehicle_class = Column(String(30), default=VehicleClass.FOUR_WHEELER, nullable=False)
    plate_at_booking = Column(String(20), nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    amount_paid = Column(Float, nullable=False)
    cancellation_refund_amount = Column(Float, default=0.0)
    
    status = Column(String(30), default=BookingStatus.CONFIRMED, index=True)
    plate_edit_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="bookings")
    vehicle = relationship("Vehicle", back_populates="bookings")
    lot = relationship("Lot", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking")
    session = relationship("ParkingSession", back_populates="booking", uselist=False)
    disputes = relationship("Dispute", back_populates="booking")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    amount = Column(Float, nullable=False)
    method = Column(String(20), default=PaymentMethod.UPI, nullable=False) # UPI, CASH
    type = Column(String(30), default=PaymentType.ADVANCE, nullable=False) # ADVANCE, OVERSTAY, WALKIN, REFUND, NO_SHOW_FEE, VEHICLE_CHANGE_FEE
    status = Column(String(20), default=PaymentStatus.SUCCESS, nullable=False)
    collected_by_marshal_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    receipt_no = Column(String(50), unique=True, nullable=False)
    client_request_id = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    booking = relationship("Booking", back_populates="payments")
    collected_by = relationship("User", foreign_keys=[collected_by_marshal_id])


class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    vehicle_class = Column(String(30), default=VehicleClass.FOUR_WHEELER, nullable=False)
    plate_actual = Column(String(20), nullable=False)
    check_in_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    check_out_at = Column(DateTime, nullable=True)
    photo_path = Column(String(255), nullable=True)
    verification_result = Column(String(20), default=VerificationResult.MATCH, nullable=False)
    marshal_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    overstay_minutes = Column(Integer, default=0)
    overstay_amount = Column(Float, default=0.0)
    is_overstay_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    booking = relationship("Booking", back_populates="session")
    lot = relationship("Lot", back_populates="sessions")
    marshal = relationship("User", foreign_keys=[marshal_id])


class MarshalShift(Base):
    __tablename__ = "marshal_shifts"

    id = Column(Integer, primary_key=True, index=True)
    marshal_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    cash_collected = Column(Float, default=0.0)
    cash_submitted = Column(Float, nullable=True)
    discrepancy = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    marshal = relationship("User", foreign_keys=[marshal_id])
    lot = relationship("Lot")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("parking_sessions.id"), nullable=True)
    reason = Column(String(100), nullable=False)
    note = Column(Text, nullable=True)
    photo_path = Column(String(255), nullable=True)
    status = Column(String(20), default=DisputeStatus.OPEN, nullable=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="disputes")
    session = relationship("ParkingSession")
    resolver = relationship("User", foreign_keys=[resolved_by])


class DataReport(Base):
    __tablename__ = "data_reports"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="OPEN") # OPEN, RESOLVED, DISMISSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lot = relationship("Lot")
    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False) # e.g. STATUS_CHANGE, PAYMENT, MISMATCH, OVERRIDE, IMPORT
    entity = Column(String(50), nullable=False) # e.g. Booking, Lot, Payment, Shift
    entity_id = Column(String(50), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    actor = relationship("User")
