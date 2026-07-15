import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from openai import AsyncOpenAI
from crewai_service.core.config import settings
from crewai_service.core.database import get_db
from crewai_service.core.auth import get_current_user
from crewai_service.core.limiter import limiter
from crewai_service.core.llm import get_async_llm
from crewai_service.core.research import generate_clarification
from crewai_service.core.tools import cached_tavily_search
from crewai_service.models.models import ResearchSession, AgentStep, SearchResult

router = APIRouter(prefix="/research", tags=["research"])


async def _owned_session(session_id: str, user_id: str, db: AsyncSession) -> ResearchSession:
    """Load a session and verify it belongs to the caller, else 404.

    Returns 404 (not 403) on an ownership mismatch so callers can't probe which
    session IDs exist.
    """
    session = await db.get(ResearchSession, session_id)
    if not session or str(session.user_id) != str(user_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return session


class ResearchStartRequest(BaseModel):
    query: str
    maxSources: int = 10
    pagesToScrape: int = 8
    userId: Optional[str] = None


class ResearchContinueRequest(BaseModel):
    query: str
    sessionId: str
    userAnswers: str
    maxSources: int = 10
    pagesToScrape: int = 8
    userId: Optional[str] = None


class SummarizeRequest(BaseModel):
    sessionId: Optional[str] = None
    report: Optional[str] = None


class HistoryItem(BaseModel):
    id: str
    query: str
    status: str
    summary: Optional[str]
    report: Optional[str]
    stepCount: int
    resultCount: int
    createdAt: str


@router.post("/clarify")
@limiter.limit(settings.RATE_LIMIT)
async def get_clarification(
    request: Request,
    body: ResearchStartRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Ownership is derived from the authenticated token, never from the request body.
    session = ResearchSession(query=body.query.strip(), user_id=user_id, status="pending")
    db.add(session)
    await db.flush()

    llm = get_async_llm()

    pre_search_results = None
    try:
        search_data = await cached_tavily_search(body.query.strip(), max_results=5)
        pre_search_results = search_data.get("results", [])
    except Exception:
        pass

    result = await generate_clarification(llm, body.query, pre_search_results=pre_search_results)

    if result.get("needs_clarification") and result.get("questions"):
        return {
            "sessionId": str(session.id),
            "needsClarification": True,
            "questions": result["questions"],
            "complexity": result.get("complexity", "moderate"),
            "summary": result.get("summary", ""),
        }

    return {
        "sessionId": str(session.id),
        "needsClarification": False,
        "complexity": result.get("complexity", "moderate"),
        "summary": result.get("summary", ""),
    }


@router.post("/summarize")
@limiter.limit(settings.RATE_LIMIT)
async def summarize_report(
    request: Request,
    body: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Generate a concise executive summary of a completed report.

    Accepts either an explicit `report` body or a `sessionId` to look the
    report up. Stateless — the caller caches the result; we intentionally do
    not overwrite the session's `summary` field, which is used as the short
    history preview elsewhere.
    """
    report = (body.report or "").strip()
    session = None

    if body.sessionId:
        session = await _owned_session(body.sessionId, user_id, db)
        if not report:
            report = (session.report or "").strip()

    if not report:
        raise HTTPException(status_code=400, detail="No report available to summarize")

    prompt = (
        "Summarize the following research report into a concise executive summary "
        "for a busy reader. Use markdown with this structure:\n"
        "- A one-paragraph **TL;DR** (2-4 sentences).\n"
        "- A `## Key Takeaways` section with 4-7 bullet points capturing the most "
        "important findings, figures, and conclusions.\n"
        "Be faithful to the report — do not invent facts or add new citations. "
        "Keep it under ~250 words.\n\n"
        f"--- REPORT ---\n{report}"
    )

    llm = get_async_llm()
    try:
        response = await llm.chat.completions.create(
            model=settings.chat_model,
            messages=[
                {"role": "assistant", "content": "You are a precise research editor who writes tight executive summaries."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        summary = (response.choices[0].message.content or "").strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Summary generation failed: {e}")

    return {"summary": summary}


@router.get("/history")
async def get_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    # Bound pagination and scope strictly to the authenticated user.
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    query = (
        select(ResearchSession)
        .options(selectinload(ResearchSession.steps), selectinload(ResearchSession.search_results))
        .where(ResearchSession.user_id == user_id)
        .order_by(desc(ResearchSession.created_at))
    )
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        step_count = len(s.steps) if s.steps else 0
        result_count = len(s.search_results) if s.search_results else 0
        items.append(HistoryItem(
            id=str(s.id),
            query=s.query,
            status=s.status,
            summary=s.summary,
            report=s.report,
            stepCount=step_count,
            resultCount=result_count,
            createdAt=s.created_at.isoformat() if s.created_at else "",
        ))

    return {"items": items, "total": len(items)}


@router.get("/session/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    query = (
        select(ResearchSession)
        .options(selectinload(ResearchSession.steps), selectinload(ResearchSession.search_results))
        .where(ResearchSession.id == session_id, ResearchSession.user_id == user_id)
    )
    result = await db.execute(query)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    steps = []
    for step in (session.steps or []):
        steps.append({
            "id": str(step.id),
            "stepType": step.step_type,
            "stepLabel": step.step_label,
            "status": step.status,
            "content": step.content,
            "metadata": step.metadata_json,
            "order": step.order,
        })

    results = []
    for r in (session.search_results or []):
        results.append({
            "id": str(r.id),
            "url": r.url,
            "title": r.title,
            "snippet": r.snippet,
            "hostName": r.host_name,
            "scraped": r.scraped,
        })

    return {
        "session": {
            "id": str(session.id),
            "query": session.query,
            "status": session.status,
            "summary": session.summary,
            "report": session.report,
            "notes": session.notes,
            "createdAt": session.created_at.isoformat() if session.created_at else "",
            "updatedAt": session.updated_at.isoformat() if session.updated_at else "",
        },
        "steps": steps,
        "results": results,
    }


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    session = await _owned_session(session_id, user_id, db)
    await db.delete(session)
    return {"deleted": True}


@router.put("/session/{session_id}/notes")
async def update_notes(
    session_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    session = await _owned_session(session_id, user_id, db)
    session.notes = body.get("notes", "")
    return {"updated": True}
