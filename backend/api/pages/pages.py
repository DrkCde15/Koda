"""Page HTTP controllers."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from schemas.page_schema import PageCreateSchema, PageUpdateSchema
from services.page_service import PageService

pages_bp = Blueprint("pages", __name__, url_prefix="/pages")


@pages_bp.post("")
@jwt_required()
def create():
    user = get_current_user()
    data = PageCreateSchema().load(request.get_json(force=True, silent=True) or {})
    page = PageService.create(
        user.id,
        data["workspace_id"],
        data.get("title"),
        data.get("parent_id"),
        data.get("icon"),
        data.get("cover_url"),
        data.get("content"),
    )
    return success("Page created", page, 201)


@pages_bp.get("")
@jwt_required()
def list_pages():
    user = get_current_user()
    workspace_id = request.args.get("workspace_id", type=int)
    parent_id = request.args.get("parent_id", type=int)
    all_pages = request.args.get("all", default=False, type=bool)
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    pages = PageService.list_pages(user.id, workspace_id, parent_id, all_pages)
    return success("Pages retrieved", pages)


@pages_bp.get("/favorites")
@jwt_required()
def favorites():
    user = get_current_user()
    workspace_id = request.args.get("workspace_id", type=int)
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    pages = PageService.list_favorites(user.id, workspace_id)
    return success("Favourite pages retrieved", pages)


@pages_bp.get("/trash")
@jwt_required()
def trash():
    user = get_current_user()
    workspace_id = request.args.get("workspace_id", type=int)
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    pages = PageService.list_trash(user.id, workspace_id)
    return success("Trash retrieved", pages)


@pages_bp.get("/<int:page_id>")
@jwt_required()
def get_page(page_id: int):
    user = get_current_user()
    page = PageService.get(user.id, page_id)
    return success("Page retrieved", page)


@pages_bp.put("/<int:page_id>")
@jwt_required()
def update_page(page_id: int):
    user = get_current_user()
    data = PageUpdateSchema().load(
        request.get_json(force=True, silent=True) or {}, partial=True
    )
    page = PageService.update(
        user.id,
        page_id,
        title=data.get("title"),
        icon=data.get("icon"),
        cover_url=data.get("cover_url"),
        content=data.get("content"),
        is_favorite=data.get("is_favorite"),
    )
    return success("Page updated", page)


@pages_bp.delete("/<int:page_id>")
@jwt_required()
def delete_page(page_id: int):
    user = get_current_user()
    PageService.soft_delete(user.id, page_id)
    return success("Page moved to trash")


@pages_bp.post("/<int:page_id>/restore")
@jwt_required()
def restore_page(page_id: int):
    user = get_current_user()
    page = PageService.restore(user.id, page_id)
    return success("Page restored", page)


@pages_bp.get("/<int:page_id>/history")
@jwt_required()
def history(page_id: int):
    user = get_current_user()
    revisions = PageService.history(user.id, page_id)
    return success("History retrieved", revisions)


@pages_bp.get("/<int:page_id>/history/<int:revision_id>")
@jwt_required()
def get_revision(page_id: int, revision_id: int):
    user = get_current_user()
    revision = PageService.get_revision(user.id, page_id, revision_id)
    return success("Revision retrieved", revision)
