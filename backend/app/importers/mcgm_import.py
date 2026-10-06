import os
import sys
import csv
import json
import argparse
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Lot, PriceRule, User, Vehicle, VehicleClass, UserRole, AuditLog

def clean_int(val) -> tuple[int | None, str | None]:
    if not val:
        return None, "Capacity not provided in dataset"
    val_str = str(val).strip()
    if val_str.upper() in ["ALLOWED", "YES", "NA", "N/A", ""]:
        return None, f"Capacity listed as '{val_str}'"
    try:
        return int(float(val_str)), None
    except ValueError:
        return None, f"Non-numeric capacity: '{val_str}'"

def clean_float(val) -> float | None:
    if not val:
        return None
    try:
        return float(str(val).strip())
    except ValueError:
        return None

def import_mcgm_data(data_dir: Path, db: Session) -> dict:
    report = {
        "mcgm_imported": 0,
        "best_imported": 0,
        "charges_imported": 0,
        "private_imported": 0,
        "warnings": [],
        "errors": []
    }

    # 1. Import Price Rules
    charges_file = data_dir / "parking_charges.csv"
    if charges_file.exists():
        with open(charges_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    price_cat = row.get("price_category", "").strip()
                    agency = row.get("agency", "").strip()
                    v_class = row.get("vehicle_class", "").strip()
                    band = row.get("duration_band", "").strip()
                    price = float(row.get("price_inr", 0))

                    existing = db.query(PriceRule).filter(
                        PriceRule.price_category == price_cat,
                        PriceRule.agency == agency,
                        PriceRule.vehicle_class == v_class,
                        PriceRule.duration_band == band,
                        PriceRule.lot_id == None
                    ).first()

                    if existing:
                        existing.price_inr = price
                    else:
                        rule = PriceRule(
                            price_category=price_cat,
                            agency=agency,
                            vehicle_class=v_class,
                            duration_band=band,
                            price_inr=price
                        )
                        db.add(rule)
                    report["charges_imported"] += 1
                except Exception as e:
                    report["errors"].append(f"Price rule error: {str(e)}")
        db.commit()

    # 2. Import MCGM Lots
    mcgm_file = data_dir / "mcgm_offstreet_lots.csv"
    if mcgm_file.exists():
        with open(mcgm_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    agency = row.get("agency", "MCGM").strip()
                    gis_id = row.get("gis_id", "").strip()
                    name = row.get("name", "").strip()
                    lat = clean_float(row.get("geo_lat"))
                    lng = clean_float(row.get("geo_long"))
                    
                    cap_2w, note_2w = clean_int(row.get("capacity_2W"))
                    cap_4w, note_4w = clean_int(row.get("capacity_4W_LMV"))
                    cap_lcv, note_lcv = clean_int(row.get("capacity_4W_LCV"))
                    
                    notes = []
                    if note_2w: notes.append(f"2W: {note_2w}")
                    if note_4w: notes.append(f"4W: {note_4w}")
                    if note_lcv: notes.append(f"LCV: {note_lcv}")
                    cap_note = "; ".join(notes) if notes else None

                    # If no valid coordinates or 4W capacity, not bookable yet
                    is_bookable = True
                    if not lat or not lng:
                        is_bookable = False
                        report["warnings"].append(f"Lot '{name}' missing coordinates -> set bookable=False")
                    if cap_4w is None and cap_2w is None:
                        is_bookable = False
                        report["warnings"].append(f"Lot '{name}' missing numeric capacity -> set bookable=False")

                    lot = db.query(Lot).filter(Lot.agency == agency, Lot.gis_id == gis_id).first()
                    if not lot:
                        lot = Lot(agency=agency, gis_id=gis_id)
                        db.add(lot)

                    lot.source = "MCGM"
                    lot.ward = row.get("ward", "").strip()
                    lot.name = name
                    lot.address = row.get("address", "").strip()
                    lot.lat = lat
                    lot.lng = lng
                    lot.structure_type = row.get("structure_type", "Surface").strip()
                    lot.access_type = row.get("access_type", "Public").strip()
                    lot.operator = row.get("operator", "MCGM").strip()
                    lot.free_parking = row.get("free_parking", "N").strip()
                    lot.price_category = row.get("price_category", "B").strip()
                    lot.capacity_2w = cap_2w
                    lot.capacity_4w = cap_4w
                    lot.capacity_lcv = cap_lcv
                    lot.capacity_note = cap_note
                    lot.open_time = row.get("start_time", "00:00").strip() or "00:00"
                    lot.close_time = row.get("end_time", "23:59").strip() or "23:59"
                    lot.facilities_cctv = row.get("facilities_CCTV", "N").strip().upper() == "Y"
                    lot.facilities_sensors = row.get("facilities_sensors", "N").strip().upper() == "Y"
                    lot.facilities_toilets = row.get("facilities_toilets", "N").strip().upper() == "Y"
                    lot.facilities_secguard = row.get("facilities_secguard", "N").strip().upper() == "Y"
                    lot.handicap_reservation = row.get("handicap_reservation", "N").strip().upper() == "Y"
                    lot.payment_mode = row.get("payment_mode", "Digital + Cash").strip()
                    lot.status = row.get("status", "Operational").strip()
                    lot.bookable = is_bookable
                    lot.bookable_quota_percent = 30
                    lot.raw_source = row
                    lot.imported_at = datetime.utcnow()

                    report["mcgm_imported"] += 1
                except Exception as e:
                    report["errors"].append(f"MCGM lot row error: {str(e)}")
        db.commit()

    # 3. Import BEST Depots and Terminals (bookable=False by default)
    best_file = data_dir / "best_depots_terminals.csv"
    if best_file.exists():
        with open(best_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    agency = row.get("agency", "BEST").strip()
                    gis_id = row.get("gis_id", "").strip()
                    name = row.get("name", "").strip()
                    lat = clean_float(row.get("geo_lat"))
                    lng = clean_float(row.get("geo_long"))
                    cap_2w, note_2w = clean_int(row.get("capacity_2W"))
                    cap_4w, note_4w = clean_int(row.get("capacity_4W_LMV"))
                    cap_lcv, note_lcv = clean_int(row.get("capacity_4W_LCV"))

                    lot = db.query(Lot).filter(Lot.agency == agency, Lot.gis_id == gis_id).first()
                    if not lot:
                        lot = Lot(agency=agency, gis_id=gis_id)
                        db.add(lot)

                    lot.source = "BEST"
                    lot.ward = row.get("ward", "").strip()
                    lot.name = name
                    lot.address = row.get("address", "").strip()
                    lot.lat = lat
                    lot.lng = lng
                    lot.structure_type = row.get("structure_type", "Depot Ground").strip()
                    lot.access_type = row.get("access_type", "Designated Parking").strip()
                    lot.operator = row.get("operator", "BEST").strip()
                    lot.sub_type = row.get("sub_type", "Depot").strip()
                    lot.free_parking = row.get("free_parking", "N").strip()
                    lot.price_category = "BEST_FIXED"
                    lot.capacity_2w = cap_2w
                    lot.capacity_4w = cap_4w
                    lot.capacity_lcv = cap_lcv
                    lot.capacity_note = "BEST Bus Depot/Terminal (Requires Admin Activation)"
                    lot.open_time = row.get("start_time", "05:00").strip() or "05:00"
                    lot.close_time = row.get("end_time", "23:00").strip() or "23:00"
                    lot.facilities_cctv = row.get("facilities_CCTV", "N").strip().upper() == "Y"
                    lot.facilities_sensors = row.get("facilities_sensors", "N").strip().upper() == "Y"
                    lot.facilities_toilets = row.get("facilities_toilets", "N").strip().upper() == "Y"
                    lot.facilities_secguard = row.get("facilities_secguard", "N").strip().upper() == "Y"
                    lot.payment_mode = row.get("payment_mode", "Cash + UPI").strip()
                    lot.status = row.get("status", "Operational").strip()
                    lot.bookable = False # Per spec: BEST depots are bookable=False by default
                    lot.bookable_quota_percent = 20
                    lot.raw_source = row
                    lot.imported_at = datetime.utcnow()

                    report["best_imported"] += 1
                except Exception as e:
                    report["errors"].append(f"BEST row error: {str(e)}")
        db.commit()

    # 4. Create Private Demo Lots (3 distinct lots)
    private_lots = [
        {
            "gis_id": "PVT-PAL-001",
            "name": "Phoenix Palladium Luxury Valet & Parking",
            "ward": "G/South",
            "address": "462 Senapati Bapat Marg, Lower Parel, Mumbai",
            "lat": 18.9965,
            "lng": 72.8245,
            "structure_type": "Multi-Level Covered",
            "capacity_2w": 200,
            "capacity_4w": 800,
            "capacity_lcv": 20,
            "price_category": "A",
            "price_override": 100.0,
            "facilities_cctv": True,
            "facilities_sensors": True,
            "facilities_toilets": True,
            "facilities_secguard": True,
            "handicap_reservation": True,
        },
        {
            "gis_id": "PVT-JWD-002",
            "name": "Jio World Drive Premium Parking BKC",
            "ward": "H/East",
            "address": "Bandra Kurla Complex, Bandra East, Mumbai",
            "lat": 19.0628,
            "lng": 72.8622,
            "structure_type": "Basement Multi-Level",
            "capacity_2w": 300,
            "capacity_4w": 1200,
            "capacity_lcv": 50,
            "price_category": "A",
            "price_override": 120.0,
            "facilities_cctv": True,
            "facilities_sensors": True,
            "facilities_toilets": True,
            "facilities_secguard": True,
            "handicap_reservation": True,
        },
        {
            "gis_id": "PVT-INOR-003",
            "name": "Inorbit Mega Mall Smart Parking Malad",
            "ward": "P/North",
            "address": "Link Road, Malad West, Mumbai",
            "lat": 19.1738,
            "lng": 72.8360,
            "structure_type": "Multi-Level",
            "capacity_2w": 250,
            "capacity_4w": 750,
            "capacity_lcv": 30,
            "price_category": "B",
            "price_override": 80.0,
            "facilities_cctv": True,
            "facilities_sensors": True,
            "facilities_toilets": True,
            "facilities_secguard": True,
            "handicap_reservation": True,
        }
    ]

    for p in private_lots:
        lot = db.query(Lot).filter(Lot.agency == "PRIVATE", Lot.gis_id == p["gis_id"]).first()
        if not lot:
            lot = Lot(agency="PRIVATE", gis_id=p["gis_id"])
            db.add(lot)
        lot.source = "PRIVATE"
        lot.ward = p["ward"]
        lot.name = p["name"]
        lot.address = p["address"]
        lot.lat = p["lat"]
        lot.lng = p["lng"]
        lot.structure_type = p["structure_type"]
        lot.access_type = "Commercial Mall"
        lot.operator = "Private Operator"
        lot.free_parking = "N"
        lot.price_category = p["price_category"]
        lot.price_override = p["price_override"]
        lot.capacity_2w = p["capacity_2w"]
        lot.capacity_4w = p["capacity_4w"]
        lot.capacity_lcv = p["capacity_lcv"]
        lot.open_time = "00:00"
        lot.close_time = "23:59"
        lot.facilities_cctv = p["facilities_cctv"]
        lot.facilities_sensors = p["facilities_sensors"]
        lot.facilities_toilets = p["facilities_toilets"]
        lot.facilities_secguard = p["facilities_secguard"]
        lot.handicap_reservation = p["handicap_reservation"]
        lot.payment_mode = "UPI + Fastag + Card"
        lot.status = "Operational"
        lot.bookable = True
        lot.bookable_quota_percent = 50
        lot.raw_source = p
        lot.imported_at = datetime.utcnow()
        report["private_imported"] += 1
    db.commit()

    # 5. Create Default Seed Users and Vehicles for instant demo testing
    seed_users = [
        {"phone": "9820011111", "name": "Rahul Sharma (Car Owner)", "role": UserRole.OWNER, "plate": "MH02CB4567"},
        {"phone": "9820022222", "name": "Santosh Kadam (Marshal)", "role": UserRole.MARSHAL, "plate": "MH01AB1234"},
        {"phone": "9820033333", "name": "Priya Desai (MCGM Admin)", "role": UserRole.ADMIN, "plate": "MH03AZ9999"},
    ]
    for u in seed_users:
        user = db.query(User).filter(User.phone == u["phone"]).first()
        if not user:
            user = User(phone=u["phone"], name=u["name"], role=u["role"])
            db.add(user)
            db.flush()
            veh = Vehicle(owner_id=user.id, plate_number=u["plate"], vehicle_class=VehicleClass.FOUR_WHEELER)
            db.add(veh)
    db.commit()

    # Record Audit Log
    audit = AuditLog(
        action="DATA_IMPORT",
        entity="System",
        entity_id="MCGM_v1.1",
        metadata_json={
            "mcgm_imported": report["mcgm_imported"],
            "best_imported": report["best_imported"],
            "charges_imported": report["charges_imported"],
            "private_imported": report["private_imported"],
            "warnings_count": len(report["warnings"]),
            "errors_count": len(report["errors"]),
        }
    )
    db.add(audit)
    db.commit()

    return report

def main():
    parser = argparse.ArgumentParser(description="Import MCGM and BEST parking data")
    parser.add_argument("--dir", type=str, default="../data", help="Directory containing CSV files")
    args = parser.parse_args()

    data_path = Path(args.dir).resolve()
    print(f"[*] Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)

    print(f"[*] Starting import from: {data_path}")
    db = SessionLocal()
    try:
        report = import_mcgm_data(data_path, db)
        print("\n--- IMPORT SUMMARY ---")
        print(f"MCGM Lots Imported:    {report['mcgm_imported']}")
        print(f"BEST Lots Imported:    {report['best_imported']}")
        print(f"Price Rules Imported:  {report['charges_imported']}")
        print(f"Private Lots Imported: {report['private_imported']}")
        print(f"Warnings:              {len(report['warnings'])}")
        print(f"Errors:                {len(report['errors'])}")
        if report['warnings']:
            print("\nSample Warnings:")
            for w in report['warnings'][:5]:
                print(f" - {w}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
