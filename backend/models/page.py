"""Page model supporting subpages, favourites, trash and revision history."""
from extensions import db
from models.base import PKMixin, TimestampMixin, utcnow


class PageRevision(db.Model, PKMixin):
    __tablename__ = "page_revisions"

    page_id = db.Column(
        db.Integer, db.ForeignKey("pages.id"), nullable=False, index=True
    )
    title = db.Column(db.String(300), nullable=False, default="Untitled")
    content = db.Column(db.JSON, nullable=False, default=dict)
    edited_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "page_id": self.page_id,
            "title": self.title,
            "content": self.content,
            "edited_by": self.edited_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Page(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "pages"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id"), nullable=False, index=True
    )
    parent_id = db.Column(
        db.Integer, db.ForeignKey("pages.id"), nullable=True, index=True
    )
    title = db.Column(db.String(300), nullable=False, default="Untitled")
    icon = db.Column(db.String(16), nullable=True)
    cover_url = db.Column(db.String(512), nullable=True)
    content = db.Column(db.JSON, nullable=False, default=dict)
    is_favorite = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    position = db.Column(db.Integer, default=0, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.deleted_at = utcnow()

    def restore(self) -> None:
        self.is_deleted = False
        self.deleted_at = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "parent_id": self.parent_id,
            "title": self.title,
            "icon": self.icon,
            "cover_url": self.cover_url,
            "content": self.content,
            "is_favorite": self.is_favorite,
            "is_deleted": self.is_deleted,
            "position": self.position,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


Page.parent = db.relationship(
    "Page", remote_side=[Page.id], foreign_keys=[Page.parent_id], backref="children"
)
