"""User HTTP controllers."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from services.user_service import UserService

users_bp = Blueprint("users", __name__, url_prefix="/users")


@users_bp.get("/search")
@jwt_required()
def search():
    q = request.args.get("q", "").strip()
    users = UserService.search(q)
    return success("Users found", [u.to_dict() for u in users])


@users_bp.get("/<int:user_id>")
@jwt_required()
def get_user(user_id: int):
    user = UserService.get_by_id(user_id)
    if user is None:
        return error("User not found", None, 404)
    return success("User retrieved", user.to_dict())
