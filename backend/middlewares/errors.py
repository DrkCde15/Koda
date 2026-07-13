"""Global error handlers.

Centralises error formatting so the whole API honours the standard error
envelope regardless of where the failure originates.
"""
from flask import Blueprint, jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

from middlewares.responses import error

errors_bp = Blueprint("errors", __name__)


@errors_bp.app_errorhandler(ValidationError)
def handle_validation_error(err: ValidationError):
    return error("Validation failed", err.messages, 422)


@errors_bp.app_errorhandler(HTTPException)
def handle_http_error(err: HTTPException):
    extra = getattr(err, "errors", None)
    return error(err.description, extra, err.code or 500)


@errors_bp.app_errorhandler(Exception)
def handle_unexpected_error(err: Exception):
    # Avoid leaking internal details in production; log server-side instead.
    return error("Internal server error", None, 500)
