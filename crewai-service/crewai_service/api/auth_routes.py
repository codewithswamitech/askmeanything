from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from crewai_service.core.config import settings
from crewai_service.core.database import get_db
from crewai_service.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    if request.email != settings.AUTH_EMAIL or request.password != settings.AUTH_PASSWORD:
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

    return {
        "userId": str(user.id),
        "email": user.email,
        "displayName": user.display_name,
    }
