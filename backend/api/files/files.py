"""File HTTP controllers."""
import os

from flask import Blueprint, current_app, request, send_file
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from services.exceptions import NotFoundError, ServiceError
from services.file_service import FileService

files_bp = Blueprint("files", __name__, url_prefix="/files")


@files_bp.post("/upload")
@jwt_required()
def upload():
    user = get_current_user()
    workspace_id = request.form.get("workspace_id", type=int)
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    if "file" not in request.files:
        return error("No file provided", None, 400)
    try:
        record = FileService.upload(user.id, workspace_id, request.files["file"])
    except ServiceError as exc:
        return error(str(exc), None, 400)
    return success("File uploaded", record, 201)


@files_bp.get("")
@jwt_required()
def list_files():
    user = get_current_user()
    workspace_id = request.args.get("workspace_id", type=int)
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    files = FileService.list(user.id, workspace_id)
    return success("Files retrieved", files)


@files_bp.get("/<int:workspace_id>/<path:filename>")
@jwt_required()
def download(workspace_id: int, filename: str):
    user = get_current_user()
    try:
        FileService.list(user.id, workspace_id)
    except ServiceError:
        return error("Access denied", None, 403)
    path = FileService.get_path(workspace_id, filename)
    if not os.path.exists(path):
        return error("File not found", None, 404)
    response = send_file(path)
    response.headers["X-Content-Type-Options"] = "nosniff"
    if filename.lower().endswith(".svg"):
        response.headers["Content-Disposition"] = "attachment"
    return response


@files_bp.delete("/<int:file_id>")
@jwt_required()
def delete_file(file_id: int):
    user = get_current_user()
    workspace_id = request.args.get("workspace_id", type=int)
    if not workspace_id:
        return error("workspace_id is required", None, 400)
    try:
        FileService.delete(user.id, workspace_id, file_id)
    except NotFoundError as exc:
        return error(str(exc), None, 404)
    return success("File deleted")
