"""Authentication helpers built on top of Flask-JWT-Extended."""
from flask_jwt_extended import get_jwt_identity

from models.user import User
from extensions import db


def get_current_user() -> User:
    """Resolve the authenticated user from the JWT identity.

    Returns the ORM user or raises a LookupError when the account no longer
    exists (e.g. deleted after token issuance).
    """
    identity = get_jwt_identity()
    user = db.session.get(User, int(identity))
    if user is None or not user.is_active:
        raise LookupError("User not found")
    return user
