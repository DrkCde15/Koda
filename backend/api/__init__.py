"""Application factory.

Centralises extension binding, blueprint registration and cross-cutting
middleware so each feature remains a thin, independently testable module.
"""
import logging

from flask import Flask

from config import get_config
from extensions import cors, db, jwt, migrate, redis_client
from middlewares.errors import errors_bp
from middlewares.jwt_handlers import check_if_token_revoked


def create_app(env: str = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config(env))

    _init_extensions(app)
    _register_blueprints(app)
    _register_jwt_handlers()

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

    app.register_blueprint(errors_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(workspaces_bp, url_prefix="/api/workspaces")
    app.register_blueprint(pages_bp, url_prefix="/api/pages")
    app.register_blueprint(blocks_bp, url_prefix="/api/blocks")
    app.register_blueprint(files_bp, url_prefix="/api/files")
    app.register_blueprint(search_bp, url_prefix="/api/search")


def _register_jwt_handlers() -> None:
    # Bind the blocklist loader defined in middlewares.jwt_handlers.
    jwt.token_in_blocklist_loader(check_if_token_revoked)
