"""Marshmallow schemas for blocks (input validation)."""
from marshmallow import Schema, fields, validate

from models.block import BlockType


class BlockCreateSchema(Schema):
    page_id = fields.Integer(required=True)
    type = fields.String(required=True, validate=validate.OneOf(BlockType.values()))
    content = fields.Dict()
    parent_block_id = fields.Integer(allow_none=True)
    position = fields.Integer()


class BlockUpdateSchema(Schema):
    type = fields.String(validate=validate.OneOf(BlockType.values()))
    content = fields.Dict()
    position = fields.Integer()
