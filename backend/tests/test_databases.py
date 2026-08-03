"""Integration tests for Notion-style databases."""
import json

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


def _create_filter_test_db(client, auth_headers):
    ws = client.post(
        "/api/workspaces", json={"name": "Filter WS"}, headers=auth_headers
    )
    workspace_id = ws.get_json()["data"]["id"]
    created = client.post(
        "/api/databases",
        json={
            "workspace_id": workspace_id,
            "name": "Tarefas",
            "properties": [
                {"name": "Título", "type": "text", "position": 0},
                {
                    "name": "Prioridade",
                    "type": "select",
                    "position": 1,
                    "options": {"choices": ["Alta", "Média"]},
                },
                {"name": "Pontos", "type": "number", "position": 2},
            ],
        },
        headers=auth_headers,
    )
    database = created.get_json()["data"]
    props = {p["name"]: p for p in database["properties"]}
    db_id = database["id"]
    for title, priority, points in [
        ("Escrever docs", "Alta", 5),
        ("Revisar código", "Média", 3),
        ("Planejar sprint", None, 8),
    ]:
        values = [{"property_id": props["Título"]["id"], "value": title}]
        if priority:
            values.append({"property_id": props["Prioridade"]["id"], "value": priority})
        if points:
            values.append({"property_id": props["Pontos"]["id"], "value": points})
        client.post(
            f"/api/databases/{db_id}/items", json={"values": values}, headers=auth_headers
        )
    return db_id, props


def test_database_filter_and_sort(client, auth_headers):
    db_id, props = _create_filter_test_db(client, auth_headers)
    priority_id = props["Prioridade"]["id"]
    points_id = props["Pontos"]["id"]

    filtered = client.get(
        f"/api/databases/{db_id}",
        query_string={
            "filter": json.dumps(
                [{"property_id": priority_id, "operator": "equals", "value": "Alta"}]
            )
        },
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    items = filtered.get_json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["values"][str(props["Título"]["id"])]["value"] == "Escrever docs"

    not_empty = client.get(
        f"/api/databases/{db_id}",
        query_string={
            "filter": json.dumps(
                [{"property_id": priority_id, "operator": "is_not_empty"}]
            )
        },
        headers=auth_headers,
    )
    assert len(not_empty.get_json()["data"]["items"]) == 2

    sorted_desc = client.get(
        f"/api/databases/{db_id}",
        query_string={
            "sort": json.dumps(
                [{"property_id": points_id, "direction": "desc"}]
            )
        },
        headers=auth_headers,
    )
    points_ordered = [
        it["values"].get(str(points_id), {}).get("value")
        for it in sorted_desc.get_json()["data"]["items"]
    ]
    assert points_ordered[:3] == [8.0, 5.0, 3.0]

    combined = client.get(
        f"/api/databases/{db_id}",
        query_string={
            "filter": json.dumps(
                [{"property_id": points_id, "operator": "greater_than", "value": 2}]
            ),
            "sort": json.dumps([{"property_id": points_id, "direction": "asc"}]),
        },
        headers=auth_headers,
    )
    assert [it["values"][str(points_id)]["value"] for it in combined.get_json()["data"]["items"]] == [3.0, 5.0, 8.0]


def test_database_filter_invalid_json(client, auth_headers):
    db_id, _ = _create_filter_test_db(client, auth_headers)
    res = client.get(
        f"/api/databases/{db_id}",
        query_string={"filter": "not-json"},
        headers=auth_headers,
    )
    assert res.status_code == 422
