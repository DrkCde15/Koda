"""Tests for page endpoints."""
import json
import pytest
from app import create_app
from extensions import db


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


@pytest.fixture
def workspace_id(client, auth_headers):
    """Create a workspace and return its ID."""
    response = client.post(
        "/api/workspaces",
        data=json.dumps({"name": "Test Workspace"}),
        content_type="application/json",
        headers=auth_headers,
    )
    return json.loads(response.data)["data"]["id"]


def test_create_page(client, auth_headers, workspace_id):
    """Test page creation."""
    response = client.post(
        "/api/pages",
        data=json.dumps({
            "title": "Test Page",
            "workspace_id": workspace_id,
            "content": {"html": "<p>Initial content</p>"},
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["data"]["title"] == "Test Page"


def test_list_pages(client, auth_headers, workspace_id):
    """Test listing pages in a workspace."""
    # Create a page first
    client.post(
        "/api/pages",
        data=json.dumps({
            "title": "Page 1",
            "workspace_id": workspace_id,
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    
    response = client.get(
        f"/api/pages?workspace_id={workspace_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert len(data["data"]) >= 1


def test_get_page_detail(client, auth_headers, workspace_id):
    """Test getting page details."""
    # Create page
    create_response = client.post(
        "/api/pages",
        data=json.dumps({
            "title": "Detail Test",
            "workspace_id": workspace_id,
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    page_id = json.loads(create_response.data)["data"]["id"]
    
    # Get details
    response = client.get(
        f"/api/pages/{page_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["data"]["title"] == "Detail Test"


def test_update_page(client, auth_headers, workspace_id):
    """Test updating a page."""
    # Create page
    create_response = client.post(
        "/api/pages",
        data=json.dumps({
            "title": "Original Title",
            "workspace_id": workspace_id,
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    page_id = json.loads(create_response.data)["data"]["id"]
    
    # Update
    response = client.put(
        f"/api/pages/{page_id}",
        data=json.dumps({
            "title": "Updated Title",
            "content": {"html": "<p>Updated content</p>"},
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["data"]["title"] == "Updated Title"


def test_delete_page(client, auth_headers, workspace_id):
    """Test deleting a page."""
    # Create page
    create_response = client.post(
        "/api/pages",
        data=json.dumps({
            "title": "To Delete",
            "workspace_id": workspace_id,
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    page_id = json.loads(create_response.data)["data"]["id"]
    
    # Delete
    response = client.delete(
        f"/api/pages/{page_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True


def test_page_with_blocks(client, auth_headers, workspace_id):
    """Test creating page with blocks."""
    # Create page
    page_response = client.post(
        "/api/pages",
        data=json.dumps({
            "title": "Page with Blocks",
            "workspace_id": workspace_id,
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    page_id = json.loads(page_response.data)["data"]["id"]
    
    # Add block
    block_response = client.post(
        "/api/blocks",
        data=json.dumps({
            "page_id": page_id,
            "type": "paragraph",
            "content": {"text": "This is a test block"},
            "position": 0,
        }),
        content_type="application/json",
        headers=auth_headers,
    )
    assert block_response.status_code == 201
