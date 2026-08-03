"""Marshmallow schemas for databases (input validation)."""
from marshmallow import Schema, ValidationError, fields, validate, post_load

VALID_PROPERTY_TYPES = {"text", "number", "select", "date", "status"}


def _validate_options(options):
    if options is None:
        return
    if not isinstance(options, dict):
        raise ValidationError("options must be an object")
    if "choices" in options:
        if not isinstance(options["choices"], list):
            raise ValidationError("options.choices must be a list")


class PropertyInputSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    type = fields.String(
        required=True, validate=validate.OneOf(sorted(VALID_PROPERTY_TYPES))
    )
    options = fields.Dict(allow_none=True)
    position = fields.Integer()

    @post_load
    def _normalize(self, data, **kwargs):
        _validate_options(data.get("options"))
        return data


class DatabaseCreateSchema(Schema):
    workspace_id = fields.Integer(required=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    icon = fields.String(validate=validate.Length(max=16), allow_none=True)
    properties = fields.List(
        fields.Nested(PropertyInputSchema), missing=list, allow_none=True
    )


class DatabaseUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    icon = fields.String(validate=validate.Length(max=16), allow_none=True)


class PropertyUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    type = fields.String(validate=validate.OneOf(sorted(VALID_PROPERTY_TYPES)))
    options = fields.Dict(allow_none=True)
    position = fields.Integer()

    @post_load
    def _normalize(self, data, **kwargs):
        _validate_options(data.get("options"))
        return data


class ItemValueSchema(Schema):
    property_id = fields.Integer(required=True)
    value = fields.Raw(required=True, allow_none=True)


class ItemCreateSchema(Schema):
    position = fields.Integer()
    values = fields.List(fields.Nested(ItemValueSchema), missing=list, allow_none=True)


class ItemUpdateSchema(Schema):
    position = fields.Integer()
    values = fields.List(fields.Nested(ItemValueSchema), missing=list, allow_none=True)


FILTER_OPERATORS = {
    "contains",
    "equals",
    "not_equals",
    "is_empty",
    "is_not_empty",
    "greater_than",
    "less_than",
    "after",
    "before",
}

SORT_DIRECTIONS = {"asc", "desc"}


class DatabaseFilterSchema(Schema):
    property_id = fields.Integer(required=True)
    operator = fields.String(required=True, validate=validate.OneOf(sorted(FILTER_OPERATORS)))
    value = fields.Raw(allow_none=True)


class DatabaseSortSchema(Schema):
    property_id = fields.Integer(required=True)
    direction = fields.String(validate=validate.OneOf(sorted(SORT_DIRECTIONS)), missing="asc")
