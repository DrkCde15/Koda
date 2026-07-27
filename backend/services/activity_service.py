"""Activity stream and presence management."""
from datetime import datetime, timezone

from extensions import db
from middlewares.permissions import assert_member
from models.activity import PagePresence, WorkspaceActivity
from models.page import Page
from services.exceptions import NotFoundError


class ActivityService:
    @staticmethod
    def set_presence(user_id: int, page_id: int, status: str = "online") -> dict:
        page = db.session.get(Page, page_id)
        if page is None or page.is_deleted:
            raise NotFoundError("Page not found")
        assert_member(user_id, page.workspace_id)

        presence = (
            db.session.query(PagePresence)
            .filter(PagePresence.page_id == page_id, PagePresence.user_id == user_id)
            .first()
        )
        if presence is None:
            presence = PagePresence(
                workspace_id=page.workspace_id,
                page_id=page_id,
                user_id=user_id,
                status=status,
            )
            db.session.add(presence)
        else:
            presence.status = status
            presence.last_seen_at = datetime.now(timezone.utc)

        db.session.commit()
        return presence.to_dict()

    @staticmethod
    def list_presence(user_id: int, workspace_id: int) -> list[dict]:
        assert_member(user_id, workspace_id)
        presences = (
            db.session.query(PagePresence)
            .filter(PagePresence.workspace_id == workspace_id)
            .order_by(PagePresence.last_seen_at.desc())
            .all()
        )
        return [presence.to_dict() for presence in presences if not PagePresence.is_stale(presence.last_seen_at)]

    @staticmethod
    def list_activity(user_id: int, workspace_id: int) -> list[dict]:
        assert_member(user_id, workspace_id)
        activities = (
            db.session.query(WorkspaceActivity)
            .filter(WorkspaceActivity.workspace_id == workspace_id)
            .order_by(WorkspaceActivity.created_at.desc())
            .limit(20)
            .all()
        )
        return [activity.to_dict() for activity in activities]

    @staticmethod
    def log_activity(workspace_id: int, user_id: int, action: str, message: str, entity_type: str | None = None, entity_id: int | None = None) -> None:
        activity = WorkspaceActivity(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.session.add(activity)
        db.session.commit()
