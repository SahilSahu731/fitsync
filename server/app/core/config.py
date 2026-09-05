from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FitSync API"

    app_env: Literal[
        "development",
        "test",
        "production",
    ] = "development"

    api_v1_prefix: str = "/api/v1"

    mongodb_uri: str
    mongodb_database: str = "fitsync_dev"

    cors_origins: str = "http://localhost:8081"

    jwt_secret: SecretStr
    jwt_algorithm: Literal["HS256"] = "HS256"

    jwt_issuer: str = "fitsync-api"
    jwt_audience: str = "fitsync-mobile"

    access_token_expire_minutes: int = 15

    refresh_token_expire_days: int = 30

    session_absolute_expire_days: int = 90

    otp_hmac_secret: SecretStr

    otp_expire_minutes: int = 10

    otp_max_attempts: int = 5

    otp_resend_seconds: int = 60

    resend_api_key: SecretStr

    auth_email_from: str = "FitSync <onboarding@resend.dev>"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
