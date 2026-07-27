"""Authentication business logic.

Owns token issuance, password hashing orchestration and reset-token state.
Repositories handle persistence; this layer enforces rules and workflows.
"""
from typing import Optional, Tuple

import jwt as pyjwt
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

import extensions
from models.user import User
from repositories.user_repository import UserRepository
from services.email_service import send_email

RESET_TTL_SECONDS = 3600


def _reset_secret() -> str:
    """Secret used to sign password-reset tokens.

    Falls back to the app's JWT secret so it is never a public constant.
    """
    return current_app.config.get("RESET_TOKEN_SECRET") or current_app.config["JWT_SECRET_KEY"]


class AuthError(Exception):
    """Domain-level authentication failure."""


class AuthService:
    @staticmethod
    def register(email: str, full_name: str, password: str) -> Tuple[User, str, str]:
        user = UserRepository.create(email=email, full_name=full_name, password=password)
        access = create_access_token(identity=str(user.id))
        refresh = create_refresh_token(identity=str(user.id))
        return user, access, refresh

    @staticmethod
    def authenticate(email: str, password: str) -> Optional[User]:
        user = UserRepository.get_by_email(email)
        if user is None or not user.is_active:
            return None
        if not user.check_password(password):
            return None
        return user

    @staticmethod
    def issue_tokens(user: User) -> Tuple[str, str]:
        return (
            create_access_token(identity=str(user.id)),
            create_refresh_token(identity=str(user.id)),
        )

    @staticmethod
    def change_password(user: User, current_password: str, new_password: str) -> None:
        if not user.check_password(current_password):
            raise AuthError("Current password is incorrect")
        user.password = new_password
        UserRepository.update(user)

    @staticmethod
    def forgot_password(email: str) -> Optional[str]:
        user = UserRepository.get_by_email(email)
        if user is None:
            return None
        token = pyjwt.encode(
            {"sub": str(user.id), "purpose": "reset"},
            _reset_secret(),  # short-lived, stored in Redis by id
            algorithm="HS256",
        )
        if extensions.redis_client is not None:
            extensions.redis_client.setex(f"reset:{token}", RESET_TTL_SECONDS, str(user.id))
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost")
        reset_link = f"{frontend_url.rstrip('/')}/reset-password?token={token}"
        send_email(
            to=user.email,
            subject="Redefinir sua senha no Koda",
            html=(
                f"<p>Olá, {user.full_name or 'usuário'},</p>"
                f"<p>Recebemos uma solicitação para redefinir sua senha. "
                f"Clique no link abaixo (válido por 1 hora):</p>"
                f'<p><a href="{reset_link}">{reset_link}</a></p>'
                f"<p>Se não foi você, ignore este email.</p>"
            ),
            text=f"Redefina sua senha: {reset_link}",
        )
        return token

    @staticmethod
    def reset_password(token: str, new_password: str) -> None:
        if extensions.redis_client is not None:
            user_id = extensions.redis_client.get(f"reset:{token}")
            if user_id is None:
                raise AuthError("Invalid or expired reset token")
        else:
            user_id = None
        try:
            payload = pyjwt.decode(token, _reset_secret(), algorithms=["HS256"])
        except pyjwt.PyJWTError as exc:
            raise AuthError("Invalid reset token") from exc
        if payload.get("purpose") != "reset":
            raise AuthError("Invalid reset token")
        user_id = user_id or payload.get("sub")
        user = UserRepository.get_by_id(int(user_id))
        if user is None:
            raise AuthError("User not found")
        user.password = new_password
        UserRepository.update(user)
        if extensions.redis_client is not None:
            extensions.redis_client.delete(f"reset:{token}")

    @staticmethod
    def update_profile(user: User, full_name: Optional[str], avatar_url: Optional[str]) -> User:
        if full_name is not None:
            user.full_name = full_name
        if avatar_url is not None:
            user.avatar_url = avatar_url
        return UserRepository.update(user)
