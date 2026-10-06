from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
import re

class UserBase(BaseModel):
    phone: str
    name: str
    role: str = "OWNER"

class UserCreate(UserBase):
    pass

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class OTPLoginRequest(BaseModel):
    phone: str
    otp: str = "123456"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class VehicleCreate(BaseModel):
    plate_number: str
    vehicle_class: str = "FOUR_WHEELER"

    @field_validator("plate_number")
    def validate_plate(cls, v: str) -> str:
        cleaned = re.sub(r'[^A-Za-z0-9]', '', v).upper()
        if len(cleaned) < 4:
            raise ValueError("License plate must have at least 4 alphanumeric characters")
        return cleaned

class VehicleOut(BaseModel):
    id: int
    owner_id: int
    plate_number: str
    vehicle_class: str
    created_at: datetime
    class Config:
        from_attributes = True

class PriceRuleOut(BaseModel):
    id: int
    lot_id: Optional[int] = None
    price_category: Optional[str] = None
    agency: str
    vehicle_class: str
    duration_band: str
    price_inr: float
    class Config:
        from_attributes = True

class LotBase(BaseModel):
    source: str = "MCGM"
    agency: str = "MCGM"
    gis_id: Optional[str] = None
    ward: Optional[str] = None
    name: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    structure_type: Optional[str] = None
    access_type: Optional[str] = None
    operator: Optional[str] = None
    sub_type: Optional[str] = None
    free_parking: str = "N"
    price_category: Optional[str] = None
    capacity_2w: Optional[int] = None
    capacity_4w: Optional[int] = None
    capacity_lcv: Optional[int] = None
    capacity_note: Optional[str] = None
    open_time: str = "00:00"
    close_time: str = "23:59"
    day_night_hours: Optional[str] = None
    facilities_cctv: bool = False
    facilities_sensors: bool = False
    facilities_toilets: bool = False
    facilities_secguard: bool = False
    handicap_reservation: bool = False
    payment_mode: str = "Digital + Cash"
    status: str = "Operational"
    bookable: bool = True
    bookable_quota_percent: int = 30
    grace_minutes: int = 15
    pricing_multiplier: float = 1.0
    price_override: Optional[float] = None

class LotOut(LotBase):
    id: int
    imported_at: Optional[datetime] = None
    distance_km: Optional[float] = None
    current_occupancy: Optional[int] = 0
    available_bays: Optional[int] = 0
    calculated_price_per_hr: Optional[float] = None
    class Config:
        from_attributes = True

class LotUpdateAdmin(BaseModel):
    name: Optional[str] = None
    bookable: Optional[bool] = None
    bookable_quota_percent: Optional[int] = None
    capacity_2w: Optional[int] = None
    capacity_4w: Optional[int] = None
    capacity_lcv: Optional[int] = None
    capacity_note: Optional[str] = None
    price_override: Optional[float] = None
    pricing_multiplier: Optional[float] = None
    status: Optional[str] = None

# Pricing & Availability Request
class PriceEstimateRequest(BaseModel):
    lot_id: int
    vehicle_class: str = "FOUR_WHEELER"
    start_time: datetime
    end_time: datetime

class PriceEstimateResponse(BaseModel):
    lot_id: int
    vehicle_class: str
    duration_hours: float
    duration_band: str
    base_price: float
    multiplier: float
    total_price: float
    is_free: bool
    free_badge_note: Optional[str] = None
    available_bays: int
    total_capacity: int
    quota_capacity: int

# Booking
class BookingCreateRequest(BaseModel):
    lot_id: int
    vehicle_id: int
    start_time: datetime
    end_time: datetime
    client_request_id: str

class BookingOut(BaseModel):
    id: int
    booking_code: str
    owner_id: int
    vehicle_id: int
    vehicle_class: str
    plate_at_booking: str
    lot_id: int
    lot: Optional[LotOut] = None
    start_time: datetime
    end_time: datetime
    amount_paid: float
    cancellation_refund_amount: float = 0.0
    status: str
    plate_edit_count: int
    created_at: datetime
    class Config:
        from_attributes = True

class UpdatePlateRequest(BaseModel):
    new_plate: str

# Payments
class MockPaymentRequest(BaseModel):
    booking_id: Optional[int] = None
    amount: float
    method: str = "UPI" # UPI or CASH
    type: str = "ADVANCE" # ADVANCE, OVERSTAY, WALKIN, VEHICLE_CHANGE_FEE
    client_request_id: str
    simulate_status: str = "SUCCESS" # SUCCESS, FAILED, PENDING

class PaymentOut(BaseModel):
    id: int
    booking_id: Optional[int]
    amount: float
    method: str
    type: str
    status: str
    receipt_no: str
    client_request_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Verification & Marshal
class VerificationScanResponse(BaseModel):
    booking: Optional[BookingOut] = None
    is_valid_time_window: bool
    time_window_message: str
    already_checked_in: bool
    wrong_lot: bool
    expected_plate: str
    vehicle_class: str
    payment_status: str

class CheckInRequest(BaseModel):
    booking_code: str
    plate_actual: str
    verification_result: str # MATCH, MISMATCH
    mismatch_action: Optional[str] = None # REJECT, ALLOW_WITH_FEE, ESCALATE
    mismatch_reason: Optional[str] = None
    mismatch_note: Optional[str] = None
    client_request_id: str

class WalkInRequest(BaseModel):
    lot_id: int
    plate_number: str
    vehicle_class: str = "FOUR_WHEELER"
    duration_hours: int = 2
    payment_method: str = "CASH" # CASH or UPI
    client_request_id: str

class CheckOutEstimateResponse(BaseModel):
    session_id: int
    booking_id: Optional[int]
    plate_actual: str
    check_in_at: datetime
    check_out_at: datetime
    expected_end_at: Optional[datetime]
    overstay_minutes: int
    overstay_amount: float
    is_overstay_paid: bool

class CheckOutRequest(BaseModel):
    session_id: int
    payment_method: Optional[str] = "CASH" # CASH or UPI for overstay
    client_request_id: str

class ShiftStartRequest(BaseModel):
    lot_id: int

class ShiftEndRequest(BaseModel):
    shift_id: int
    cash_submitted: float
    notes: Optional[str] = None

class ShiftOut(BaseModel):
    id: int
    marshal_id: int
    lot_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    cash_collected: float
    cash_submitted: Optional[float]
    discrepancy: Optional[float]
    notes: Optional[str]
    class Config:
        from_attributes = True

class DisputeOut(BaseModel):
    id: int
    booking_id: int
    session_id: Optional[int]
    reason: str
    note: Optional[str]
    photo_path: Optional[str]
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    booking: Optional[BookingOut] = None
    class Config:
        from_attributes = True

class DisputeResolveRequest(BaseModel):
    status: str # APPROVED, REJECTED, REFUNDED
    note: Optional[str] = None

class DataReportCreate(BaseModel):
    lot_id: int
    message: str

class DataReportOut(BaseModel):
    id: int
    lot_id: int
    user_id: Optional[int]
    message: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int]
    action: str
    entity: str
    entity_id: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime
    class Config:
        from_attributes = True
