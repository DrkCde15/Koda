"""Comment and notification business logic."""
import re
from typing import Any

from extensions import db
from middlewares.permissions import assert_member
from models.comment import Notification, PageComment
from models.page import Page
from services.exceptions import NotFoundError
from services.notification_broker import broker


class CommentService:
    @staticmethod
    def _extract_mentions(body: str) -> list[str]:
        return [m.strip() for m in re.findall(r"@([\w\s.-]+)", body)]

    @staticmethod
    def create_comment(user_id: int, page_id: int, body: str, mentions: list[str] | None = None) -> dict:
        page = db.session.get(Page, page_id)
        if page is None or page.is_deleted:
            raise NotFoundError("Page not found")
        assert_member(user_id, page.workspace_id)

        mention_names = [m.strip() for m in (mentions or [])]
        if not mention_names:
            mention_names = CommentService._extract_mentions(body)

        comment = PageComment(page_id=page_id, user_id=user_id, body=body, mentions=mention_names)
        db.session.add(comment)
        db.session.commit()

        CommentService._create_mentions_notifications(page, user_id, mention_names, comment.body)
        return {"comments": [comment.to_dict()]}

    @staticmethod
    def notify_mentions(user_id: int, page_id: int, mentions: list[str]) -> list[dict]:
        """Create mention notifications from inline document mentions."""
        page = db.session.get(Page, page_id)
        if page is None or page.is_deleted:
            raise NotFoundError("Page not found")
        assert_member(user_id, page.workspace_id)

        mention_names = [name for name in (mentions or []) if name]
        created = CommentService._create_mentions_notifications(page, user_id, mention_names, "")
        return [notification.to_dict() for notification in created]

    @staticmethod
    def list_comments(user_id: int, page_id: int) -> list[dict]:
        page = db.session.get(Page, page_id)
        if page is None or page.is_deleted:
            raise NotFoundError("Page not found")
        assert_member(user_id, page.workspace_id)

        comments = (
            db.session.query(PageComment)
            .filter(PageComment.page_id == page_id)
            .order_by(PageComment.created_at.asc())
            .all()
        )
        return [comment.to_dict() for comment in comments]

    @staticmethod
    def list_notifications(user_id: int) -> list[dict]:
        notifications = (
            db.session.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )
        return [notification.to_dict() for notification in notifications]

    @staticmethod
    def mark_notification_read(user_id: int, notification_id: int) -> dict:
        notification = db.session.get(Notification, notification_id)
        if notification is None or notification.user_id != user_id:
            raise NotFoundError("Notification not found")
        notification.is_read = True
        db.session.commit()
        return notification.to_dict()

    @staticmethod
    def _create_mentions_notifications(
        page: Page, actor_id: int, mention_names: list[str], body: str
    ) -> list[Notification]:
        from models.workspace_models import WorkspaceMember
        from models.user import User

        mention_names = [name for name in (mention_names or []) if name]
        if not mention_names:
            return []

        created: list[Notification] = []
        for mention in mention_names:
            user = (
                db.session.query(User)
                .filter(User.full_name.ilike(mention))
                .first()
            )
            if user is None:
                continue
            if user.id == actor_id:
                continue

            member = (
                db.session.query(WorkspaceMember)
                .filter(
                    WorkspaceMember.workspace_id == page.workspace_id,
                    WorkspaceMember.user_id == user.id,
                )
                .first()
            )
            if member is None:
                continue

            notification = Notification(
                user_id=user.id,
                type="mention",
                title="Você foi mencionado",
                body=f"{body}",
                entity_type="page",
                entity_id=page.id,
            )
            db.session.add(notification)
            created.append(notification)

        db.session.commit()
        for notification in created:
            broker.publish(notification.user_id, notification.to_dict())
        return created
