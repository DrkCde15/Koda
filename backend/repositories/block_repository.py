"""Data-access layer for blocks."""
from typing import Optional

from extensions import db
from models.block import Block


class BlockRepository:
    @staticmethod
    def create(
        page_id: int,
        block_type: str,
        content: dict,
        parent_block_id: Optional[int],
        position: int,
    ) -> Block:
        block = Block(
            page_id=page_id,
            type=block_type,
            content=content,
            parent_block_id=parent_block_id,
            position=position,
        )
        db.session.add(block)
        db.session.commit()
        return block

    @staticmethod
    def get_by_id(block_id: int) -> Optional[Block]:
        return db.session.get(Block, block_id)

    @staticmethod
    def list_by_page(page_id: int) -> list[Block]:
        return (
            db.session.query(Block)
            .filter(Block.page_id == page_id)
            .order_by(Block.position.asc(), Block.id.asc())
            .all()
        )

    @staticmethod
    def update(block: Block, block_type=None, content=None, position=None) -> Block:
        if block_type is not None:
            block.type = block_type
        if content is not None:
            block.content = content
        if position is not None:
            block.position = position
        db.session.commit()
        return block

    @staticmethod
    def delete(block: Block) -> None:
        db.session.delete(block)
        db.session.commit()
