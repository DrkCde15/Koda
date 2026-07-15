"""Application settings.

Configuration is environment driven. Secrets fall back to safe development
defaults but MUST be overridden via environment variables in production.
"""
import os
from datetime import timedelta

# Absolute path to the backend directory so SQLite falls back to a stable file
# regardless of the current working directory.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DEFAULT_SQLITE = "sqlite:///" + os.path.join(_BACKEND_DIR, "koda.db")


class BaseConfig:
    """Base configuration shared by every environment."""

    SECRET_KEY = os.getenv(
        "SECRET_KEY", "dev-secret-change-me-please-override-in-prod-32"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Defaults to a local SQLite file so the backend runs standalone without a
    # separate PostgreSQL server. Set DATABASE_URL (e.g. via Docker) to use
    # PostgreSQL in production.
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", _DEFAULT_SQLITE)

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY", "jwt-dev-secret-change-me-please-override-prod-32"
    )
    # Signs password-reset tokens. Defaults to JWT_SECRET_KEY when unset.
    RESET_TOKEN_SECRET = os.getenv("RESET_TOKEN_SECRET")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_ACCESS_EXP_MIN", "15")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_EXP_DAYS", "30")))
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Transactional email via a Google Apps Script web app that sends mail
    # using GmailApp. When GOOGLE_SCRIPT_URL is unset, email sending is
    # skipped (degraded mode) so the app still works without email.
    GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
    GOOGLE_SCRIPT_SECRET = os.getenv("GOOGLE_SCRIPT_SECRET")
    EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER")
    MAIL_FROM = os.getenv("EMAIL_REMETENTE", "no-reply@koda.app")
    MAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Koda")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost")

    # Absolute so uploads land in a stable location and Flask's send_file
    # (which resolves relative paths against app.root_path) reads them back.
    UPLOAD_FOLDER = os.path.abspath(
        os.getenv("UPLOAD_FOLDER") or os.path.join(_BACKEND_DIR, "uploads")
    )
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
