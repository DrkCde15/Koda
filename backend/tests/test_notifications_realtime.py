"""Tests for the realtime notification stream and invite notifications."""
import queue as queue_mod

import pytest

from extensions import db
from models.workspace_models import Invite, WorkspaceMember
from services.notification_broker import broker


def _register_user(client, email, full_name):
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": full_name, "password": "password123"},
    )
    data = resp.get_json()["data"]
    return data["user"]["id"], data["access_token"]


@pytest.fixture
def workspace_and_jane(client, auth_headers):
    ws = client.post("/api/workspaces", json={"name": "Realtime WS"}, headers=auth_headers)
    workspace_id = ws.get_json()["data"]["id"]

    page = client.post(
        "/api/pages",
        json={"workspace_id": workspace_id, "title": "Stream page"},
        headers=auth_headers,
    )
    page_id = page.get_json()["data"]["id"]

    jane_id, jane_token = _register_user(client, "jane@koda.app", "Jane Doe")

    return workspace_id, page_id, jane_id, jane_token


def test_broker_publish_subscribe():
    q = broker.subscribe(42)
    try:
        assert broker.publish(42, {"id": 1}) is True
        assert q.get(timeout=1) == {"id": 1}
    finally:
        broker.unsubscribe(42, q)


def test_broker_unsubscribe_stops_delivery():
    q = broker.subscribe(42)
    broker.unsubscribe(42, q)
    broker.publish(42, {"id": 1})
    with pytest.raises(queue_mod.Empty):
        q.get(timeout=0.2)


def test_stream_connected_event(client, app, auth_headers):
    app.config["SSE_HEARTBEAT_SECONDS"] = 1
    resp = client.get("/api/notifications/stream", headers=auth_headers, buffered=False)
    assert resp.status_code == 200
    assert resp.content_type.startswith("text/event-stream")
    first = next(resp.response)
    assert b"event: connected" in first
    resp.close()


def test_stream_requires_auth(client):
    resp = client.get("/api/notifications/stream")
    assert resp.status_code == 401


def test_mention_publishes_realtime_event(client, auth_headers, workspace_and_jane):
    workspace_id, page_id, jane_id, _ = workspace_and_jane

    with client.application.app_context():
        db.session.add(WorkspaceMember(workspace_id=workspace_id, user_id=jane_id, role="editor"))
        db.session.commit()

    q = broker.subscribe(jane_id)
    try:
        resp = client.post(
            f"/api/pages/{page_id}/comments",
            json={"body": "Olá @Jane Doe, agora em tempo real", "mentions": []},
            headers=auth_headers,
        )
        assert resp.status_code == 201

        event = q.get(timeout=2)
        assert event["type"] == "mention"
        assert event["user_id"] == jane_id
        assert event["entity_id"] == page_id
    finally:
        broker.unsubscribe(jane_id, q)


def test_create_invite_notifies_existing_user(client, auth_headers, workspace_and_jane):
    workspace_id, _, _, jane_token = workspace_and_jane

    resp = client.post(
        f"/api/workspaces/{workspace_id}/invites",
        json={"email": "jane@koda.app", "role": "editor"},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    notifications = client.get(
        "/api/notifications", headers={"Authorization": f"Bearer {jane_token}"}
    )
    items = notifications.get_json()["data"]
    assert any(
        item["type"] == "invite" and item["entity_id"] == workspace_id for item in items
    )


def test_accept_invite_notifies_owner(client, auth_headers, workspace_and_jane):
    workspace_id, _, _, jane_token = workspace_and_jane

    client.post(
        f"/api/workspaces/{workspace_id}/invites",
        json={"email": "jane@koda.app", "role": "editor"},
        headers=auth_headers,
    )

    with client.application.app_context():
        invite = (
            db.session.query(Invite)
            .filter(Invite.workspace_id == workspace_id, Invite.email == "jane@koda.app")
            .first()
        )
        token = invite.token

    resp = client.post(
        "/api/workspaces/invites/accept",
        json={"token": token},
        headers={"Authorization": f"Bearer {jane_token}"},
    )
    assert resp.status_code == 200

    notifications = client.get("/api/notifications", headers=auth_headers)
    items = notifications.get_json()["data"]
    assert any(item["type"] == "invite_accepted" for item in items)
