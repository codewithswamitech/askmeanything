import secrets

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from crewai_service.core.config import settings
from crewai_service.core.database import get_db
from crewai_service.core.auth import create_access_token
from crewai_service.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Fail closed if credentials were never configured, so an unset password can
    # never authenticate.
    if not settings.AUTH_PASSWORD or not settings.SECRET_KEY:
        raise HTTPException(status_code=503, detail="Authentication is not configured on the server")

    # Constant-time comparison to avoid leaking the password via timing.
    email_ok = secrets.compare_digest(request.email, settings.AUTH_EMAIL)
    password_ok = secrets.compare_digest(request.password, settings.AUTH_PASSWORD)
    if not (email_ok and password_ok):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    result = await db.execute(select(User).where(User.id == settings.AUTH_USER_ID))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=settings.AUTH_USER_ID,
            email=settings.AUTH_EMAIL,
            display_name=settings.AUTH_DISPLAY_NAME,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.commit()

    token = create_access_token(str(user.id))
    return {
        "token": token,
        "userId": str(user.id),
        "email": user.email,
        "displayName": user.display_name,
    }
