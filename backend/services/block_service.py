"""Block business logic."""
from typing import Optional

from middlewares.permissions import assert_editor, assert_member
from repositories.block_repository import BlockRepository
from repositories.page_repository import PageRepository
from services.exceptions import NotFoundError


class BlockService:
    @staticmethod
    def _page_for_block(user_id: int, block_id: int, require_editor: bool):
        block = BlockRepository.get_by_id(block_id)
        if block is None:
            raise NotFoundError("Block not found")
        page = PageRepository.get_by_id(block.page_id)
        if page is None:
            raise NotFoundError("Page not found")
        if require_editor:
            assert_editor(user_id, page.workspace_id)
        else:
            assert_member(user_id, page.workspace_id)
        return block, page

    @staticmethod
    def create(
        user_id: int,
        page_id: int,
        block_type: str,
        content: Optional[dict],
        parent_block_id: Optional[int],
        position: Optional[int],
    ) -> dict:
        page = PageRepository.get_by_id(page_id)
        if page is None:
            raise NotFoundError("Page not found")
        assert_editor(user_id, page.workspace_id)
        block = BlockRepository.create(
            page_id=page_id,
            block_type=block_type,
            content=content or {},
            parent_block_id=parent_block_id,
            position=position or 0,
        )
        return block.to_dict()

    @staticmethod
    def list_blocks(user_id: int, page_id: int) -> list[dict]:
        page = PageRepository.get_by_id(page_id)
        if page is None:
            raise NotFoundError("Page not found")
        assert_member(user_id, page.workspace_id)
        blocks = BlockRepository.list_by_page(page_id)
        return [b.to_dict() for b in blocks]

    @staticmethod
    def update(
        user_id: int, block_id: int, block_type=None, content=None, position=None
    ) -> dict:
        block, _ = BlockService._page_for_block(user_id, block_id, require_editor=True)
        block = BlockRepository.update(block, block_type, content, position)
        return block.to_dict()

    @staticmethod
    def delete(user_id: int, block_id: int) -> None:
        block, _ = BlockService._page_for_block(user_id, block_id, require_editor=True)
        BlockRepository.delete(block)
