"""Marshmallow schemas for workspaces, members and invites (input validation)."""
from marshmallow import Schema, fields, validate

from models.user import Role


class WorkspaceCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    icon = fields.String(validate=validate.Length(max=16))


class WorkspaceUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    icon = fields.String(validate=validate.Length(max=16))


class InviteCreateSchema(Schema):
    email = fields.Email(required=True)
    role = fields.String(required=True, validate=validate.OneOf(Role.values()))


class MemberUpdateSchema(Schema):
    role = fields.String(required=True, validate=validate.OneOf(Role.values()))
