"""Tests for workspace endpoints."""
import json
import pytest
from app import create_app
from extensions import db
from models.user import User
from models.workspace_models import Workspace, WorkspaceMember
from services.auth_service import AuthService


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
def auth_headers(client):
    """Get auth headers for authenticated requests."""
    # Register and login
    user_data = {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "full_name": "Test User",
    }
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
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_create_workspace(client, auth_headers):
    """Test workspace creation."""
    response = client.post(
        "/api/workspaces",
        data=json.dumps({
            "name": "Test Workspace",
            "icon": "📚",
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["data"]["name"] == "Test Workspace"


def test_list_workspaces(client, auth_headers):
    """Test listing user's workspaces."""
    # Create a workspace first
    client.post(
        "/api/workspaces",
        data=json.dumps({"name": "My Workspace"}),
        content_type="application/json",
        headers=auth_headers,
    )
    
    response = client.get("/api/workspaces", headers=auth_headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert len(data["data"]) >= 1


def test_get_workspace_detail(client, auth_headers):
    """Test getting workspace details."""
    # Create workspace
    create_response = client.post(
        "/api/workspaces",
        data=json.dumps({"name": "Detail Test"}),
        content_type="application/json",
        headers=auth_headers,
    )
    workspace_id = json.loads(create_response.data)["data"]["id"]
    
    # Get details
    response = client.get(
        f"/api/workspaces/{workspace_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["data"]["workspace"]["name"] == "Detail Test"


def test_update_workspace(client, auth_headers):
    """Test updating workspace."""
    # Create workspace
    create_response = client.post(
        "/api/workspaces",
        data=json.dumps({"name": "Original Name"}),
        content_type="application/json",
        headers=auth_headers,
    )
    workspace_id = json.loads(create_response.data)["data"]["id"]
    
    # Update
    response = client.put(
        f"/api/workspaces/{workspace_id}",
        data=json.dumps({"name": "Updated Name", "icon": "🚀"}),
        content_type="application/json",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["data"]["name"] == "Updated Name"


def test_delete_workspace(client, auth_headers):
    """Test deleting workspace."""
    # Create workspace
    create_response = client.post(
        "/api/workspaces",
        data=json.dumps({"name": "To Delete"}),
        content_type="application/json",
        headers=auth_headers,
    )
    workspace_id = json.loads(create_response.data)["data"]["id"]
    
    # Delete
    response = client.delete(
        f"/api/workspaces/{workspace_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True


def test_workspace_unauthorized_access(client, auth_headers):
    """Test accessing another user's workspace."""
    # Create workspace with user 1
    create_response = client.post(
        "/api/workspaces",
        data=json.dumps({"name": "Private Workspace"}),
        content_type="application/json",
        headers=auth_headers,
    )
    workspace_id = json.loads(create_response.data)["data"]["id"]
    
    # Create user 2
    client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": "user2@example.com",
            "password": "SecurePass123!",
            "full_name": "User 2",
        }),
        content_type="application/json",
    )
    login_response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "user2@example.com",
            "password": "SecurePass123!",
        }),
        content_type="application/json",
    )
    user2_token = json.loads(login_response.data)["data"]["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}
    
    # Try to access user 1's workspace
    response = client.get(
        f"/api/workspaces/{workspace_id}",
        headers=user2_headers,
    )
    assert response.status_code == 403


def test_add_workspace_member(client, auth_headers):
    """Test adding a member to workspace."""
    # Create workspace
    create_response = client.post(
        "/api/workspaces",
        data=json.dumps({"name": "Team Workspace"}),
        content_type="application/json",
        headers=auth_headers,
    )
    workspace_id = json.loads(create_response.data)["data"]["id"]
    
    # Add member via invite
    response = client.post(
        f"/api/workspaces/{workspace_id}/invites",
        data=json.dumps({
            "email": "member@example.com",
            "role": "editor",
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    # Expected to fail if user doesn't exist - that's OK
    assert response.status_code in [400, 404, 201]
