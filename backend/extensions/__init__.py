"""Shared Flask extension instances.

These are instantiated without an app and bound to it later inside the
application factory (``create_app``). Keeping them module-level avoids
circular imports between models, schemas and the application factory.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from redis import Redis

db: SQLAlchemy = SQLAlchemy()
migrate: Migrate = Migrate()
jwt: JWTManager = JWTManager()
cors: CORS = CORS()
redis_client: Redis | None = None
