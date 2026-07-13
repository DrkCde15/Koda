"""Integration tests for Notion-style databases."""
import pytest


def test_database_full_flow(client, auth_headers):
    ws = client.post("/api/workspaces", json={"name": "DB Workspace"}, headers=auth_headers)
    workspace_id = ws.get_json()["data"]["id"]

    created = client.post(
        "/api/databases",
        json={
            "workspace_id": workspace_id,
            "name": "Tarefas",
            "icon": "✅",
            "properties": [
                {"name": "Título", "type": "text", "position": 0},
                {
                    "name": "Status",
                    "type": "status",
                    "position": 1,
                    "options": {"choices": ["A fazer", "Concluído"]},
                },
            ],
        },
        headers=auth_headers,
    )
    assert created.status_code == 201
    database = created.get_json()["data"]
    assert database["name"] == "Tarefas"
    assert len(database["properties"]) == 2
    title_prop = next(p for p in database["properties"] if p["name"] == "Título")
    status_prop = next(p for p in database["properties"] if p["name"] == "Status")
    database_id = database["id"]

    listed = client.get(f"/api/databases/workspace/{workspace_id}", headers=auth_headers)
    assert listed.status_code == 200
    assert any(d["id"] == database_id for d in listed.get_json()["data"])

    item = client.post(
        "/api/databases/" + str(database_id) + "/items",
        json={
            "values": [
                {"property_id": title_prop["id"], "value": "Escrever docs"},
                {"property_id": status_prop["id"], "value": "A fazer"},
            ]
        },
        headers=auth_headers,
    )
    assert item.status_code == 201
    item_id = item.get_json()["data"]["id"]

    fetched = client.get(f"/api/databases/{database_id}", headers=auth_headers)
    assert fetched.status_code == 200
    fetched_item = fetched.get_json()["data"]["items"][0]
    assert fetched_item["values"][str(title_prop["id"])]["value"] == "Escrever docs"
    assert fetched_item["values"][str(status_prop["id"])]["value"] == "A fazer"

    updated = client.put(
        f"/api/databases/{database_id}/items/{item_id}",
        json={"values": [{"property_id": status_prop["id"], "value": "Concluído"}]},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert (
        updated.get_json()["data"]["values"][str(status_prop["id"])]["value"]
        == "Concluído"
    )

    prop_added = client.post(
        f"/api/databases/{database_id}/properties",
        json={"name": "Prazo", "type": "date"},
        headers=auth_headers,
    )
    assert prop_added.status_code == 201

    deleted = client.delete(f"/api/databases/{database_id}", headers=auth_headers)
    assert deleted.status_code == 200
    gone = client.get(f"/api/databases/{database_id}", headers=auth_headers)
    assert gone.status_code == 404


def test_database_requires_membership(client, auth_headers):
    other = client.post(
        "/api/auth/register",
        json={"email": "dave@koda.app", "full_name": "Dave", "password": "password123"},
    )
    other_token = other.get_json()["data"]["access_token"]
    ws = client.post("/api/workspaces", json={"name": "Private DB"}, headers=auth_headers)
    workspace_id = ws.get_json()["data"]["id"]

    listed = client.get(
        f"/api/databases/workspace/{workspace_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert listed.status_code == 403
