# Use the OS trust store (macOS keychain / Windows store / system CAs) for TLS
# verification so the service works behind corporate TLS-inspecting proxies whose
# private root CA is not in certifi's bundle. Must run before any TLS client is created.
import truststore
truststore.inject_into_ssl()

import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from slowapi.errors import RateLimitExceeded
from crewai_service.core.config import settings
from crewai_service.core.database import init_db, async_session
from crewai_service.core.cache import get_redis, close_redis
from crewai_service.core.auth import get_current_user
from crewai_service.core.limiter import limiter
from crewai_service.api.routes import router as research_router
from crewai_service.api.auth_routes import router as auth_router
from crewai_service.core.research import run_deep_research, regenerate_report_only
from crewai_service.models.models import ResearchSession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Deep Research Service...")
    await init_db()
    await get_redis()
    logger.info(f"Database connected: {settings.DATABASE_URL.split('@')[-1]}")
    logger.info(f"Redis connected: {settings.REDIS_URL}")
    logger.info(f"LLM endpoint: {settings.LLM_BASE_URL}")
    yield
    logger.info("Shutting down...")
    await close_redis()


app = FastAPI(
    title="Deep Research Agent",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router)
app.include_router(auth_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "deep-research",
        "version": "2.0.0",
        "llm": settings.LLM_MODEL,
    }


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded", "detail": str(exc.detail)},
    )


@app.post("/research/stream")
@limiter.limit(settings.RATE_LIMIT)
async def research_stream(request: Request, user_id: str = Depends(get_current_user)):
    body = await request.json()
    query = body.get("query", "").strip()
    if not query:
        return JSONResponse({"error": "query is required"}, status_code=400)

    session_id = body.get("sessionId")
    user_answers = body.get("userAnswers", "")
    max_sources = body.get("maxSources", settings.DEFAULT_MAX_SOURCES)
    pages_to_scrape = body.get("pagesToScrape", settings.DEFAULT_PAGES_TO_SCRAPE)
    # Identity comes from the verified token, not the request body.

    async def event_generator():
        db = async_session()
        try:
            # Resuming/continuing an existing session must belong to the caller.
            if session_id:
                existing = await db.get(ResearchSession, session_id)
                if not existing or str(existing.user_id) != str(user_id):
                    yield {"event": "error", "data": json.dumps({"error": "Session not found"})}
                    return
            async for event in run_deep_research(
                query=query,
                user_id=user_id,
                user_answers=user_answers,
                max_sources=max_sources,
                pages_to_scrape=pages_to_scrape,
                db_session=db,
                existing_session_id=session_id,
            ):
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"]),
                }
        finally:
            try:
                await db.commit()
            except Exception:
                await db.rollback()
            await db.close()

    return EventSourceResponse(event_generator())


@app.post("/research/regenerate")
@limiter.limit(settings.RATE_LIMIT)
async def regenerate_report(request: Request, user_id: str = Depends(get_current_user)):
    body = await request.json()
    session_id = body.get("sessionId")
    if not session_id:
        return JSONResponse({"error": "sessionId is required"}, status_code=400)

    async def event_generator():
        db = async_session()
        try:
            # Only the owner may regenerate a report.
            existing = await db.get(ResearchSession, session_id)
            if not existing or str(existing.user_id) != str(user_id):
                yield {"event": "error", "data": json.dumps({"error": "Session not found"})}
                return
            async for event in regenerate_report_only(
                session_id=session_id,
                db_session=db,
            ):
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"]),
                }
        finally:
            try:
                await db.commit()
            except Exception:
                await db.rollback()
            await db.close()

    return EventSourceResponse(event_generator())
