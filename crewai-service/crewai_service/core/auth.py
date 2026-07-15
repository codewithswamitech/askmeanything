"""Token-based authentication.

Login issues a short-lived JWT signed with settings.SECRET_KEY. Every protected
endpoint depends on `get_current_user`, which verifies the bearer token and
returns the authenticated user id. There is no default signing key: if
SECRET_KEY is unset the service refuses to mint or accept tokens (fails closed).
"""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from crewai_service.core.config import settings

ALGORITHM = "HS256"

_bearer = HTTPBearer(auto_error=False)


def _require_secret() -> str:
    if not settings.SECRET_KEY:
        # Misconfiguration, not a client error.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth is not configured (SECRET_KEY unset).",
        )
    return settings.SECRET_KEY


def create_access_token(user_id: str) -> str:
    secret = _require_secret()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Return the authenticated user id, or raise 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or not credentials.credentials:
        raise unauthorized

    secret = _require_secret()
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=[ALGORITHM])
    except JWTError:
        raise unauthorized

    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized
    return user_id
