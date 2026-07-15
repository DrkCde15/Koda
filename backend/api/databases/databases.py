"""Database HTTP controllers.

Thin layer: validates input, delegates to the service and returns the standard
envelope. Domain errors raised by the service are translated by the global
error handler in ``middlewares/errors.py``.
"""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import success
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
    database = create_database(user.id, payload)
    return success("Database created", database, 201)


@databases_bp.get("/workspace/<int:workspace_id>")
@jwt_required()
def list_for_workspace(workspace_id: int):
    user = get_current_user()
    databases = list_databases(user.id, workspace_id)
    return success("Databases retrieved", databases)


@databases_bp.get("/<int:database_id>")
@jwt_required()
def get_one(database_id: int):
    user = get_current_user()
    database = get_database(user.id, database_id)
    return success("Database retrieved", database)


@databases_bp.put("/<int:database_id>")
@jwt_required()
def update(database_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    database = update_database(user.id, database_id, payload)
    return success("Database updated", database)


@databases_bp.delete("/<int:database_id>")
@jwt_required()
def delete(database_id: int):
    user = get_current_user()
    delete_database(user.id, database_id)
    return success("Database deleted", None)


@databases_bp.post("/<int:database_id>/properties")
@jwt_required()
def create_property(database_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    prop = add_property(user.id, database_id, payload)
    return success("Property added", prop, 201)


@databases_bp.put("/<int:database_id>/properties/<int:prop_id>")
@jwt_required()
def edit_property(database_id: int, prop_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    prop = update_property(user.id, database_id, prop_id, payload)
    return success("Property updated", prop)


@databases_bp.delete("/<int:database_id>/properties/<int:prop_id>")
@jwt_required()
def remove_property(database_id: int, prop_id: int):
    user = get_current_user()
    delete_property(user.id, database_id, prop_id)
    return success("Property deleted", None)


@databases_bp.post("/<int:database_id>/items")
@jwt_required()
def create_item(database_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    item = add_item(user.id, database_id, payload)
    return success("Item added", item, 201)


@databases_bp.put("/<int:database_id>/items/<int:item_id>")
@jwt_required()
def edit_item(database_id: int, item_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    item = update_item(user.id, database_id, item_id, payload)
    return success("Item updated", item)


@databases_bp.delete("/<int:database_id>/items/<int:item_id>")
@jwt_required()
def remove_item(database_id: int, item_id: int):
    user = get_current_user()
    delete_item(user.id, database_id, item_id)
    return success("Item deleted", None)
