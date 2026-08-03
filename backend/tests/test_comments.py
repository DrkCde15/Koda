import pytest

from extensions import db
from models.user import User
from models.workspace_models import Workspace, WorkspaceMember


@pytest.fixture
def seeded_workspace_and_page(client, auth_headers):
    workspace_resp = client.post(
        "/api/workspaces",
        json={"name": "Comments Workspace"},
        headers=auth_headers,
    )
    workspace_id = workspace_resp.get_json()["data"]["id"]

    page_resp = client.post(
        "/api/pages",
        json={"workspace_id": workspace_id, "title": "Commentable page"},
        headers=auth_headers,
    )
    page_id = page_resp.get_json()["data"]["id"]

    second_user_payload = {
        "email": "jane@koda.app",
        "full_name": "Jane Doe",
        "password": "password123",
    }
    second_user_resp = client.post("/api/auth/register", json=second_user_payload)
    second_user_id = second_user_resp.get_json()["data"]["user"]["id"]

    with client.application.app_context():
        workspace = db.session.get(Workspace, workspace_id)
        member = WorkspaceMember(workspace_id=workspace.id, user_id=second_user_id, role="editor")
        db.session.add(member)
        db.session.commit()

    return workspace_id, page_id, second_user_id


def test_create_comment_and_notification_for_mentions(client, auth_headers, seeded_workspace_and_page):
    _, page_id, second_user_id = seeded_workspace_and_page

    response = client.post(
        f"/api/pages/{page_id}/comments",
        json={
            "body": "Olá @Jane Doe, pode revisar isso?",
            "mentions": [],
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert len(payload["data"]["comments"]) == 1
    assert payload["data"]["comments"][0]["body"] == "Olá @Jane Doe, pode revisar isso?"

    jane_login = client.post("/api/auth/login", json={"email": "jane@koda.app", "password": "password123"})
    jane_token = jane_login.get_json()["data"]["access_token"]

    notifications_resp = client.get("/api/notifications", headers={"Authorization": f"Bearer {jane_token}"})
    assert notifications_resp.status_code == 200
    notifications = notifications_resp.get_json()["data"]
    assert len(notifications) >= 1
    assert any(item["type"] == "mention" for item in notifications)


def test_notify_mentions_endpoint_creates_notification(client, auth_headers, seeded_workspace_and_page):
    _, page_id, second_user_id = seeded_workspace_and_page

    response = client.post(
        f"/api/pages/{page_id}/mentions",
        json={"mentions": ["Jane Doe"]},
        headers=auth_headers,
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    notified = payload["data"]["notified"]
    assert len(notified) == 1
    assert notified[0]["type"] == "mention"
    assert notified[0]["user_id"] == second_user_id
    assert notified[0]["entity_id"] == page_id


def test_notify_mentions_requires_mentions(client, auth_headers, seeded_workspace_and_page):
    _, page_id, _ = seeded_workspace_and_page

    response = client.post(
        f"/api/pages/{page_id}/mentions",
        json={"mentions": []},
        headers=auth_headers,
    )

    assert response.status_code == 400


def test_notify_mentions_ignores_self_and_unknown(client, auth_headers, seeded_workspace_and_page):
    _, page_id, _ = seeded_workspace_and_page

    response = client.post(
        f"/api/pages/{page_id}/mentions",
        json={"mentions": ["Not A Member", "Unknown Name"]},
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["notified"] == []
