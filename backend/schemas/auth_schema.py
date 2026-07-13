"""Marshmallow schemas for auth input validation."""
from marshmallow import Schema, fields, validate, validates, ValidationError

from repositories.user_repository import UserRepository


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    full_name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    password = fields.String(
        required=True, validate=validate.Length(min=8, max=128)
    )

    @validates("email")
    def unique_email(self, value: str, **_):
        if UserRepository.email_exists(value):
            raise ValidationError("Email already registered")


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class RefreshSchema(Schema):
    pass


class ChangePasswordSchema(Schema):
    current_password = fields.String(required=True)
    new_password = fields.String(
        required=True, validate=validate.Length(min=8, max=128)
    )


class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    token = fields.String(required=True)
    new_password = fields.String(
        required=True, validate=validate.Length(min=8, max=128)
    )


class ProfileUpdateSchema(Schema):
    full_name = fields.String(validate=validate.Length(min=1, max=150))
    avatar_url = fields.String(validate=validate.Length(max=512))
