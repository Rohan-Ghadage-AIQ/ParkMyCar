from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.config import settings
from app.database import engine, Base, get_db
from app.models import Lot
from app.importers.mcgm_import import import_mcgm_data
from app.tasks.no_show_task import process_no_shows
from app.routers import auth, lots, bookings, marshal, admin, reports

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ParkMumbai - Smart Pre-booking Parking Platform for Mumbai (MCGM Open Data)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(lots.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(marshal.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    # Auto-seed if lots table is empty
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(Lot).count()
        if count == 0:
            print("[*] Empty database detected. Running initial MCGM import...")
            import_mcgm_data(settings.DATA_DIR, db)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "app": "ParkMumbai API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "attribution": "Contains data provided by Municipal Corporation of Greater Mumbai (MCGM) and Brihanmumbai Electric Supply Unit (BEST) v1.1"
    }

@app.post("/api/v1/system/trigger-no-shows")
def trigger_no_shows(db: Session = Depends(get_db)):
    processed = process_no_shows(db)
    return {"status": "SUCCESS", "processed_no_shows": processed, "count": len(processed)}
