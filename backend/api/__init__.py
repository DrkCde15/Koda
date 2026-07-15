"""Application factory.

Centralises extension binding, blueprint registration and cross-cutting
middleware so each feature remains a thin, independently testable module.
"""
import logging
import os

from flask import Flask, send_from_directory

from config import get_config
from extensions import cors, db, jwt, migrate, redis_client
from middlewares.errors import errors_bp
from middlewares.jwt_handlers import check_if_token_revoked

# Directory holding the built frontend (frontend/dist). Overridable via env so
# the Docker image can copy the build to a well-known location.
FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    ),
)


def create_app(env: str = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(get_config(env))

    _init_extensions(app)
    _register_blueprints(app)
    _register_jwt_handlers()
    _register_spa(app)

    return app


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])

    global redis_client
    try:
        redis_client = __import__("redis").from_url(
            app.config["REDIS_URL"], decode_responses=True
        )
        redis_client.ping()
    except Exception as exc:  # pragma: no cover - depends on infra
        redis_client = None
        logging.getLogger(__name__).warning(
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

    app.register_blueprint(errors_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(workspaces_bp, url_prefix="/api/workspaces")
    app.register_blueprint(pages_bp, url_prefix="/api/pages")
    app.register_blueprint(blocks_bp, url_prefix="/api/blocks")
    app.register_blueprint(files_bp, url_prefix="/api/files")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(databases_bp, url_prefix="/api/databases")


def _register_jwt_handlers() -> None:
    # Bind the blocklist loader defined in middlewares.jwt_handlers.
    jwt.token_in_blocklist_loader(check_if_token_revoked)


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
            return {"success": False, "message": "Not found"}, 404
        if not os.path.isdir(dist):
            return (
                "Frontend build not found. Run `npm run build` in ./frontend.",
                404,
            )
        full = os.path.join(dist, path)
        if path and os.path.isfile(full):
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")
