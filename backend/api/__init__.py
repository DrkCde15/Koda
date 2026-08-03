"""Application factory.

Centralises extension binding, blueprint registration and cross-cutting
middleware so each feature remains a thin, independently testable module.
"""
import logging
import os
from datetime import datetime

from flask import Flask, send_from_directory, jsonify, request
from werkzeug.exceptions import HTTPException

from config import get_config
from config.logging_config import configure_logging, get_logger
import extensions
from extensions import cors, db, jwt, migrate, redis_client
from middlewares.errors import errors_bp
from middlewares.jwt_handlers import check_if_token_revoked
from middlewares.rate_limiter import init_rate_limiter

# Directory holding the built frontend (frontend/dist). Overridable via env so
# the Docker image can copy the build to a well-known location.
FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    ),
)

# Module logger
logger = get_logger(__name__)


def create_app(env: str = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(get_config(env))

    # Configure structured logging first
    configure_logging(app)

    _init_extensions(app)
    _init_rate_limiter(app)
    _register_blueprints(app)
    _register_jwt_handlers()
    _register_spa(app)
    _register_error_handlers(app)
    _register_health_check(app)
    _register_request_hooks(app)

    logger.info(
        f"Application created | Environment: {env or 'development'} | "
        f"Database: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[0]} | "
        f"Redis: {'connected' if redis_client else 'unavailable'}"
    )

    return app


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])

    try:
        conn = __import__("redis").from_url(
            app.config["REDIS_URL"], decode_responses=True
        )
        conn.ping()
        extensions.redis_client = conn
        redis_client = conn
        logger.info("Redis connected successfully")
    except Exception as exc:  # pragma: no cover - depends on infra
        extensions.redis_client = None
        redis_client = None
        logger.warning(
            "Redis indisponível (%s). Rodando em modo degradado: revogação de "
            "token (logout) e reset de senha ficam desabilitados.",
            exc,
        )


def _register_blueprints(app: Flask) -> None:
    from api.auth.auth import auth_bp
    from api.users.users import users_bp
    from api.workspaces.workspaces import workspaces_bp
    from api.pages.pages import pages_bp
    from api.blocks.blocks import blocks_bp
    from api.files.files import files_bp
    from api.search.search import search_bp
    from api.databases.databases import databases_bp
    from api.comments.comments import comments_bp
    from api.activity.activity import activity_bp
    from api.notifications.notifications import notifications_bp
    from api.docs import register_docs

    app.register_blueprint(errors_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(workspaces_bp, url_prefix="/api/workspaces")
    app.register_blueprint(pages_bp, url_prefix="/api/pages")
    app.register_blueprint(blocks_bp, url_prefix="/api/blocks")
    app.register_blueprint(files_bp, url_prefix="/api/files")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(databases_bp, url_prefix="/api/databases")
    app.register_blueprint(comments_bp, url_prefix="/api")
    app.register_blueprint(activity_bp, url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api")
    
    # Register API documentation
    register_docs(app)
    logger.info("API documentation registered at /api/docs")


def _register_jwt_handlers() -> None:
    # Bind the blocklist loader defined in middlewares.jwt_handlers.
    jwt.token_in_blocklist_loader(check_if_token_revoked)


def _init_rate_limiter(app: Flask) -> None:
    """Initialize rate limiter if Flask-Limiter is available."""
    try:
        init_rate_limiter(app)
        logger.info("Rate limiter initialized")
    except ImportError:
        logger.warning("Flask-Limiter not installed. Rate limiting disabled.")


def _register_error_handlers(app: Flask) -> None:
    """Register global error handlers."""

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Handle HTTP exceptions with standardized response."""
        logger.warning(f"HTTP {e.code}: {e.description} | Path: {request.path}")
        return jsonify({
            "success": False,
            "message": e.description,
            "errors": []
        }), e.code

    @app.errorhandler(429)
    def handle_rate_limit(e):
        """Handle rate limit errors."""
        logger.warning(f"Rate limit exceeded | IP: {request.remote_addr} | Path: {request.path}")
        return jsonify({
            "success": False,
            "message": "Too many requests. Please try again later.",
            "errors": [str(e.description)]
        }), 429

    @app.errorhandler(500)
    def handle_internal_error(e):
        """Handle internal server errors."""
        logger.error(f"Internal server error: {str(e)} | Path: {request.path}", exc_info=True)
        return jsonify({
            "success": False,
            "message": "Internal server error",
            "errors": []
        }), 500


def _register_health_check(app: Flask) -> None:
    """Register health check endpoint."""

    @app.route("/health")
    def health_check():
        """Health check endpoint for monitoring."""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "unknown",
                "redis": "unavailable"
            }
        }

        # Check database
        try:
            db.session.execute(db.text("SELECT 1"))
            health_status["services"]["database"] = "connected"
        except Exception as e:
            health_status["services"]["database"] = "error"
            health_status["status"] = "degraded"

        # Check Redis
        if redis_client:
            try:
                redis_client.ping()
                health_status["services"]["redis"] = "connected"
            except Exception:
                health_status["services"]["redis"] = "error"
                health_status["status"] = "degraded"
        else:
            health_status["services"]["redis"] = "disabled"

        return jsonify(health_status), 200 if health_status["status"] == "healthy" else 503


def _register_request_hooks(app: Flask) -> None:
    """Register request/response hooks."""

    @app.before_request
    def before_request():
        """Add request ID and start time for request tracing."""
        import uuid
        request.request_id = str(uuid.uuid4())
        request.start_time = datetime.utcnow()

    @app.after_request
    def after_request(response):
        """Log request details and add correlation headers."""
        if hasattr(request, 'start_time'):
            duration = (datetime.utcnow() - request.start_time).total_seconds() * 1000
            logger.info(
                f"Request completed | "
                f"Method: {request.method} | "
                f"Path: {request.path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration:.2f}ms | "
                f"RequestID: {getattr(request, 'request_id', 'unknown')}"
            )

        # Add request ID to response headers
        if hasattr(request, 'request_id'):
            response.headers["X-Request-ID"] = request.request_id

        return response


def _register_spa(app: Flask) -> None:
    """Serve the built single-page app so the backend can run standalone.

    API and error routes are registered first, so this catch-all only handles
    non-``/api`` paths: it returns the requested static asset when it exists and
    falls back to ``index.html`` for client-side routes.
    """
    dist = FRONTEND_DIST

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path: str):
        if path.startswith("api/"):
            return jsonify({"success": False, "message": "Not found"}), 404
        if not os.path.isdir(dist):
            logger.error("Frontend build directory not found", extra={"path": dist})
            return (
                "Frontend build not found. Run `npm run build` in ./frontend.",
                404,
            )
        full = os.path.join(dist, path)
        if path and os.path.isfile(full):
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")
