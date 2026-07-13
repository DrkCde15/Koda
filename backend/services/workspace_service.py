"""Workspace business logic."""
import secrets

from extensions import db
from models.user import Role
from models.workspace_models import Invite
from repositories.user_repository import UserRepository
from repositories.workspace_repository import WorkspaceRepository
from services.exceptions import ConflictError, ForbiddenError, NotFoundError, ServiceError


class WorkspaceService:
    @staticmethod
    def create(user_id: int, name: str, icon: str | None) -> dict:
        slug = WorkspaceRepository.generate_slug(name)
        ws = WorkspaceRepository.create(name=name, slug=slug, icon=icon, owner_id=user_id)
        WorkspaceRepository.add_member(ws.id, user_id, Role.OWNER)
        return ws.to_dict()

    @staticmethod
    def list_for_user(user_id: int) -> list[dict]:
        workspaces = WorkspaceRepository.get_for_user(user_id)
        return [ws.to_dict() for ws in workspaces]

    @staticmethod
    def get(workspace_id: int) -> dict:
        ws = WorkspaceRepository.get_by_id(workspace_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        return ws.to_dict()

    @staticmethod
    def update(user_id: int, workspace_id: int, name: str | None, icon: str | None) -> dict:
        ws = WorkspaceRepository.get_by_id(workspace_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        if name is not None:
            ws.name = name
        if icon is not None:
            ws.icon = icon
        db.session.commit()
        return ws.to_dict()

    @staticmethod
    def delete(user_id: int, workspace_id: int) -> None:
        ws = WorkspaceRepository.get_by_id(workspace_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        db.session.delete(ws)
        db.session.commit()

    @staticmethod
    def create_invite(user_id: int, workspace_id: int, email: str, role: str) -> dict:
        ws = WorkspaceRepository.get_by_id(workspace_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        token = secrets.token_urlsafe(32)
        invite = WorkspaceRepository.create_invite(workspace_id, email, role, token)
        return invite.to_dict()

    @staticmethod
    def accept_invite(user_id: int, token: str) -> dict:
        invite = WorkspaceRepository.get_invite_by_token(token)
        if invite is None or invite.accepted:
            raise ServiceError("Invalid or already used invite")
        if invite.is_expired():
            raise ServiceError("Invite has expired")
        user = UserRepository.get_by_id(user_id)
        if user is None or user.email.lower() != invite.email.lower():
            raise ForbiddenError("Invite was sent to a different account")
        if WorkspaceRepository.get_member(invite.workspace_id, user_id) is not None:
            raise ConflictError("Already a member of this workspace")
        WorkspaceRepository.add_member(invite.workspace_id, user_id, invite.role)
        invite.accepted = True
        db.session.commit()
        ws = WorkspaceRepository.get_by_id(invite.workspace_id)
        return ws.to_dict()

    @staticmethod
    def list_invites(user_id: int, workspace_id: int) -> list[dict]:
        if WorkspaceRepository.get_by_id(workspace_id) is None:
            raise NotFoundError("Workspace not found")
        invites = WorkspaceRepository.list_invites(workspace_id)
        return [i.to_dict() for i in invites]

    @staticmethod
    def delete_invite(user_id: int, workspace_id: int, invite_id: int) -> None:
        invite = (
            db.session.query(Invite)
            .filter(Invite.id == invite_id, Invite.workspace_id == workspace_id)
            .first()
        )
        if invite is None:
            raise NotFoundError("Invite not found")
        WorkspaceRepository.delete_invite(invite)

    @staticmethod
    def list_members(user_id: int, workspace_id: int) -> list[dict]:
        if WorkspaceRepository.get_by_id(workspace_id) is None:
            raise NotFoundError("Workspace not found")
        members = WorkspaceRepository.list_members(workspace_id)
        return [m.to_dict() for m in members]

    @staticmethod
    def change_member_role(
        user_id: int, workspace_id: int, target_user_id: int, role: str
    ) -> dict:
        member = WorkspaceRepository.get_member(workspace_id, target_user_id)
        if member is None:
            raise NotFoundError("Member not found")
        if member.role == Role.OWNER:
            raise ForbiddenError("Cannot change the owner role")
        updated = WorkspaceRepository.update_member_role(member, role)
        return updated.to_dict()

    @staticmethod
    def remove_member(user_id: int, workspace_id: int, target_user_id: int) -> None:
        member = WorkspaceRepository.get_member(workspace_id, target_user_id)
        if member is None:
            raise NotFoundError("Member not found")
        if member.role == Role.OWNER:
            raise ForbiddenError("Cannot remove the workspace owner")
        WorkspaceRepository.remove_member(member)
