"""Database HTTP controllers."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from services.database_service import (
    add_item,
    add_property,
    create_database,
    delete_database,
    delete_item,
    delete_property,
    get_database,
    list_databases,
    update_database,
    update_item,
    update_property,
)

databases_bp = Blueprint("databases", __name__, url_prefix="/databases")


@databases_bp.post("")
@jwt_required()
def create():
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    try:
        database = create_database(user.id, payload)
    except Exception as exc:  # noqa: BLE001 - normalized downstream
        return error("Could not create database", str(exc), 400)
    return success("Database created", database, 201)


@databases_bp.get("/workspace/<int:workspace_id>")
@jwt_required()
def list_for_workspace(workspace_id: int):
    user = get_current_user()
    try:
        databases = list_databases(user.id, workspace_id)
    except Exception as exc:  # noqa: BLE001
        return error("Could not list databases", str(exc), 403)
    return success("Databases retrieved", databases)


@databases_bp.get("/<int:database_id>")
@jwt_required()
def get_one(database_id: int):
    user = get_current_user()
    try:
        database = get_database(user.id, database_id)
    except Exception as exc:  # noqa: BLE001
        return error("Could not retrieve database", str(exc), 404)
    return success("Database retrieved", database)


@databases_bp.put("/<int:database_id>")
@jwt_required()
def update(database_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    try:
        database = update_database(user.id, database_id, payload)
    except Exception as exc:  # noqa: BLE001
        return error("Could not update database", str(exc), 400)
    return success("Database updated", database)


@databases_bp.delete("/<int:database_id>")
@jwt_required()
def delete(database_id: int):
    user = get_current_user()
    try:
        delete_database(user.id, database_id)
    except Exception as exc:  # noqa: BLE001
        return error("Could not delete database", str(exc), 400)
    return success("Database deleted", None)


@databases_bp.post("/<int:database_id>/properties")
@jwt_required()
def create_property(database_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    try:
        prop = add_property(user.id, database_id, payload)
    except Exception as exc:  # noqa: BLE001
        return error("Could not add property", str(exc), 400)
    return success("Property added", prop, 201)


@databases_bp.put("/<int:database_id>/properties/<int:prop_id>")
@jwt_required()
def edit_property(database_id: int, prop_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    try:
        prop = update_property(user.id, database_id, prop_id, payload)
    except Exception as exc:  # noqa: BLE001
        return error("Could not update property", str(exc), 400)
    return success("Property updated", prop)


@databases_bp.delete("/<int:database_id>/properties/<int:prop_id>")
@jwt_required()
def remove_property(database_id: int, prop_id: int):
    user = get_current_user()
    try:
        delete_property(user.id, database_id, prop_id)
    except Exception as exc:  # noqa: BLE001
        return error("Could not delete property", str(exc), 400)
    return success("Property deleted", None)


@databases_bp.post("/<int:database_id>/items")
@jwt_required()
def create_item(database_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    try:
        item = add_item(user.id, database_id, payload)
    except Exception as exc:  # noqa: BLE001
        return error("Could not add item", str(exc), 400)
    return success("Item added", item, 201)


@databases_bp.put("/<int:database_id>/items/<int:item_id>")
@jwt_required()
def edit_item(database_id: int, item_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    try:
        item = update_item(user.id, database_id, item_id, payload)
    except Exception as exc:  # noqa: BLE001
        return error("Could not update item", str(exc), 400)
    return success("Item updated", item)


@databases_bp.delete("/<int:database_id>/items/<int:item_id>")
@jwt_required()
def remove_item(database_id: int, item_id: int):
    user = get_current_user()
    try:
        delete_item(user.id, database_id, item_id)
    except Exception as exc:  # noqa: BLE001
        return error("Could not delete item", str(exc), 400)
    return success("Item deleted", None)
