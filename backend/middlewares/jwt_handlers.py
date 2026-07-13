"""JWT token blocklist using Redis for stateless logout / revocation."""
from flask_jwt_extended import get_jwt

from extensions import jwt, redis_client


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload) -> bool:
    jti = jwt_payload.get("jti")
    if not jti:
        return False
    if redis_client is None:
        return False
    return bool(redis_client.exists(f"bl:{jti}"))


def revoke_token(jti: str, expires_in: int) -> None:
    """Add a token's JTI to the Redis blocklist until its natural expiry."""
    if redis_client is None:
        return
    redis_client.setex(f"bl:{jti}", expires_in, "1")
