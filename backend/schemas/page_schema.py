"""Marshmallow schemas for pages (input validation)."""
from marshmallow import Schema, fields, validate


class PageCreateSchema(Schema):
    workspace_id = fields.Integer(required=True)
    title = fields.String(validate=validate.Length(max=300))
    parent_id = fields.Integer(allow_none=True)
    icon = fields.String(validate=validate.Length(max=16))
    cover_url = fields.String(validate=validate.Length(max=512))
    content = fields.Dict()


class PageUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(max=300))
    icon = fields.String(validate=validate.Length(max=16))
    cover_url = fields.String(validate=validate.Length(max=512))
    content = fields.Dict()
    is_favorite = fields.Boolean()
