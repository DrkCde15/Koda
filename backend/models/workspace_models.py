"""Workspace, membership and invitation models."""
from extensions import db
from models.base import PKMixin, TimestampMixin, utcnow
from models.user import Role


class Workspace(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "workspaces"

    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(160), unique=True, nullable=False, index=True)
    icon = db.Column(db.String(16), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    members = db.relationship(
        "WorkspaceMember",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "icon": self.icon,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkspaceMember(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "workspace_members"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id"), nullable=False, index=True
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    role = db.Column(db.String(20), nullable=False, default=Role.VIEWER)

    workspace = db.relationship("Workspace", back_populates="members")
    user = db.relationship("User")

    __table_args__ = (
        db.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Invite(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "invites"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id"), nullable=False, index=True
    )
    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=Role.EDITOR)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    accepted = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    workspace = db.relationship("Workspace")

    def is_expired(self) -> bool:
        return utcnow() > self.expires_at

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "email": self.email,
            "role": self.role,
            "accepted": self.accepted,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
