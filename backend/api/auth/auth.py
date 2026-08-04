"""Auth HTTP controllers.

Thin layer: validates input, delegates to AuthService and returns the
standard API envelope. No business logic lives here.
"""
import os
from flask import Blueprint, current_app, request
from flask_jwt_extended import (
    get_jwt,
    get_jwt_identity,
    jwt_required,
    current_user,
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from middlewares.auth import get_current_user
from middlewares.jwt_handlers import revoke_token
from middlewares.responses import error, success
from middlewares.rate_limiter import rate_limit_login, rate_limit_register, rate_limit_password_reset
from schemas.auth_schema import (
    ChangePasswordSchema,
    ForgotPasswordSchema,
    LoginSchema,
    ProfileUpdateSchema,
    RegisterSchema,
    ResetPasswordSchema,
)
from services.auth_service import AuthError, AuthService

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

limiter = Limiter(key_func=get_remote_address)


def init_limiter(app):
    """Initialize the limiter for this blueprint."""
    global limiter
    import extensions
    if not app.config.get("RATELIMIT_STORAGE_URI"):
        app.config["RATELIMIT_STORAGE_URI"] = (
            os.getenv("RATELIMIT_STORAGE_URI", "redis://localhost:6379/1")
            if extensions.redis_client
            else "memory://"
        )
    limiter.init_app(app)


@auth_bp.post("/register")
@limiter.limit(rate_limit_register())
def register():
    data = RegisterSchema().load(request.get_json(force=True, silent=True) or {})
    user, access, refresh = AuthService.register(
        email=data["email"], full_name=data["full_name"], password=data["password"]
    )
    return success(
        "Account created successfully",
        {"user": user.to_dict(), "access_token": access, "refresh_token": refresh},
        201,
    )


@auth_bp.post("/login")
@limiter.limit(rate_limit_login())
def login():
    data = LoginSchema().load(request.get_json(force=True, silent=True) or {})
    user = AuthService.authenticate(data["email"], data["password"])
    if user is None:
        return error("Invalid email or password", None, 401)
    access, refresh = AuthService.issue_tokens(user)
    return success(
        "Logged in successfully",
        {"user": user.to_dict(), "access_token": access, "refresh_token": refresh},
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = get_current_user()
    access, _ = AuthService.issue_tokens(user)
    return success("Token refreshed", {"access_token": access})


@auth_bp.post("/logout")
@jwt_required()
def logout():
    jti = get_jwt().get("jti")
    exp = get_jwt().get("exp")
    if jti and exp:
        import time

        revoke_token(jti, max(int(exp) - int(time.time()), 1))
    refresh_token = (request.get_json(force=True, silent=True) or {}).get("refresh_token")
    if refresh_token:
        try:
            import jwt as pyjwt

            payload = pyjwt.decode(
                refresh_token, algorithms=["HS256"], options={"verify_signature": False}
            )
            r_jti = payload.get("jti")
            r_exp = payload.get("exp")
            if r_jti and r_exp:
                revoke_token(r_jti, max(int(r_exp) - int(time.time()), 1))
        except pyjwt.PyJWTError:
            pass
    return success("Logged out successfully")


@auth_bp.get("/me")
@jwt_required()
def me():
    user = get_current_user()
    return success("Profile retrieved", {"user": user.to_dict()})


@auth_bp.put("/profile")
@jwt_required()
def update_profile():
    user = get_current_user()
    data = ProfileUpdateSchema().load(
        request.get_json(force=True, silent=True) or {}, partial=True
    )
    updated = AuthService.update_profile(
        user, data.get("full_name"), data.get("avatar_url")
    )
    return success("Profile updated", {"user": updated.to_dict()})


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    user = get_current_user()
    data = ChangePasswordSchema().load(request.get_json(force=True, silent=True) or {})
    try:
        AuthService.change_password(user, data["current_password"], data["new_password"])
    except AuthError as exc:
        return error(str(exc), None, 400)
    return success("Password changed successfully")


@auth_bp.post("/forgot-password")
@limiter.limit(rate_limit_password_reset())
def forgot_password():
    data = ForgotPasswordSchema().load(request.get_json(force=True, silent=True) or {})
    token = AuthService.forgot_password(data["email"])
    # The reset link is delivered by e-mail. The raw token is only echoed back
    # in DEBUG builds to ease local testing; production never leaks it.
    payload = None
    if token and current_app.config.get("DEBUG"):
        payload = {"reset_token": token}
    return success("If the email exists, a reset link has been sent", payload)


@auth_bp.post("/reset-password")
@limiter.limit(rate_limit_password_reset())
def reset_password():
    data = ResetPasswordSchema().load(request.get_json(force=True, silent=True) or {})
    try:
        AuthService.reset_password(data["token"], data["new_password"])
    except AuthError as exc:
        return error(str(exc), None, 400)
    return success("Password reset successfully")
