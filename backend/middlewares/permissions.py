"""Workspace authorisation helpers."""
from models.user import Role
from repositories.workspace_repository import WorkspaceRepository
from services.exceptions import ForbiddenError, NotFoundError

MANAGER_ROLES = {Role.OWNER, Role.ADMIN}
EDITOR_ROLES = {Role.OWNER, Role.ADMIN, Role.EDITOR}
ALL_ROLES = set(Role.values())


def get_membership_or_404(user_id: int, workspace_id: int):
    member = WorkspaceRepository.get_member(workspace_id, user_id)
    if member is None:
        raise ForbiddenError("You are not a member of this workspace")
    return member


def assert_role(user_id: int, workspace_id: int, allowed: set[str]) -> None:
    member = get_membership_or_404(user_id, workspace_id)
    if member.role not in allowed:
        raise ForbiddenError("Insufficient permissions for this action")


def assert_member(user_id: int, workspace_id: int) -> None:
    assert_role(user_id, workspace_id, ALL_ROLES)


def assert_manager(user_id: int, workspace_id: int) -> None:
    assert_role(user_id, workspace_id, MANAGER_ROLES)


def assert_editor(user_id: int, workspace_id: int) -> None:
    assert_role(user_id, workspace_id, EDITOR_ROLES)


def assert_owner(user_id: int, workspace_id: int) -> None:
    assert_role(user_id, workspace_id, {Role.OWNER})
