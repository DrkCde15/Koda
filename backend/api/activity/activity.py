"""Presence and activity endpoints."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import success
from services.activity_service import ActivityService

activity_bp = Blueprint("activity", __name__)


@activity_bp.post("/pages/<int:page_id>/presence")
@jwt_required()
def set_presence(page_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    presence = ActivityService.set_presence(user.id, page_id, payload.get("status", "online"))
    return success("Presence updated", presence)


@activity_bp.get("/workspaces/<int:workspace_id>/presence")
@jwt_required()
def list_presence(workspace_id: int):
    user = get_current_user()
    presences = ActivityService.list_presence(user.id, workspace_id)
    return success("Presence list retrieved", presences)


@activity_bp.get("/workspaces/<int:workspace_id>/activity")
@jwt_required()
def list_activity(workspace_id: int):
    user = get_current_user()
    activities = ActivityService.list_activity(user.id, workspace_id)
    return success("Activity retrieved", activities)
