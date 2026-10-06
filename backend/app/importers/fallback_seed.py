from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Lot, PriceRule, User, Vehicle, VehicleClass, UserRole

def seed_fallback_data(db: Session):
    # 6 Government DEMO lots across Mumbai
    demo_government_lots = [
        {
            "gis_id": "DEMO-BANDRA-01",
            "name": "Bandra Linking Road PPL (Demo Government Lot)",
            "ward": "H/West",
            "address": "Linking Road, Bandra West, Mumbai",
            "lat": 19.0620,
            "lng": 72.8350,
            "structure_type": "Underground",
            "capacity_2w": 200,
            "capacity_4w": 320,
            "capacity_lcv": 15,
            "price_category": "A",
        },
        {
            "gis_id": "DEMO-FORT-02",
            "name": "Hutatma Chowk Fort PPL (Demo Government Lot)",
            "ward": "A",
            "address": "Flora Fountain, Fort, Mumbai",
            "lat": 18.9322,
            "lng": 72.8335,
            "structure_type": "Underground",
            "capacity_2w": 80,
            "capacity_4w": 220,
            "capacity_lcv": 10,
            "price_category": "A",
        },
        {
            "gis_id": "DEMO-COLABA-03",
            "name": "Regal Cinema Colaba PPL (Demo Government Lot)",
            "ward": "A",
            "address": "SP Mukherjee Chowk, Colaba, Mumbai",
            "lat": 18.9248,
            "lng": 72.8315,
            "structure_type": "Multi-Level",
            "capacity_2w": 150,
            "capacity_4w": 450,
            "capacity_lcv": 20,
            "price_category": "A",
        },
        {
            "gis_id": "DEMO-ANDHERI-04",
            "name": "Lokhandwala Market PPL (Demo Government Lot)",
            "ward": "K/West",
            "address": "Lokhandwala Complex, Andheri West, Mumbai",
            "lat": 19.1430,
            "lng": 72.8275,
            "structure_type": "Multi-Level",
            "capacity_2w": 120,
            "capacity_4w": 280,
            "capacity_lcv": 10,
            "price_category": "A",
        },
        {
            "gis_id": "DEMO-LOWERPAREL-05",
            "name": "Senapati Bapat Marg PPL (Demo Government Lot)",
            "ward": "G/South",
            "address": "Lower Parel Station Road, Mumbai",
            "lat": 18.9950,
            "lng": 72.8270,
            "structure_type": "Multi-Level",
            "capacity_2w": 300,
            "capacity_4w": 850,
            "capacity_lcv": 50,
            "price_category": "A",
        },
        {
            "gis_id": "DEMO-POWAI-06",
            "name": "Hiranandani Gardens Lot (Demo Government Lot)",
            "ward": "S",
            "address": "Central Avenue, Powai, Mumbai",
            "lat": 19.1197,
            "lng": 72.9051,
            "structure_type": "Surface",
            "capacity_2w": 80,
            "capacity_4w": 160,
            "capacity_lcv": 10,
            "price_category": "B",
        },
    ]

    for d in demo_government_lots:
        lot = db.query(Lot).filter(Lot.gis_id == d["gis_id"]).first()
        if not lot:
            lot = Lot(
                source="DEMO",
                agency="MCGM",
                gis_id=d["gis_id"],
                name=d["name"],
                ward=d["ward"],
                address=d["address"],
                lat=d["lat"],
                lng=d["lng"],
                structure_type=d["structure_type"],
                access_type="Public",
                operator="MCGM Contractor",
                free_parking="N",
                price_category=d["price_category"],
                capacity_2w=d["capacity_2w"],
                capacity_4w=d["capacity_4w"],
                capacity_lcv=d["capacity_lcv"],
                facilities_cctv=True,
                facilities_sensors=True,
                facilities_toilets=True,
                facilities_secguard=True,
                payment_mode="Digital + Cash",
                status="Operational",
                bookable=True,
                bookable_quota_percent=30,
                imported_at=datetime.utcnow()
            )
            db.add(lot)
    db.commit()
