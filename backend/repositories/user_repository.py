"""Data-access layer for users.

Repositories isolate SQLAlchemy queries from business logic so services
stay free of ORM concerns and remain unit-testable.
"""
from typing import Optional

from extensions import db
from models.user import User


class UserRepository:
    @staticmethod
    def get_by_id(user_id: int) -> Optional[User]:
        return db.session.get(User, user_id)

    @staticmethod
    def get_by_email(email: str) -> Optional[User]:
        return db.session.query(User).filter(User.email == email).first()

    @staticmethod
    def email_exists(email: str) -> bool:
        return db.session.query(User.id).filter(User.email == email).first() is not None

    @staticmethod
    def create(email: str, full_name: str, password: str) -> User:
        user = User(email=email, full_name=full_name)
        user.password = password
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def update(user: User) -> User:
        db.session.commit()
        return user

    @staticmethod
    def deactivate(user: User) -> None:
        user.is_active = False
        db.session.commit()
