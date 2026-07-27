"""Tests for authentication endpoints."""
import pytest
from flask import json
from app import create_app
from extensions import db
from models.user import User


@pytest.fixture
def app():
    """Create test app with test database."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def user_data():
    """Sample user data."""
    return {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "full_name": "Test User",
    }


def test_register_success(client, user_data):
    """Test successful user registration."""
    response = client.post(
        "/api/auth/register",
        data=json.dumps(user_data),
        content_type="application/json",
    )
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data["success"] is True
    assert "user" in data["data"]


def test_register_duplicate_email(client, user_data):
    """Test registration with duplicate email."""
    # First registration
    client.post(
        "/api/auth/register",
        data=json.dumps(user_data),
        content_type="application/json",
    )
    # Second registration with same email
    response = client.post(
        "/api/auth/register",
        data=json.dumps(user_data),
        content_type="application/json",
    )
    assert response.status_code == 422


def test_login_success(client, user_data):
    """Test successful login."""
    # Register user first
    client.post(
        "/api/auth/register",
        data=json.dumps(user_data),
        content_type="application/json",
    )
    # Login
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": user_data["email"],
            "password": user_data["password"],
        }),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]


def test_login_invalid_credentials(client, user_data):
    """Test login with invalid credentials."""
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "nonexistent@example.com",
            "password": "wrongpassword",
        }),
        content_type="application/json",
    )
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data["success"] is False


def test_protected_endpoint_without_token(client):
    """Test accessing protected endpoint without token."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_protected_endpoint_with_token(client, user_data):
    """Test accessing protected endpoint with valid token."""
    # Register and login
    client.post(
        "/api/auth/register",
        data=json.dumps(user_data),
        content_type="application/json",
    )
    login_response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": user_data["email"],
            "password": user_data["password"],
        }),
        content_type="application/json",
    )
    tokens = json.loads(login_response.data)["data"]
    
    # Access protected endpoint
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "status" in data
    assert "services" in data
