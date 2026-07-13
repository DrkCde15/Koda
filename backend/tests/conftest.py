"""Shared pytest fixtures.

Uses an in-memory SQLite database and disables Redis so the suite runs
without external services. Set environment before importing the app so the
configuration picks up the ephemeral database.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-please-override-32")
os.environ.setdefault("SECRET_KEY", "test-secret-key-please-override-32")

import pytest

from api import create_app
from extensions import db
import extensions


@pytest.fixture
def app():
    application = create_app("development")
    extensions.redis_client = None
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    payload = {"email": "dev@koda.app", "full_name": "Dev User", "password": "password123"}
    resp = client.post("/api/auth/register", json=payload)
    token = resp.get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
