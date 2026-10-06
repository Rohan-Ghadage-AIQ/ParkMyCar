export type UserRole = 'OWNER' | 'MARSHAL' | 'ADMIN';
export type VehicleClass = 'TWO_WHEELER' | 'FOUR_WHEELER' | 'LCV' | 'AUTO_TAXI';
export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'MISMATCH_REJECTED';
export type PaymentMethod = 'UPI' | 'CASH';
export type PaymentType = 'ADVANCE' | 'OVERSTAY' | 'WALKIN' | 'REFUND' | 'NO_SHOW_FEE' | 'VEHICLE_CHANGE_FEE';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type VerificationResult = 'MATCH' | 'MISMATCH' | 'WALKIN';
export type DisputeStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'REFUNDED';

export interface User {
  id: number;
  phone: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Vehicle {
  id: number;
  owner_id: number;
  plate_number: string;
  vehicle_class: VehicleClass;
  created_at: string;
}

export interface Lot {
  id: number;
  source: 'MCGM' | 'BEST' | 'PRIVATE' | 'DEMO';
  agency: string;
  gis_id?: string;
  ward?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  structure_type?: string;
  access_type?: string;
  operator?: string;
  sub_type?: string;
  free_parking: string;
  price_category?: string;
  capacity_2w?: number;
  capacity_4w?: number;
  capacity_lcv?: number;
  capacity_note?: string;
  open_time: string;
  close_time: string;
  facilities_cctv: boolean;
  facilities_sensors: boolean;
  facilities_toilets: boolean;
  facilities_secguard: boolean;
  handicap_reservation: boolean;
  payment_mode: string;
  status: string;
  bookable: boolean;
  bookable_quota_percent: number;
  grace_minutes: number;
  pricing_multiplier: number;
  price_override?: number;
  imported_at?: string;
  distance_km?: number;
  available_bays?: number;
  current_occupancy?: number;
  calculated_price_per_hr?: number;
}

export interface PriceRule {
  id: number;
  lot_id?: number;
  price_category?: string;
  agency: string;
  vehicle_class: VehicleClass;
  duration_band: string;
  price_inr: number;
}

export interface Booking {
  id: number;
  booking_code: string;
  owner_id: number;
  vehicle_id: number;
  vehicle_class: VehicleClass;
  plate_at_booking: string;
  lot_id: number;
  lot?: Lot;
  start_time: string;
  end_time: string;
  amount_paid: number;
  cancellation_refund_amount: number;
  status: BookingStatus;
  plate_edit_count: number;
  created_at: string;
}

export interface ParkingSession {
  id: number;
  booking_id?: number;
  lot_id: number;
  vehicle_class: VehicleClass;
  plate_actual: string;
  check_in_at: string;
  check_out_at?: string;
  photo_path?: string;
  verification_result: VerificationResult;
  marshal_id: number;
  overstay_minutes: number;
  overstay_amount: number;
  is_overstay_paid: boolean;
  booking?: Booking;
}

export interface MarshalShift {
  id: number;
  marshal_id: number;
  lot_id: number;
  started_at: string;
  ended_at?: string;
  cash_collected: number;
  cash_submitted?: number;
  discrepancy?: number;
  notes?: string;
}

export interface Dispute {
  id: number;
  booking_id: number;
  session_id?: number;
  reason: string;
  note?: string;
  photo_path?: string;
  status: DisputeStatus;
  resolved_by?: number;
  created_at: string;
  resolved_at?: string;
  booking?: Booking;
}

export interface DataReport {
  id: number;
  lot_id: number;
  user_id?: number;
  message: string;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id?: number;
  action: string;
  entity: string;
  entity_id?: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}
