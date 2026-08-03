"""Business logic for Notion-style databases."""
from datetime import datetime, timezone
from functools import cmp_to_key

from extensions import db
from middlewares.permissions import assert_manager, assert_member
from models.database_models import (
    Database,
    DatabaseItem,
    DatabaseItemValue,
    DatabaseProperty,
)
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


def _serialize_database(
    database: Database,
    include_items: bool = False,
    filters: list | None = None,
    sorts: list | None = None,
) -> dict:
    properties = DatabaseRepository.list_properties(database.id)
    result = database.to_dict()
    result["properties"] = [p.to_dict() for p in properties]
    if include_items:
        items = DatabaseRepository.list_items(database.id)
        prop_by_id = {p.id: p for p in properties}
        values_by_item = _values_by_item(database.id)
        item_dicts = []
        for item in items:
            values = values_by_item.get(item.id, {})
            cell_map = {}
            for prop_id, v in values.items():
                prop = prop_by_id.get(prop_id)
                ptype = prop.type if prop else "text"
                cell_map[str(prop_id)] = {
                    "property_id": prop_id,
                    "type": ptype,
                    "value": _cell_value(v, ptype),
                }
            item_dict = item.to_dict()
            item_dict["values"] = cell_map
            item_dicts.append(item_dict)
        if filters:
            item_dicts = [
                it
                for it in item_dicts
                if _matches_filters(prop_by_id, it["values"], filters)
            ]
        if sorts:
            item_dicts.sort(
                key=cmp_to_key(
                    lambda a, b: _compare_items(prop_by_id, sorts, a["values"], b["values"])
                )
            )
        result["items"] = item_dicts
    return result


def _values_by_item(database_id: int) -> dict:
    rows = (
        db.session.query(DatabaseItemValue)
        .join(DatabaseItem, DatabaseItemValue.item_id == DatabaseItem.id)
        .filter(DatabaseItem.database_id == database_id)
        .all()
    )
    grouped: dict = {}
    for row in rows:
        grouped.setdefault(row.item_id, {})[row.property_id] = row
    return grouped


def _cell_value(value: DatabaseItemValue, ptype: str):
    if ptype == "number":
        return value.value_number
    if ptype == "date":
        return value.value_date.isoformat() if value.value_date else None
    if ptype in ("select", "status"):
        return value.value_select
    return value.value_text


def _normalize_for_compare(prop: DatabaseProperty, raw):
    if raw is None:
        return None
    if prop.type == "number":
        try:
            return float(raw)
        except (TypeError, ValueError):
            return None
    if prop.type == "date":
        if isinstance(raw, datetime):
            return raw
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return None
    return str(raw)


def _matches_filters(
    prop_by_id: dict,
    cell_map: dict,
    filters: list,
) -> bool:
    for f in filters:
        prop = prop_by_id.get(f["property_id"])
        if prop is None:
            continue
        cell = cell_map.get(str(f["property_id"]))
        raw = cell["value"] if cell else None
        value = _normalize_for_compare(prop, raw)
        target = _normalize_for_compare(prop, f.get("value"))
        op = f["operator"]
        empty = value is None or (isinstance(value, str) and not value.strip())
        if op == "is_empty":
            if not empty:
                return False
        elif op == "is_not_empty":
            if empty:
                return False
        elif empty:
            return False
        elif op == "contains":
            if not isinstance(value, str) or target is None or target not in value:
                return False
        elif op == "equals":
            if value != target:
                return False
        elif op == "not_equals":
            if value == target:
                return False
        elif op in ("greater_than", "less_than"):
            if not isinstance(value, (int, float, datetime)) or not isinstance(
                target, (int, float, datetime)
            ):
                return False
            if op == "greater_than" and not value > target:
                return False
            if op == "less_than" and not value < target:
                return False
        elif op in ("after", "before"):
            if not isinstance(value, datetime) or not isinstance(target, datetime):
                return False
            if op == "after" and not value > target:
                return False
            if op == "before" and not value < target:
                return False
        else:
            return False
    return True


def _compare_items(prop_by_id: dict, sorts: list, a: dict, b: dict) -> int:
    """Compare two cell maps by the sort rules; None values always go last."""
    for s in sorts:
        prop = prop_by_id.get(s["property_id"])
        if prop is None:
            continue
        key = str(s["property_id"])
        va = _normalize_for_compare(prop, a.get(key, {}).get("value"))
        vb = _normalize_for_compare(prop, b.get(key, {}).get("value"))
        if isinstance(va, str):
            va = va.lower()
        if isinstance(vb, str):
            vb = vb.lower()
        if va is None and vb is None:
            continue
        if va is None:
            return 1
        if vb is None:
            return -1
        if va == vb:
            continue
        if va < vb:
            return -1 if s["direction"] == "asc" else 1
        return 1 if s["direction"] == "asc" else -1
    return 0


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


def get_database(
    user_id: int,
    database_id: int,
    filters: list | None = None,
    sorts: list | None = None,
) -> dict:
    database = DatabaseRepository.get_by_id(database_id)
    if database is None:
        raise NotFoundError("Database not found")
    assert_member(user_id, database.workspace_id)
    return _serialize_database(
        database, include_items=True, filters=filters or None, sorts=sorts or None
    )


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
