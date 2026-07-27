"""Rate limiting middleware using Flask-Limiter.

Provides DDoS protection and API abuse prevention with Redis-backed storage.
"""
import os
from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import extensions


def create_limiter(app: Flask) -> Limiter:
    """Initialize and configure rate limiter.
    
    Uses Redis for distributed rate limiting in production.
    Falls back to in-memory storage in development if Redis is unavailable.
    """
    # Storage backend
    storage_uri = os.getenv("RATELIMIT_STORAGE_URI")
    if storage_uri is None:
        if extensions.redis_client:
            storage_uri = app.config.get("RATELIMIT_STORAGE_URI", "redis://localhost:6379/1")
        else:
            storage_uri = "memory://"
            app.logger.warning(
                "Redis unavailable. Using in-memory rate limiting "
                "(not suitable for multi-worker deployments)."
            )

    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        storage_uri=storage_uri,
        default_limits=[os.getenv("RATELIMIT_DEFAULT", "200 per hour")],
        strategy="fixed-window",
        headers_enabled=True,
    )

    # Custom error handler
    @limiter.request_filter
    def exempt_health_check():
        """Exempt health check endpoints from rate limiting."""
        return request.path in ["/health", "/api/health"]

    return limiter


def init_rate_limiter(app: Flask):
    """Initialize rate limiter with custom limits per endpoint."""
    limiter = create_limiter(app)

    from api.auth.auth import init_limiter as auth_init_limiter
    auth_init_limiter(app)

    return limiter


# Decorators for common rate limit rules
def rate_limit_login():
    """Rate limit for login attempts."""
    return os.getenv("RATELIMIT_LOGIN", "20 per minute")


def rate_limit_register():
    """Rate limit for registration."""
    return os.getenv("RATELIMIT_REGISTER", "10 per minute")


def rate_limit_password_reset():
    """Rate limit for password reset requests."""
    return os.getenv("RATELIMIT_PASSWORD_RESET", "5 per minute")


def rate_limit_api():
    """General API rate limit."""
    return os.getenv("RATELIMIT_DEFAULT", "200 per hour")
