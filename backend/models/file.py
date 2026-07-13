"""Uploaded file metadata."""
from extensions import db
from models.base import PKMixin, TimestampMixin, utcnow


class File(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "files"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id"), nullable=False, index=True
    )
    uploader_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(128), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    url = db.Column(db.String(512), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "uploader_id": self.uploader_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "mime_type": self.mime_type,
            "size": self.size,
            "url": self.url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
