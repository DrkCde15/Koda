"""Data-access layer for pages and their revision history."""
from typing import Optional

from extensions import db
from models.page import Page, PageRevision


class PageRepository:
    @staticmethod
    def create(
        workspace_id: int,
        created_by: int,
        title: str,
        parent_id: Optional[int],
        icon: Optional[str],
        cover_url: Optional[str],
    ) -> Page:
        page = Page(
            workspace_id=workspace_id,
            created_by=created_by,
            title=title,
            parent_id=parent_id,
            icon=icon,
            cover_url=cover_url,
        )
        db.session.add(page)
        db.session.commit()
        return page

    @staticmethod
    def get_by_id(page_id: int) -> Optional[Page]:
        return db.session.get(Page, page_id)

    @staticmethod
    def list_by_workspace(
        workspace_id: int,
        include_deleted: bool = False,
        parent_id: Optional[int] = None,
    ) -> list[Page]:
        query = db.session.query(Page).filter(Page.workspace_id == workspace_id)
        if not include_deleted:
            query = query.filter(Page.is_deleted.is_(False))
        if parent_id is not None:
            query = query.filter(Page.parent_id == parent_id)
        else:
            query = query.filter(Page.parent_id.is_(None))
        return query.order_by(Page.position.asc(), Page.id.asc()).all()

    @staticmethod
    def list_favorites(workspace_id: int) -> list[Page]:
        return (
            db.session.query(Page)
            .filter(
                Page.workspace_id == workspace_id,
                Page.is_favorite.is_(True),
                Page.is_deleted.is_(False),
            )
            .all()
        )

    @staticmethod
    def list_trash(workspace_id: int) -> list[Page]:
        return (
            db.session.query(Page)
            .filter(
                Page.workspace_id == workspace_id,
                Page.is_deleted.is_(True),
            )
            .all()
        )

    @staticmethod
    def update(page: Page, title=None, icon=None, cover_url=None, content=None, is_favorite=None) -> Page:
        if title is not None:
            page.title = title
        if icon is not None:
            page.icon = icon
        if cover_url is not None:
            page.cover_url = cover_url
        if content is not None:
            page.content = content
        if is_favorite is not None:
            page.is_favorite = is_favorite
        db.session.commit()
        return page

    @staticmethod
    def soft_delete(page: Page) -> None:
        page.soft_delete()
        db.session.commit()

    @staticmethod
    def restore(page: Page) -> None:
        page.restore()
        db.session.commit()

    @staticmethod
    def create_revision(page: Page, edited_by: int) -> PageRevision:
        revision = PageRevision(
            page_id=page.id,
            title=page.title,
            content=page.content,
            edited_by=edited_by,
        )
        db.session.add(revision)
        db.session.commit()
        return revision

    @staticmethod
    def list_revisions(page_id: int) -> list[PageRevision]:
        return (
            db.session.query(PageRevision)
            .filter(PageRevision.page_id == page_id)
            .order_by(PageRevision.created_at.desc())
            .all()
        )

    @staticmethod
    def get_revision(revision_id: int) -> Optional[PageRevision]:
        return db.session.get(PageRevision, revision_id)
