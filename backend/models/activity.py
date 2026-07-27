"""Activity and presence models for collaboration."""
from datetime import datetime, timedelta

from extensions import db
from models.base import PKMixin, TimestampMixin, utcnow


class WorkspaceActivity(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "workspace_activities"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id"), nullable=False, index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(60), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    entity_type = db.Column(db.String(40), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "action": self.action,
            "message": self.message,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user": {
                "id": self.user.id,
                "full_name": self.user.full_name,
                "avatar_url": self.user.avatar_url,
            } if self.user is not None else None,
        }


class PagePresence(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "page_presences"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id"), nullable=False, index=True
    )
    page_id = db.Column(db.Integer, db.ForeignKey("pages.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="online")
    last_seen_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user = db.relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "page_id": self.page_id,
            "user_id": self.user_id,
            "status": self.status,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "user": {
                "id": self.user.id,
                "full_name": self.user.full_name,
                "avatar_url": self.user.avatar_url,
            } if self.user is not None else None,
        }

    @staticmethod
    def is_stale(last_seen_at: datetime) -> bool:
        return last_seen_at < datetime.utcnow() - timedelta(minutes=2)
