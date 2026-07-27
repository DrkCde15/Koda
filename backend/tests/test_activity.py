"""Tests for presence tracking and activity feed endpoints."""
import pytest

from extensions import db
from models.activity import WorkspaceActivity


@pytest.fixture
def seeded_workspace_and_page(client, auth_headers):
    ws_resp = client.post(
        "/api/workspaces",
        json={"name": "Activity WS"},
        headers=auth_headers,
    )
    assert ws_resp.status_code == 201
    workspace_id = ws_resp.get_json()["data"]["id"]

    page_resp = client.post(
        "/api/pages",
        json={"workspace_id": workspace_id, "title": "Activity page"},
        headers=auth_headers,
    )
    assert page_resp.status_code == 201
    page_id = page_resp.get_json()["data"]["id"]

    return workspace_id, page_id


def test_set_presence(client, auth_headers, seeded_workspace_and_page):
    _, page_id = seeded_workspace_and_page

    resp = client.post(
        f"/api/pages/{page_id}/presence",
        json={"status": "online"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["data"]["status"] == "online"
    assert data["data"]["page_id"] == page_id
    assert "user" in data["data"]
    assert data["data"]["user"]["full_name"] == "Dev User"


def test_set_presence_offline(client, auth_headers, seeded_workspace_and_page):
    _, page_id = seeded_workspace_and_page

    client.post(f"/api/pages/{page_id}/presence", json={"status": "online"}, headers=auth_headers)
    resp = client.post(
        f"/api/pages/{page_id}/presence",
        json={"status": "offline"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["status"] == "offline"


def test_set_presence_page_not_found(client, auth_headers):
    resp = client.post(
        "/api/pages/99999/presence",
        json={"status": "online"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_list_presence(client, auth_headers, seeded_workspace_and_page):
    workspace_id, page_id = seeded_workspace_and_page

    client.post(f"/api/pages/{page_id}/presence", json={"status": "online"}, headers=auth_headers)

    resp = client.get(
        f"/api/workspaces/{workspace_id}/presence",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert len(data["data"]) >= 1
    assert any(p["page_id"] == page_id for p in data["data"])


def test_list_presence_empty(client, auth_headers, seeded_workspace_and_page):
    workspace_id, _ = seeded_workspace_and_page

    resp = client.get(
        f"/api/workspaces/{workspace_id}/presence",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"] == []


def test_list_presence_non_member(client, auth_headers, seeded_workspace_and_page):
    workspace_id, _ = seeded_workspace_and_page

    other_resp = client.post(
        "/api/auth/register",
        json={"email": "intruder@koda.app", "full_name": "Intruder", "password": "password123"},
    )
    other_token = other_resp.get_json()["data"]["access_token"]

    resp = client.get(
        f"/api/workspaces/{workspace_id}/presence",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


def test_list_activity_empty(client, auth_headers, seeded_workspace_and_page):
    workspace_id, _ = seeded_workspace_and_page

    resp = client.get(
        f"/api/workspaces/{workspace_id}/activity",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"] == []


def test_list_activity_with_entries(client, auth_headers, seeded_workspace_and_page):
    workspace_id, page_id = seeded_workspace_and_page

    with client.application.app_context():
        me_resp = client.get("/api/auth/me", headers=auth_headers)
        user_id = me_resp.get_json()["data"]["user"]["id"]

        activity = WorkspaceActivity(
            workspace_id=workspace_id,
            user_id=user_id,
            action="page_created",
            message="criou a página 'Teste'",
            entity_type="page",
            entity_id=page_id,
        )
        db.session.add(activity)

        activity2 = WorkspaceActivity(
            workspace_id=workspace_id,
            user_id=user_id,
            action="comment_added",
            message="comentou em 'Teste'",
            entity_type="comment",
        )
        db.session.add(activity2)
        db.session.commit()

    resp = client.get(
        f"/api/workspaces/{workspace_id}/activity",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert len(data) == 2
    assert data[0]["action"] == "comment_added"
    assert data[1]["action"] == "page_created"
    assert data[1]["entity_id"] == page_id
    assert data[1]["user"]["full_name"] == "Dev User"


def test_list_activity_non_member(client, auth_headers, seeded_workspace_and_page):
    workspace_id, _ = seeded_workspace_and_page

    other_resp = client.post(
        "/api/auth/register",
        json={"email": "spy@koda.app", "full_name": "Spy", "password": "password123"},
    )
    other_token = other_resp.get_json()["data"]["access_token"]

    resp = client.get(
        f"/api/workspaces/{workspace_id}/activity",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


def test_presence_updates_last_seen(client, auth_headers, seeded_workspace_and_page):
    _, page_id = seeded_workspace_and_page

    first = client.post(f"/api/pages/{page_id}/presence", json={"status": "online"}, headers=auth_headers)
    first_last_seen = first.get_json()["data"]["last_seen_at"]

    import time
    time.sleep(0.01)

    second = client.post(f"/api/pages/{page_id}/presence", json={"status": "online"}, headers=auth_headers)
    second_last_seen = second.get_json()["data"]["last_seen_at"]

    assert second_last_seen > first_last_seen


def test_multiple_users_presence(client, auth_headers, seeded_workspace_and_page):
    workspace_id, page_id = seeded_workspace_and_page

    alice_resp = client.post(
        "/api/auth/register",
        json={"email": "alice@koda.app", "full_name": "Alice", "password": "password123"},
    )
    alice_token = alice_resp.get_json()["data"]["access_token"]
    alice_id = alice_resp.get_json()["data"]["user"]["id"]

    with client.application.app_context():
        from models.workspace_models import WorkspaceMember
        member = WorkspaceMember(workspace_id=workspace_id, user_id=alice_id, role="editor")
        db.session.add(member)
        db.session.commit()

    client.post(f"/api/pages/{page_id}/presence", json={"status": "online"}, headers=auth_headers)
    client.post(
        f"/api/pages/{page_id}/presence",
        json={"status": "online"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )

    resp = client.get(
        f"/api/workspaces/{workspace_id}/presence",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    presences = resp.get_json()["data"]
    assert len(presences) >= 2
    users = [p["user"]["full_name"] for p in presences]
    assert "Dev User" in users
    assert "Alice" in users
