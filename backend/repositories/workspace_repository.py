"""Data-access layer for workspaces, members and invites."""
from datetime import timedelta
from typing import Optional

from extensions import db
from models.base import utcnow
from models.user import Role
from models.workspace_models import Invite, Workspace, WorkspaceMember


class WorkspaceRepository:
    @staticmethod
    def generate_slug(name: str) -> str:
        base = "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")
        base = base or "workspace"
        slug, n = base, 1
        while WorkspaceRepository.slug_exists(slug):
            n += 1
            slug = f"{base}-{n}"
        return slug

    @staticmethod
    def slug_exists(slug: str) -> bool:
        return (
            db.session.query(Workspace.id).filter(Workspace.slug == slug).first()
            is not None
        )

    @staticmethod
    def create(name: str, slug: str, icon: Optional[str], owner_id: int) -> Workspace:
        ws = Workspace(name=name, slug=slug, icon=icon, owner_id=owner_id)
        db.session.add(ws)
        db.session.commit()
        return ws

    @staticmethod
    def get_by_id(workspace_id: int) -> Optional[Workspace]:
        return db.session.get(Workspace, workspace_id)

    @staticmethod
    def get_for_user(user_id: int) -> list[Workspace]:
        return (
            db.session.query(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .filter(WorkspaceMember.user_id == user_id)
            .all()
        )

    @staticmethod
    def add_member(workspace_id: int, user_id: int, role: str) -> WorkspaceMember:
        member = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
        db.session.add(member)
        db.session.commit()
        return member

    @staticmethod
    def get_member(workspace_id: int, user_id: int) -> Optional[WorkspaceMember]:
        return (
            db.session.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def list_members(workspace_id: int) -> list[WorkspaceMember]:
        return (
            db.session.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id)
            .all()
        )

    @staticmethod
    def update_member_role(member: WorkspaceMember, role: str) -> WorkspaceMember:
        member.role = role
        db.session.commit()
        return member

    @staticmethod
    def remove_member(member: WorkspaceMember) -> None:
        db.session.delete(member)
        db.session.commit()

    @staticmethod
    def create_invite(
        workspace_id: int, email: str, role: str, token: str, ttl_hours: int = 72
    ) -> Invite:
        invite = Invite(
            workspace_id=workspace_id,
            email=email,
            role=role,
            token=token,
            expires_at=utcnow() + timedelta(hours=ttl_hours),
        )
        db.session.add(invite)
        db.session.commit()
        return invite

    @staticmethod
    def get_invite_by_token(token: str) -> Optional[Invite]:
        return db.session.query(Invite).filter(Invite.token == token).first()

    @staticmethod
    def list_invites(workspace_id: int) -> list[Invite]:
        return (
            db.session.query(Invite)
            .filter(Invite.workspace_id == workspace_id, Invite.accepted.is_(False))
            .all()
        )

    @staticmethod
    def delete_invite(invite: Invite) -> None:
        db.session.delete(invite)
        db.session.commit()
