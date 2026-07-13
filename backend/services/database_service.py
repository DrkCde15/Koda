"""Business logic for Notion-style databases."""
from datetime import datetime, timezone

from extensions import db
from middlewares.permissions import assert_manager, assert_member
from models.database_models import Database, DatabaseItemValue, DatabaseProperty
from repositories.database_repository import DatabaseRepository
from schemas.database_schema import (
    DatabaseCreateSchema,
    DatabaseUpdateSchema,
    ItemCreateSchema,
    ItemUpdateSchema,
    PropertyInputSchema,
    PropertyUpdateSchema,
)
from services.exceptions import NotFoundError, ValidationError

PROPERTY_COLUMN = {
    "text": "value_text",
    "number": "value_number",
    "date": "value_date",
    "select": "value_select",
    "status": "value_select",
}


def _parse_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValidationError(f"Invalid date value: {value}") from exc
    raise ValidationError("Invalid date value")


def _column_for(prop: DatabaseProperty, raw_value):
    if prop.type == "number":
        if raw_value is None or raw_value == "":
            return "value_number", None
        try:
            return "value_number", float(raw_value)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"Invalid number value: {raw_value}") from exc
    if prop.type == "date":
        return "value_date", _parse_date(raw_value)
    if prop.type in ("select", "status"):
        return "value_select", (raw_value if raw_value is not None else None)
    return "value_text", (raw_value if raw_value is not None else None)


def _build_value_record(item_id: int, prop: DatabaseProperty, raw_value) -> dict:
    column, value = _column_for(prop, raw_value)
    DatabaseRepository.set_value(item_id, prop.id, column, value)
    return {
        "property_id": prop.id,
        "type": prop.type,
        "value": value,
    }


def _serialize_database(database: Database, include_items: bool = False) -> dict:
    properties = DatabaseRepository.list_properties(database.id)
    result = database.to_dict()
    result["properties"] = [p.to_dict() for p in properties]
    if include_items:
        items = DatabaseRepository.list_items(database.id)
        prop_by_id = {p.id: p for p in properties}
        item_dicts = []
        for item in items:
            values = (
                db.session.query(DatabaseItemValue)
                .filter(DatabaseItemValue.item_id == item.id)
                .all()
            )
            cell_map = {}
            for v in values:
                prop = prop_by_id.get(v.property_id)
                ptype = prop.type if prop else "text"
                cell_map[str(v.property_id)] = {
                    "property_id": v.property_id,
                    "type": ptype,
                    "value": v.value_text
                    if ptype == "text"
                    else (v.value_number if ptype == "number" else (v.value_date.isoformat() if v.value_date else v.value_select)),
                }
            item_dict = item.to_dict()
            item_dict["values"] = cell_map
            item_dicts.append(item_dict)
        result["items"] = item_dicts
    return result


def create_database(user_id: int, payload: dict) -> dict:
    data = DatabaseCreateSchema().load(payload)
    workspace_id = data["workspace_id"]
    assert_manager(user_id, workspace_id)

    database = DatabaseRepository.create(
        workspace_id=workspace_id,
        name=data["name"],
        icon=data.get("icon"),
    )
    properties = data.get("properties") or []
    for idx, p in enumerate(properties):
        DatabaseRepository.create_property(
            database_id=database.id,
            name=p["name"],
            type_=p["type"],
            options=p.get("options"),
            position=p.get("position", idx),
        )
    DatabaseRepository.commit()
    return _serialize_database(database, include_items=True)


def list_databases(user_id: int, workspace_id: int) -> list[dict]:
    assert_member(user_id, workspace_id)
    databases = DatabaseRepository.list_by_workspace(workspace_id)
    return [_serialize_database(d) for d in databases]


def get_database(user_id: int, database_id: int) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_member(user_id, database.workspace_id)
    return _serialize_database(database, include_items=True)


def update_database(user_id: int, database_id: int, payload: dict) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_manager(user_id, database.workspace_id)
    data = DatabaseUpdateSchema().load(payload)
    if "name" in data:
        database.name = data["name"]
    if "icon" in data:
        database.icon = data["icon"]
    DatabaseRepository.commit()
    return _serialize_database(database)


def delete_database(user_id: int, database_id: int) -> None:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_manager(user_id, database.workspace_id)
    DatabaseRepository.delete(database)
    DatabaseRepository.commit()


def add_property(user_id: int, database_id: int, payload: dict) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_manager(user_id, database.workspace_id)
    data = PropertyInputSchema().load(payload)
    existing = DatabaseRepository.list_properties(database_id)
    position = data.get("position", len(existing))
    prop = DatabaseRepository.create_property(
        database_id=database_id,
        name=data["name"],
        type_=data["type"],
        options=data.get("options"),
        position=position,
    )
    DatabaseRepository.commit()
    return prop.to_dict()


def update_property(user_id: int, database_id: int, prop_id: int, payload: dict) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_manager(user_id, database.workspace_id)
    prop = DatabaseRepository.get_property(prop_id)
    if prop is None or prop.database_id != database_id:
        raise NotFoundError("Property not found")
    data = PropertyUpdateSchema().load(payload)
    if "name" in data:
        prop.name = data["name"]
    if "type" in data:
        prop.type = data["type"]
    if "options" in data:
        prop.options = data["options"] or {}
    if "position" in data:
        prop.position = data["position"]
    DatabaseRepository.commit()
    return prop.to_dict()


def delete_property(user_id: int, database_id: int, prop_id: int) -> None:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_manager(user_id, database.workspace_id)
    prop = DatabaseRepository.get_property(prop_id)
    if prop is None or prop.database_id != database_id:
        raise NotFoundError("Property not found")
    DatabaseRepository.delete_property(prop)
    DatabaseRepository.commit()


def add_item(user_id: int, database_id: int, payload: dict) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_member(user_id, database.workspace_id)
    data = ItemCreateSchema().load(payload)
    properties = {p.id: p for p in DatabaseRepository.list_properties(database_id)}
    existing = DatabaseRepository.list_items(database_id)
    position = data.get("position", len(existing))
    item = DatabaseRepository.create_item(database_id, position)
    for cell in data.get("values") or []:
        prop = properties.get(cell["property_id"])
        if prop is None:
            continue
        _build_value_record(item.id, prop, cell["value"])
    DatabaseRepository.commit()
    return _serialize_item(database_id, item.id, properties)


def update_item(user_id: int, database_id: int, item_id: int, payload: dict) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_member(user_id, database.workspace_id)
    item = DatabaseRepository.get_item(item_id)
    if item is None or item.database_id != database_id:
        raise NotFoundError("Item not found")
    data = ItemUpdateSchema().load(payload)
    properties = {p.id: p for p in DatabaseRepository.list_properties(database_id)}
    if "position" in data:
        item.position = data["position"]
    for cell in data.get("values") or []:
        prop = properties.get(cell["property_id"])
        if prop is None:
            continue
        if cell["value"] is None:
            DatabaseRepository.delete_value(item.id, prop.id)
        else:
            _build_value_record(item.id, prop, cell["value"])
    DatabaseRepository.commit()
    return _serialize_item(database_id, item.id, properties)


def delete_item(user_id: int, database_id: int, item_id: int) -> None:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_member(user_id, database.workspace_id)
    item = DatabaseRepository.get_item(item_id)
    if item is None or item.database_id != database_id:
        raise NotFoundError("Item not found")
    DatabaseRepository.delete_item(item)
    DatabaseRepository.commit()


def _serialize_item(database_id: int, item_id: int, properties: dict) -> dict:
    item = DatabaseRepository.get_item(item_id)
    values = (
        db.session.query(DatabaseItemValue)
        .filter(DatabaseItemValue.item_id == item_id)
        .all()
    )
    cell_map = {}
    for v in values:
        prop = properties.get(v.property_id)
        ptype = prop.type if prop else "text"
        cell_map[str(v.property_id)] = {
            "property_id": v.property_id,
            "type": ptype,
            "value": v.value_text
            if ptype == "text"
            else (v.value_number if ptype == "number" else (v.value_date.isoformat() if v.value_date else v.value_select)),
        }
    result = item.to_dict()
    result["values"] = cell_map
    return result
