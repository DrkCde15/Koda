"""File business logic: validation, storage and metadata."""
import os
import secrets
from typing import Optional

from flask import current_app
from werkzeug.utils import secure_filename

from middlewares.permissions import assert_member
from repositories.file_repository import FileRepository
from services.exceptions import ServiceError


class FileService:
    ALLOWED_EXTENSIONS = {
        "png", "jpg", "jpeg", "gif", "webp", "pdf",
        "txt", "csv", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip",
    }

    @staticmethod
    def _extension(name: str) -> Optional[str]:
        return name.rsplit(".", 1)[-1].lower() if "." in name else None

    @classmethod
    def upload(cls, user_id: int, workspace_id: int, file_storage) -> dict:
        assert_member(user_id, workspace_id)
        original_name = file_storage.filename or "file"
        ext = cls._extension(original_name)
        if not ext or ext not in cls.ALLOWED_EXTENSIONS:
            raise ServiceError("File type not allowed")
        if file_storage.content_length and file_storage.content_length > current_app.config["MAX_CONTENT_LENGTH"]:
            raise ServiceError("File too large")

        upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], str(workspace_id))
        os.makedirs(upload_dir, exist_ok=True)
        stored_name = f"{secrets.token_hex(16)}.{ext}"
        path = os.path.join(upload_dir, stored_name)
        file_storage.save(path)

        url = f"/api/files/{workspace_id}/{stored_name}"
        record = FileRepository.create(
            workspace_id=workspace_id,
            uploader_id=user_id,
            filename=stored_name,
            original_name=original_name,
            mime_type=file_storage.mimetype or "application/octet-stream",
            size=os.path.getsize(path),
            url=url,
        )
        return record.to_dict()

    @staticmethod
    def list(user_id: int, workspace_id: int) -> list[dict]:
        assert_member(user_id, workspace_id)
        files = FileRepository.list_by_workspace(workspace_id)
        return [f.to_dict() for f in files]

    @staticmethod
    def get_path(workspace_id: int, filename: str) -> str:
        upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], str(workspace_id))
        return os.path.join(upload_dir, secure_filename(filename))

    @staticmethod
    def delete(user_id: int, workspace_id: int, file_id: int) -> None:
        from repositories.file_repository import FileRepository

        assert_member(user_id, workspace_id)
        record = FileRepository.get_by_id(file_id)
        if record is None or record.workspace_id != workspace_id:
            from services.exceptions import NotFoundError

            raise NotFoundError("File not found")
        path = FileService.get_path(workspace_id, record.filename)
        if os.path.exists(path):
            os.remove(path)
        FileRepository.delete(record)
