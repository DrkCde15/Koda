"""Comment and notification models for page collaboration."""
import re

from extensions import db
from models.base import PKMixin, TimestampMixin, utcnow


class PageComment(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "page_comments"

    page_id = db.Column(db.Integer, db.ForeignKey("pages.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    mentions = db.Column(db.JSON, nullable=False, default=list)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "page_id": self.page_id,
            "user_id": self.user_id,
            "body": self.body,
            "mentions": self.mentions or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "author": {
                "id": self.user.id,
                "full_name": self.user.full_name,
                "avatar_url": self.user.avatar_url,
            } if self.user is not None else None,
        }


class Notification(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(40), nullable=False, default="comment")
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    entity_type = db.Column(db.String(40), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
