"""Workspace HTTP controllers."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.permissions import (
    assert_manager,
    assert_member,
    assert_owner,
)
from middlewares.responses import error, success
from schemas.workspace_schema import (
    InviteCreateSchema,
    MemberUpdateSchema,
    WorkspaceCreateSchema,
    WorkspaceUpdateSchema,
)
from services.exceptions import ServiceError
from services.workspace_service import WorkspaceService

workspaces_bp = Blueprint("workspaces", __name__, url_prefix="/workspaces")


@workspaces_bp.post("")
@jwt_required()
def create():
    user = get_current_user()
    data = WorkspaceCreateSchema().load(request.get_json(force=True, silent=True) or {})
    ws = WorkspaceService.create(user.id, data["name"], data.get("icon"))
    return success("Workspace created", ws, 201)


@workspaces_bp.get("")
@jwt_required()
def list_workspaces():
    user = get_current_user()
    return success("Workspaces retrieved", WorkspaceService.list_for_user(user.id))


@workspaces_bp.get("/<int:workspace_id>")
@jwt_required()
def get_workspace(workspace_id: int):
    user = get_current_user()
    assert_member(user.id, workspace_id)
    ws = WorkspaceService.get(workspace_id)
    members = WorkspaceService.list_members(user.id, workspace_id)
    return success("Workspace retrieved", {"workspace": ws, "members": members})


@workspaces_bp.put("/<int:workspace_id>")
@jwt_required()
def update_workspace(workspace_id: int):
    user = get_current_user()
    assert_manager(user.id, workspace_id)
    data = WorkspaceUpdateSchema().load(
        request.get_json(force=True, silent=True) or {}, partial=True
    )
    ws = WorkspaceService.update(
        user.id, workspace_id, data.get("name"), data.get("icon")
    )
    return success("Workspace updated", ws)


@workspaces_bp.delete("/<int:workspace_id>")
@jwt_required()
def delete_workspace(workspace_id: int):
    user = get_current_user()
    assert_owner(user.id, workspace_id)
    WorkspaceService.delete(user.id, workspace_id)
    return success("Workspace deleted")


@workspaces_bp.post("/<int:workspace_id>/invites")
@jwt_required()
def create_invite(workspace_id: int):
    user = get_current_user()
    assert_manager(user.id, workspace_id)
    data = InviteCreateSchema().load(request.get_json(force=True, silent=True) or {})
    invite = WorkspaceService.create_invite(
        user.id, workspace_id, data["email"], data["role"]
    )
    return success("Invite created", invite, 201)


@workspaces_bp.get("/<int:workspace_id>/invites")
@jwt_required()
def list_invites(workspace_id: int):
    user = get_current_user()
    assert_member(user.id, workspace_id)
    invites = WorkspaceService.list_invites(user.id, workspace_id)
    return success("Invites retrieved", invites)


@workspaces_bp.delete("/<int:workspace_id>/invites/<int:invite_id>")
@jwt_required()
def delete_invite(workspace_id: int, invite_id: int):
    user = get_current_user()
    assert_manager(user.id, workspace_id)
    WorkspaceService.delete_invite(user.id, workspace_id, invite_id)
    return success("Invite revoked")


@workspaces_bp.post("/invites/accept")
@jwt_required()
def accept_invite():
    user = get_current_user()
    token = (request.get_json(force=True, silent=True) or {}).get("token")
    if not token:
        return error("Invite token is required", None, 400)
    ws = WorkspaceService.accept_invite(user.id, token)
    return success("Invite accepted", ws)


@workspaces_bp.get("/<int:workspace_id>/members")
@jwt_required()
def list_members(workspace_id: int):
    user = get_current_user()
    assert_member(user.id, workspace_id)
    members = WorkspaceService.list_members(user.id, workspace_id)
    return success("Members retrieved", members)


@workspaces_bp.put("/<int:workspace_id>/members/<int:target_user_id>")
@jwt_required()
def change_role(workspace_id: int, target_user_id: int):
    user = get_current_user()
    assert_manager(user.id, workspace_id)
    data = MemberUpdateSchema().load(request.get_json(force=True, silent=True) or {})
    member = WorkspaceService.change_member_role(
        user.id, workspace_id, target_user_id, data["role"]
    )
    return success("Member role updated", member)


@workspaces_bp.delete("/<int:workspace_id>/members/<int:target_user_id>")
@jwt_required()
def remove_member(workspace_id: int, target_user_id: int):
    user = get_current_user()
    assert_manager(user.id, workspace_id)
    WorkspaceService.remove_member(user.id, workspace_id, target_user_id)
    return success("Member removed")
