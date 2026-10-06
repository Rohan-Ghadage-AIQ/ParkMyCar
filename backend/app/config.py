import os
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "ParkMumbai"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "parkmumbai-super-secret-jwt-key-2026-mumbai-smart-parking"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days for prototyping ease
    
    # SQLite by default, PostgreSQL ready via DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/parkmumbai.db")
    
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    DATA_DIR: Path = BASE_DIR.parent / "data"
    
    BOOKING_GRACE_MINUTES: int = 15
    DEFAULT_QUOTA_PERCENT: int = 30
    
    class Config:
        case_sensitive = True

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
