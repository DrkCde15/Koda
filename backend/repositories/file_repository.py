"""File metadata persistence."""
from typing import Optional

from extensions import db
from models.file import File


class FileRepository:
    @staticmethod
    def create(
        workspace_id: int,
        uploader_id: int,
        filename: str,
        original_name: str,
        mime_type: str,
        size: int,
        url: str,
    ) -> File:
        file = File(
            workspace_id=workspace_id,
            uploader_id=uploader_id,
            filename=filename,
            original_name=original_name,
            mime_type=mime_type,
            size=size,
            url=url,
        )
        db.session.add(file)
        db.session.commit()
        return file

    @staticmethod
    def get_by_id(file_id: int) -> Optional[File]:
        return db.session.get(File, file_id)

    @staticmethod
    def list_by_workspace(workspace_id: int) -> list[File]:
        return (
            db.session.query(File)
            .filter(File.workspace_id == workspace_id)
            .order_by(File.id.desc())
            .all()
        )

    @staticmethod
    def delete(file: File) -> None:
        db.session.delete(file)
        db.session.commit()
