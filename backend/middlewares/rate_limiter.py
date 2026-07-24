"""Rate limiting middleware using Flask-Limiter.

Provides DDoS protection and API abuse prevention with Redis-backed storage.
"""
from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from extensions import redis_client


def create_limiter(app: Flask) -> Limiter:
    """Initialize and configure rate limiter.
    
    Uses Redis for distributed rate limiting in production.
    Falls back to in-memory storage in development if Redis is unavailable.
    """
    # Storage backend
    if redis_client:
        storage_uri = app.config.get("RATELIMIT_STORAGE_URL", "redis://localhost:6379/1")
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
        default_limits=[app.config.get("RATELIMIT_DEFAULT", "100 per hour")],
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

    # Apply specific limits to sensitive endpoints
    # These will be imported and used in the route definitions
    
    return limiter


# Decorators for common rate limit rules
def rate_limit_login():
    """Rate limit for login attempts: 5 per minute."""
    from flask_limiter import Limiter
    return "5 per minute"


def rate_limit_register():
    """Rate limit for registration: 3 per hour."""
    return "3 per hour"


def rate_limit_password_reset():
    """Rate limit for password reset requests: 3 per hour."""
    return "3 per hour"


def rate_limit_api():
    """General API rate limit: 100 per hour."""
    return "100 per hour"
