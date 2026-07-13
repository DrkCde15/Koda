"""End-to-end smoke tests for the core API flow."""
import pytest


def test_register_login_me(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "alice@koda.app", "full_name": "Alice", "password": "password123"},
    )
    assert resp.status_code == 201
    data = resp.get_json()["data"]
    assert data["access_token"] and data["refresh_token"]
    token = data["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.get_json()["data"]["user"]["email"] == "alice@koda.app"


def test_login_invalid(client):
    client.post(
        "/api/auth/register",
        json={"email": "bob@koda.app", "full_name": "Bob", "password": "password123"},
    )
    resp = client.post(
        "/api/auth/login", json={"email": "bob@koda.app", "password": "wrong"}
    )
    assert resp.status_code == 401
    assert resp.get_json()["success"] is False


def test_workspace_page_block_flow(client, auth_headers):
    ws = client.post("/api/workspaces", json={"name": "My Workspace"}, headers=auth_headers)
    assert ws.status_code == 201
    workspace_id = ws.get_json()["data"]["id"]

    listed = client.get("/api/workspaces", headers=auth_headers)
    assert listed.status_code == 200
    assert any(w["id"] == workspace_id for w in listed.get_json()["data"])

    page = client.post(
        "/api/pages",
        json={"workspace_id": workspace_id, "title": "Getting Started"},
        headers=auth_headers,
    )
    assert page.status_code == 201
    page_id = page.get_json()["data"]["id"]

    updated = client.put(
        "/api/pages/" + str(page_id),
        json={"content": {"blocks": []}, "is_favorite": True},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.get_json()["data"]["is_favorite"] is True

    history = client.get(f"/api/pages/{page_id}/history", headers=auth_headers)
    assert history.status_code == 200
    assert len(history.get_json()["data"]) == 1

    block = client.post(
        "/api/blocks",
        json={"page_id": page_id, "type": "heading_1", "content": {"text": "Hello"}},
        headers=auth_headers,
    )
    assert block.status_code == 201

    blocks = client.get(f"/api/blocks?page_id={page_id}", headers=auth_headers)
    assert blocks.status_code == 200
    assert len(blocks.get_json()["data"]) == 1


def test_workspace_permission_denied(client, auth_headers):
    other = client.post(
        "/api/auth/register",
        json={"email": "carol@koda.app", "full_name": "Carol", "password": "password123"},
    )
    other_token = other.get_json()["data"]["access_token"]
    ws = client.post("/api/workspaces", json={"name": "Private"}, headers=auth_headers)
    workspace_id = ws.get_json()["data"]["id"]

    denied = client.get(f"/api/workspaces/{workspace_id}", headers={"Authorization": f"Bearer {other_token}"})
    assert denied.status_code == 403
