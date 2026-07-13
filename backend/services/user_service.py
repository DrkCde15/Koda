"""User query service."""
from extensions import db
from models.user import User


class UserService:
    @staticmethod
    def get_by_id(user_id: int) -> User | None:
        return db.session.get(User, user_id)

    @staticmethod
    def search(query: str, limit: int = 10):
        if not query:
            return []
        like = f"%{query}%"
        return (
            db.session.query(User)
            .filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
            .limit(limit)
            .all()
        )
