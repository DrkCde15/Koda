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
from sqlalchemy import event
from sqlalchemy.engine import Engine

db: SQLAlchemy = SQLAlchemy()
migrate: Migrate = Migrate()
jwt: JWTManager = JWTManager()
cors: CORS = CORS()
redis_client: Redis | None = None


@event.listens_for(Engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """Enable WAL + busy timeout on SQLite connections.

    WAL lets readers run while a writer commits (no whole-database lock), and
    busy_timeout makes concurrent writers wait instead of failing with
    "database is locked". Only applies to SQLite drivers (guarded by module
    name) so PostgreSQL engines are untouched.
    """
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
