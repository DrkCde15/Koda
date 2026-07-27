"""Comments and notifications API endpoints."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from services.comment_service import CommentService

comments_bp = Blueprint("comments", __name__)


@comments_bp.post("/pages/<int:page_id>/comments")
@jwt_required()
def create_comment(page_id: int):
    user = get_current_user()
    payload = request.get_json(force=True, silent=True) or {}
    body = (payload.get("body") or "").strip()
    if not body:
        return error("Comment body is required", None, 400)

    result = CommentService.create_comment(user.id, page_id, body, payload.get("mentions") or [])
    return success("Comment created", result, 201)


@comments_bp.get("/pages/<int:page_id>/comments")
@jwt_required()
def list_comments(page_id: int):
    user = get_current_user()
    comments = CommentService.list_comments(user.id, page_id)
    return success("Comments retrieved", comments)


@comments_bp.get("/notifications")
@jwt_required()
def list_notifications():
    user = get_current_user()
    notifications = CommentService.list_notifications(user.id)
    return success("Notifications retrieved", notifications)


@comments_bp.post("/notifications/<int:notification_id>/read")
@jwt_required()
def mark_notification_read(notification_id: int):
    user = get_current_user()
    notification = CommentService.mark_notification_read(user.id, notification_id)
    return success("Notification updated", notification)
