import asyncio
from crewai_service.core.database import async_session, init_db
from sqlalchemy import text

async def run():
    try:
        await init_db()
        async with async_session() as db:
            result = await db.execute(text("SELECT * FROM research_sessions ORDER BY created_at DESC LIMIT 5"))
            for row in result.mappings():
                print(dict(row))
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(run())
