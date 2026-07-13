"""Search HTTP controllers."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from services.search_service import SearchService

search_bp = Blueprint("search", __name__, url_prefix="/search")


@search_bp.get("")
@jwt_required()
def search():
    user = get_current_user()
    workspace_id = request.args.get("workspace_id", type=int)
    q = request.args.get("q", "").strip()
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    results = SearchService.search(user.id, workspace_id, q)
    return success("Search completed", results)
