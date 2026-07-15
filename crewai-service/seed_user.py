"""Idempotent seed for the auth user.

Run from the crewai-service directory after Postgres is up and crewai-service/.env
is in place:

    cd crewai-service
    python3 seed_user.py
"""
import asyncio

from sqlalchemy import select

from crewai_service.core.config import settings
from crewai_service.core.database import async_session, init_db
from crewai_service.models.models import User


async def seed():
    await init_db()  # create tables if they don't exist
    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == settings.AUTH_USER_ID))
        user = result.scalar_one_or_none()

        if user:
            # keep the record in sync with the configured credentials
            user.email = settings.AUTH_EMAIL
            user.display_name = settings.AUTH_DISPLAY_NAME
            user.is_active = True
            action = "updated"
        else:
            user = User(
                id=settings.AUTH_USER_ID,
                email=settings.AUTH_EMAIL,
                display_name=settings.AUTH_DISPLAY_NAME,
                is_active=True,
            )
            db.add(user)
            action = "created"

        await db.commit()
        print(f"User {action}: {settings.AUTH_EMAIL} (id={settings.AUTH_USER_ID})")


if __name__ == "__main__":
    asyncio.run(seed())
