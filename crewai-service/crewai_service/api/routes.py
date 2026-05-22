import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from openai import AsyncOpenAI
from crewai_service.core.config import settings
from crewai_service.core.database import get_db
from crewai_service.core.research import generate_clarification
from crewai_service.core.tools import cached_tavily_search
from crewai_service.models.models import ResearchSession, AgentStep, SearchResult

router = APIRouter(prefix="/research", tags=["research"])


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
async def get_clarification(request: ResearchStartRequest, db: AsyncSession = Depends(get_db)):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    session = ResearchSession(query=request.query.strip(), user_id=request.userId, status="pending")
    db.add(session)
    await db.flush()

    llm = AsyncOpenAI(base_url=settings.LLM_BASE_URL, api_key=settings.LLM_API_KEY)

    pre_search_results = None
    try:
        search_data = await cached_tavily_search(request.query.strip(), max_results=5)
        pre_search_results = search_data.get("results", [])
    except Exception:
        pass

    result = await generate_clarification(llm, request.query, pre_search_results=pre_search_results)

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


@router.get("/history")
async def get_history(
    userId: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(ResearchSession).options(selectinload(ResearchSession.steps), selectinload(ResearchSession.search_results)).order_by(desc(ResearchSession.created_at))
    if userId:
        query = query.where(ResearchSession.user_id == userId)
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
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    query = select(ResearchSession).options(selectinload(ResearchSession.steps), selectinload(ResearchSession.search_results)).where(ResearchSession.id == session_id)
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
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    return {"deleted": True}


@router.put("/session/{session_id}/notes")
async def update_notes(session_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    session = await db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.notes = body.get("notes", "")
    return {"updated": True}
