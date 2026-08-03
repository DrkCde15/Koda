"""Page business logic including favourites, trash and history."""
from typing import Optional

from extensions import db
from middlewares.permissions import assert_editor, assert_member
from repositories.page_repository import PageRepository
from services.exceptions import NotFoundError


class PageService:
    @staticmethod
    def create(
        user_id: int,
        workspace_id: int,
        title: Optional[str],
        parent_id: Optional[int],
        icon: Optional[str],
        cover_url: Optional[str],
        content: Optional[dict],
    ) -> dict:
        assert_member(user_id, workspace_id)
        page = PageRepository.create(
            workspace_id=workspace_id,
            created_by=user_id,
            title=title or "Untitled",
            parent_id=parent_id,
            icon=icon,
            cover_url=cover_url,
        )
        if content is not None:
            page.content = content
            db.session.commit()
        return page.to_dict()

    @staticmethod
    def _get(user_id: int, page_id: int) -> dict:
        page = PageRepository.get_by_id(page_id)
        if page is None or page.is_deleted:
            raise NotFoundError("Page not found")
        assert_member(user_id, page.workspace_id)
        return page

    @staticmethod
    def get(user_id: int, page_id: int) -> dict:
        page = PageService._get(user_id, page_id)
        return page.to_dict()

    @staticmethod
    def list_pages(
        user_id: int,
        workspace_id: int,
        parent_id: Optional[int],
        all_pages: bool = False,
    ) -> list[dict]:
        assert_member(user_id, workspace_id)
        pages = PageRepository.list_by_workspace(
            workspace_id, parent_id=parent_id, all_pages=all_pages
        )
        return [p.to_dict() for p in pages]

    @staticmethod
    def list_favorites(user_id: int, workspace_id: int) -> list[dict]:
        assert_member(user_id, workspace_id)
        pages = PageRepository.list_favorites(workspace_id)
        return [p.to_dict() for p in pages]

    @staticmethod
    def list_trash(user_id: int, workspace_id: int) -> list[dict]:
        assert_member(user_id, workspace_id)
        pages = PageRepository.list_trash(workspace_id)
        return [p.to_dict() for p in pages]

    @staticmethod
    def update(
        user_id: int,
        page_id: int,
        title=None,
        icon=None,
        cover_url=None,
        content=None,
        is_favorite=None,
    ) -> dict:
        page = PageService._get(user_id, page_id)
        assert_editor(user_id, page.workspace_id)
        changed = title is not None or content is not None
        page = PageRepository.update(
            page,
            title=title,
            icon=icon,
            cover_url=cover_url,
            content=content,
            is_favorite=is_favorite,
        )
        if changed:
            PageRepository.create_revision(page, edited_by=user_id)
        return page.to_dict()

    @staticmethod
    def soft_delete(user_id: int, page_id: int) -> None:
        page = PageService._get(user_id, page_id)
        assert_editor(user_id, page.workspace_id)
        PageRepository.soft_delete(page)

    @staticmethod
    def restore(user_id: int, page_id: int) -> dict:
        page = PageRepository.get_by_id(page_id)
        if page is None:
            raise NotFoundError("Page not found")
        assert_editor(user_id, page.workspace_id)
        PageRepository.restore(page)
        return page.to_dict()

    @staticmethod
    def history(user_id: int, page_id: int) -> list[dict]:
        page = PageService._get(user_id, page_id)
        revisions = PageRepository.list_revisions(page.id)
        return [r.to_dict() for r in revisions]

    @staticmethod
    def get_revision(user_id: int, page_id: int, revision_id: int) -> dict:
        PageService._get(user_id, page_id)
        revision = PageRepository.get_revision(revision_id)
        if revision is None or revision.page_id != page_id:
            raise NotFoundError("Revision not found")
        return revision.to_dict()
