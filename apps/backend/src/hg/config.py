"""Application settings loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised configuration. Reads from .env and the environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = Field(default="development")
    log_level: str = Field(default="info")

    # API
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    app_base_url: str = "https://app.humangrowth.app"  # base para links de invitación

    # Security
    secret_key: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 30
    jwt_refresh_ttl_days: int = 14

    # Database
    database_url: str = "postgresql+psycopg://hg:hg@postgres:5432/hg_dev"

    # Redis / Celery
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # Storage (Cloudflare R2 via S3 API)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "hg-videos"
    r2_public_base_url: str = ""

    # Email
    resend_api_key: str = ""
    email_from: str = "HumanGrowth <no-reply@humangrowth.app>"

    # Observability
    sentry_dsn: str = ""
    posthog_key: str = ""
    posthog_host: str = "https://app.posthog.com"

    # AI
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
