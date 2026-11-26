from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Molat Personal Book Library API"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    PORT: int = 7860
    HOST: str = "0.0.0.0"

    # CORS & Frontend URL
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://molat-akdey.vercel.app"
    FRONTEND_URL: str = "https://molat-akdey.vercel.app"

    # Security & Owner Authentication
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: Optional[str] = None
    JWT_SECRET: str = "molat-jwt-secret-key-change-in-production"

    # Database (PostgreSQL / Supabase)
    DATABASE_URL: Optional[str] = None

    # Cache & Timezone
    CACHE_TTL_SECONDS: int = 300
    TIMEZONE: str = "Asia/Kolkata"

    # Mailbrix Email Relay Service
    MAILBRIX_URL: Optional[str] = None
    MAILBRIX_APP_ID: Optional[str] = None
    MAILBRIX_API_KEY: Optional[str] = None
    MAILBRIX_SIGNING_SECRET: Optional[str] = None
    MAILBRIX_TIMEOUT_SECONDS: float = 10.0

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
