"""Domain exceptions raised by services and translated to HTTP errors."""
from werkzeug.exceptions import HTTPException


class ServiceError(HTTPException):
    code = 400

    def __init__(self, message: str, errors=None):
        super().__init__(message)
        self.description = message
        self.errors = errors or []


class NotFoundError(ServiceError):
    code = 404


class ForbiddenError(ServiceError):
    code = 403


class ConflictError(ServiceError):
    code = 409
