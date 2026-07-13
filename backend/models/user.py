"""User account model and role definitions."""
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models.base import PKMixin, TimestampMixin


class Role(str):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

    @classmethod
    def values(cls) -> list[str]:
        return [cls.OWNER, cls.ADMIN, cls.EDITOR, cls.VIEWER]


class User(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "users"

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    avatar_url = db.Column(db.String(512), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<User {self.email}>"

    @property
    def password(self) -> None:
        raise AttributeError("password is not a readable attribute")

    @password.setter
    def password(self, plain: str) -> None:
        self.password_hash = generate_password_hash(plain)

    def check_password(self, plain: str) -> bool:
        return check_password_hash(self.password_hash, plain)

    def to_dict(self, include_email: bool = True) -> dict:
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data["email"] = self.email
        return data
