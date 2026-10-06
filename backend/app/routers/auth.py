from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Vehicle, UserRole, VehicleClass, AuditLog
from app.schemas import OTPLoginRequest, TokenResponse, UserOut, VehicleCreate, VehicleOut
from app.auth import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login_with_otp(payload: OTPLoginRequest, db: Session = Depends(get_db)):
    phone = payload.phone.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # In mock prototype, OTP "123456" is always valid
    if payload.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP. Use mock OTP 123456")

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        # Default name based on role
        user = User(
            phone=phone,
            name=f"User {phone[-4:]}",
            role=UserRole.OWNER
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Default vehicle for convenience
        default_veh = Vehicle(
            owner_id=user.id,
            plate_number="MH02CB4567",
            vehicle_class=VehicleClass.FOUR_WHEELER
        )
        db.add(default_veh)
        db.commit()

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-login/{role}", response_model=TokenResponse)
def demo_quick_login(role: str, db: Session = Depends(get_db)):
    role_map = {
        "owner": ("9820011111", "Rahul Sharma (Car Owner)", UserRole.OWNER, "MH02CB4567"),
        "marshal": ("9820022222", "Santosh Kadam (Marshal)", UserRole.MARSHAL, "MH01AB1234"),
        "admin": ("9820033333", "Priya Desai (MCGM Admin)", UserRole.ADMIN, "MH03AZ9999"),
    }
    key = role.lower()
    if key not in role_map:
        raise HTTPException(status_code=400, detail=f"Invalid demo role '{role}'")

    phone, name, u_role, plate = role_map[key]
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(phone=phone, name=name, role=u_role)
        db.add(user)
        db.commit()
        db.refresh(user)
        veh = Vehicle(owner_id=user.id, plate_number=plate, vehicle_class=VehicleClass.FOUR_WHEELER)
        db.add(veh)
        db.commit()

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.owner_id == current_user.id).all()

@router.post("/vehicles", response_model=VehicleOut)
def add_vehicle(payload: VehicleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plate = payload.plate_number
    veh = Vehicle(
        owner_id=current_user.id,
        plate_number=plate,
        vehicle_class=payload.vehicle_class
    )
    db.add(veh)
    db.commit()
    db.refresh(veh)
    return veh
