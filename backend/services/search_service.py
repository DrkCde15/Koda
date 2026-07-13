"""Search business logic across pages of a workspace."""
from extensions import db
from middlewares.permissions import assert_member
from models.page import Page
from services.exceptions import NotFoundError


class SearchService:
    @staticmethod
    def search(user_id: int, workspace_id: int, query: str, limit: int = 25) -> list[dict]:
        if workspace_id is None:
            raise NotFoundError("Workspace not found")
        assert_member(user_id, workspace_id)
        if not query:
            return []
        like = f"%{query}%"
        pages = (
            db.session.query(Page)
            .filter(
                Page.workspace_id == workspace_id,
                Page.is_deleted.is_(False),
                db.or_(
                    Page.title.ilike(like),
                    Page.content.cast(db.Text).ilike(like),
                ),
            )
            .order_by(Page.updated_at.desc())
            .limit(limit)
            .all()
        )
        return [p.to_dict() for p in pages]
