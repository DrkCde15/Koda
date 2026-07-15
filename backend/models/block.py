"""Block model.

Prepares the data structure required by the future rich-text / block editor.
A page is composed of an ordered list of blocks; blocks may be nested to
support structured documents without coupling the API to any editor library.
"""
from extensions import db
from models.base import PKMixin, TimestampMixin, utcnow


class BlockType:
    PARAGRAPH = "paragraph"
    HEADING_1 = "heading_1"
    HEADING_2 = "heading_2"
    HEADING_3 = "heading_3"
    BULLET_LIST = "bullet_list"
    NUMBERED_LIST = "numbered_list"
    QUOTE = "quote"
    CODE = "code"
    DIVIDER = "divider"
    IMAGE = "image"
    CALLOUT = "callout"
    SUBPAGE = "subpage"
    DATABASE = "database"
    FILE = "file"

    @classmethod
    def values(cls) -> list[str]:
        return [
            cls.PARAGRAPH,
            cls.HEADING_1,
            cls.HEADING_2,
            cls.HEADING_3,
            cls.BULLET_LIST,
            cls.NUMBERED_LIST,
            cls.QUOTE,
            cls.CODE,
            cls.DIVIDER,
            cls.IMAGE,
            cls.CALLOUT,
            cls.SUBPAGE,
            cls.DATABASE,
            cls.FILE,
        ]


class Block(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "blocks"

    page_id = db.Column(
        db.Integer, db.ForeignKey("pages.id"), nullable=False, index=True
    )
    parent_block_id = db.Column(
        db.Integer, db.ForeignKey("blocks.id"), nullable=True, index=True
    )
    type = db.Column(db.String(32), nullable=False, default=BlockType.PARAGRAPH)
    content = db.Column(db.JSON, nullable=False, default=dict)
    position = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "page_id": self.page_id,
            "parent_block_id": self.parent_block_id,
            "type": self.type,
            "content": self.content,
            "position": self.position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


Block.children = db.relationship(
    "Block",
    backref=db.backref(
        "parent_block", remote_side=[Block.id], foreign_keys=[Block.parent_block_id]
    ),
)
