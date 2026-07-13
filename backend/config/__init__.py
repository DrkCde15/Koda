"""Application settings.

Configuration is environment driven. Secrets fall back to safe development
defaults but MUST be overridden via environment variables in production.
"""
import os
from datetime import timedelta


class BaseConfig:
    """Base configuration shared by every environment."""

    SECRET_KEY = os.getenv(
        "SECRET_KEY", "dev-secret-change-me-please-override-in-prod-32"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://koda:koda@localhost:5432/koda",
    )

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY", "jwt-dev-secret-change-me-please-override-prod-32"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_ACCESS_EXP_MIN", "15")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_EXP_DAYS", "30")))
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

    BCRYPT_LOG_ROUNDS = int(os.getenv("BCRYPT_LOG_ROUNDS", "12"))


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://koda:koda@localhost:5432/koda_test",
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/1")


class ProductionConfig(BaseConfig):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str = None):
    name = name or os.getenv("FLASK_ENV", "development")
    return config_map.get(name, DevelopmentConfig)
