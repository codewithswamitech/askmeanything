import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime
from urllib.parse import urlparse
from openai import AsyncOpenAI
from crewai_service.core.llm import get_async_llm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from crewai_service.core.config import settings
from crewai_service.core.cache import get_redis
from crewai_service.core.tools import cached_tavily_search, batch_scrape
from crewai_service.agents.crew import create_research_crew
from crewai_service.models.models import ResearchSession, AgentStep, SearchResult

logger = logging.getLogger(__name__)

CLARIFICATION_PROMPT = """You are a research query analyzer. Your #1 job is to detect AMBIGUITY and ask the user clarifying questions BEFORE we waste time searching.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "brief analysis of the query",
  "complexity": "simple|moderate|complex",
  "needs_clarification": true/false,
  "questions": [
    {
      "id": "unique_id",
      "question": "the question to ask the user",
      "type": "single_select|multi_select|text",
      "options": ["option1", "option2"]
    }
  ]
}

CRITICAL RULES — BE AGGRESSIVE ABOUT ASKING QUESTIONS:
1. **ANY person name query** → ALWAYS ask for clarification. Even if the query mentions a company, the name could belong to multiple people.
   - Example: "Omkar Shinde AI engineer Digikore" → Ask "Which Omkar Shinde are you looking for?" with the different profiles found as options.
   - Example: "John Smith from Google" → Ask "Which John Smith at Google?" because there could be hundreds.
2. **ANY product/company name with common words** → Ask to disambiguate.
3. **ANY acronym or abbreviation** → Ask what it stands for or which industry.
4. **When pre_search_results are provided**:
   - If results show DIFFERENT people/companies/products with the same or similar names → ALWAYS set needs_clarification to true
   - Use the pre_search_results to BUILD the clarification options. List the distinct profiles/entities found as selectable options.
   - If a person appears in multiple industries, list each industry variant as an option.
5. Set needs_clarification to false ONLY when the query is:
   - A unique, well-known entity (e.g., "Elon Musk CEO of Tesla", "Apple iPhone 15")
   - A specific event with date and location
   - A technical concept or scientific term
   - So specific that NO ambiguity exists

QUESTION DESIGN:
- Ask 1-3 questions maximum
- Use single_select for "which person/company" disambiguation
- Use multi_select for "which aspects to focus on"
- Use text for "tell me more about what you need"
- ALWAYS include an "Other (please specify)" option for single_select questions
- Make questions specific using data from pre_search_results when available"""


async def generate_clarification(
    llm: AsyncOpenAI,
    query: str,
    pre_search_results: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    user_content = f"Analyze this research query: {query}"

    if pre_search_results:
        results_summary = "\n".join([
            f"- [{r.get('title', 'Untitled')}] {r.get('url', '')} — {(r.get('snippet', '') or '')[:200]}"
            for r in pre_search_results[:10]
        ])
        user_content += f"\n\nPRE-SEARCH RESULTS (top results from a quick web search):\n{results_summary}\n\nUse these results to detect if multiple different people/companies share the same name. If you see different entities, ask the user to disambiguate."

    response = await llm.chat.completions.create(
        model=settings.chat_model,
        messages=[
            {"role": "assistant", "content": CLARIFICATION_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "summary": raw,
            "complexity": "moderate",
            "needs_clarification": False,
            "questions": [],
        }


async def run_deep_research(
    query: str,
    user_id: Optional[str] = None,
    user_answers: str = "",
    max_sources: int = 10,
    pages_to_scrape: int = 8,
    max_rounds: int = 3,
    db_session=None,
    existing_session_id: Optional[str] = None,
) -> AsyncGenerator[Dict[str, Any], None]:

    session_id = existing_session_id
    if db_session and not session_id:
        session = ResearchSession(
            query=query,
            user_id=user_id,
            status="running",
            user_answers=user_answers or None,
        )
        db_session.add(session)
        await db_session.flush()
        session_id = str(session.id)

    if db_session and session_id and existing_session_id:
        session_obj = await db_session.get(ResearchSession, session_id)
        if session_obj:
            session_obj.status = "running"
            session_obj.user_answers = user_answers or None
            await db_session.flush()

    yield {"event": "session_created", "data": {"sessionId": session_id, "query": query}}

    llm = get_async_llm(timeout=60.0)

    context = query
    if user_answers:
        context += f"\n\nUser clarifications:\n{user_answers}"

    # ── Phase 0: Clarification Check ──
    if not user_answers:
        yield {"event": "step_update", "data": {"stepType": "understand", "status": "running", "content": "Analyzing query for ambiguity..."}}
        
        clarification = None
        pre_search_results = []
        
        # 1. Quick pre-search to detect ambiguity
        try:
            search_data = await cached_tavily_search(query, max_results=8)
            pre_search_results = search_data.get("results", [])
        except Exception as se:
            logger.warning(f"Pre-search failed: {se}")

        # 2. Heuristic: If we find multiple LinkedIn profiles or diverse professional links, FORCE clarification
        profile_links = [r for r in pre_search_results if "linkedin.com/in/" in r.get("url", "") or "linkedin.com/pub/" in r.get("url", "")]
        
        # If we found multiple different people on LinkedIn, we don't even need the LLM to tell us it's ambiguous
        if len(profile_links) > 1:
            options = []
            for r in profile_links:
                title = r.get("title", "").replace(" | LinkedIn", "").replace(" - LinkedIn", "")
                options.append(f"{title} ({r.get('url')})")
            options.append("Other (please specify)")
            
            yield {"event": "clarification_required", "data": {
                "sessionId": session_id,
                "summary": f"I found {len(profile_links)} different LinkedIn profiles for '{query}'. Please specify which one you are interested in.",
                "questions": [{
                    "id": "person_disambiguation",
                    "question": "I found multiple people with this name. Which one are you looking for?",
                    "type": "single_select",
                    "options": options[:6]
                }],
                "complexity": "moderate",
            }}
            return

        # 3. LLM-based clarification with retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                clarification = await generate_clarification(llm, query, pre_search_results=pre_search_results)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Clarification attempt {attempt+1} failed: {e}. Retrying...")
                    await asyncio.sleep(2)
                else:
                    logger.error(f"Clarification failed after {max_retries} attempts: {e}")
                    # CRITICAL CHANGE: If clarification fails due to connection, DO NOT proceed if it looks like a person search
                    if any(word in query.lower() for word in ["who is", "search on", "about", "engineer", "developer", "manager"]):
                        yield {"event": "error", "data": {"message": "Clarification failed due to a connection error. Please try again in a few moments."}}
                        return
        
        if clarification and clarification.get("needs_clarification") and clarification.get("questions"):
            if db_session and session_id:
                session_obj = await db_session.get(ResearchSession, session_id)
                if session_obj:
                    session_obj.status = "pending"
                    session_obj.summary = clarification.get("summary", "")
                    await db_session.flush()
            yield {"event": "clarification_required", "data": {
                "sessionId": session_id,
                "summary": clarification.get("summary", ""),
                "questions": clarification["questions"],
                "complexity": clarification.get("complexity", "moderate"),
            }}
            return

    # ── Phase 1: Plan ──
    yield {"event": "step_update", "data": {"stepType": "understand", "status": "running", "content": "Parsing intent & scope..."}}
    yield {"event": "step_update", "data": {"stepType": "understand", "status": "completed", "content": "Intent parsed."}}
    
    yield {"event": "step_update", "data": {"stepType": "plan", "status": "running", "content": "Creating research strategy..."}}

    plan_data = {}
    try:
        crew = create_research_crew(query, user_answers)
        plan_result = crew.tasks[0].execute_sync()
        plan_text = plan_result if isinstance(plan_result, str) else str(plan_result)
        clean = plan_text.replace("```json", "").replace("```", "").strip()
        plan_data = json.loads(clean)
    except Exception as e:
        logger.warning(f"Plan generation failed: {e}")
        plan_data = {"search_queries": [query, f"{query} overview", f"{query} latest research"]}

    search_queries = plan_data.get("search_queries", [query])
    yield {"event": "step_update", "data": {"stepType": "plan", "status": "completed", "content": f"Strategy created: {len(search_queries)} queries planned."}}

    # ── Phase 2: Iterative Search + Scrape + Gap Analysis ──
    all_results = []
    seen_urls = set()
    scraped_pages = []

    for round_num in range(1, max_rounds + 1):
        yield {"event": "step_update", "data": {
            "stepType": "search",
            "status": "running",
            "content": f"Search round {round_num}/{max_rounds}: executing queries...",
        }}

        round_queries = search_queries if round_num == 1 else search_queries[:4]

        for i, sq in enumerate(round_queries):
            yield {"event": "step_update", "data": {
                "stepType": "search",
                "status": "running",
                "content": f"Round {round_num}: \"{sq}\" ({i+1}/{len(round_queries)})",
            }}
            try:
                search_data = await cached_tavily_search(sq, max_results=max_sources)
                for r in search_data.get("results", []):
                    url = r.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        r["_search_query"] = sq
                        all_results.append(r)
                        parsed = urlparse(url)
                        yield {"event": "search_result", "data": {
                            "url": url,
                            "title": r.get("title", ""),
                            "snippet": (r.get("snippet", "") or "")[:300],
                            "hostName": parsed.hostname or "",
                        }}
                        if db_session:
                            sr = SearchResult(
                                session_id=session_id,
                                url=url,
                                title=r.get("title", ""),
                                snippet=(r.get("snippet", "") or "")[:1000],
                                host_name=parsed.hostname or "",
                                search_query=sq,
                            )
                            db_session.add(sr)
            except Exception as e:
                logger.warning(f"Search failed for '{sq}': {e}")

        yield {"event": "step_update", "data": {
            "stepType": "search",
            "status": "completed",
            "content": f"Round {round_num} complete: {len(all_results)} total results.",
        }}

        # ── Scrape top pages ──
        if round_num == 1:
            yield {"event": "step_update", "data": {
                "stepType": "scrape",
                "status": "running",
                "content": f"Scraping top {pages_to_scrape} pages...",
            }}
            urls = [r["url"] for r in all_results[:pages_to_scrape]]
            scrape_results = await batch_scrape(urls, concurrency=5)
            for i, sr in enumerate(scrape_results):
                if sr.get("success") and sr.get("content"):
                    scraped_pages.append(sr)
                    yield {"event": "scrape_result", "data": {
                        "url": sr["url"],
                        "title": sr["url"],
                        "content": sr["content"][:500],
                    }}
                yield {"event": "step_update", "data": {
                    "stepType": "scrape",
                    "status": "running",
                    "content": f"Read {i+1}/{len(urls)} pages...",
                }}
            yield {"event": "step_update", "data": {
                "stepType": "scrape",
                "status": "completed",
                "content": f"Scraped {len(scraped_pages)} pages.",
            }}

        # ── Gap Analysis (except last round) ──
        if round_num < max_rounds and scraped_pages:
            yield {"event": "step_update", "data": {
                "stepType": "validate",
                "status": "running",
                "content": "Analyzing completeness, checking for gaps...",
            }}

            source_list = "\n".join([
                f"[{i+1}] {r.get('title', '')} - {(r.get('snippet', '') or '')[:200]}"
                for i, r in enumerate(all_results)
            ])

            gap_prompt = f"""Original query: {context}

Sources found ({len(all_results)}):
{source_list[:3000]}

Scraped content summary ({len(scraped_pages)} pages):
""" + "\n".join([f"- {p['url']}: {p['content'][:500]}" for p in scraped_pages]) + """

Are there significant gaps in this research? What additional searches would fill them?
Respond with ONLY a JSON array of additional search queries. If research is sufficient, respond with: []"""

            try:
                gap_response = await llm.chat.completions.create(
                    model=settings.chat_model,
                    messages=[
                        {"role": "assistant", "content": "You are a research gap analyst. Respond only with JSON arrays."},
                        {"role": "user", "content": gap_prompt},
                    ],
                    temperature=0.2,
                )
                gap_text = gap_response.choices[0].message.content or "[]"
                gap_clean = gap_text.replace("```json", "").replace("```", "").strip()
                additional_queries = json.loads(gap_clean)
                if isinstance(additional_queries, list) and len(additional_queries) > 0:
                    search_queries = additional_queries
                    yield {"event": "step_update", "data": {
                        "stepType": "validate",
                        "status": "completed",
                        "content": f"Gaps found: {len(additional_queries)} more queries needed.",
                    }}
                    continue
            except Exception as e:
                logger.warning(f"Gap analysis failed: {e}")

        yield {"event": "step_update", "data": {
            "stepType": "validate",
            "status": "completed",
            "content": "Research validated. Generating report...",
        }}
        break

    # ── Phase 3: Generate Report ──
    yield {"event": "step_update", "data": {
        "stepType": "respond",
        "status": "running",
        "content": "CrewAI agents generating comprehensive report...",
    }}

    source_list = "\n".join([
        f"{i+1}. [{r.get('title', 'Untitled')}]({r.get('url', '')}) — {(r.get('snippet', '') or '')[:300]}"
        for i, r in enumerate(all_results)
    ])

    scraped_content = "\n\n---\n\n".join([
        f"### Source: {p['url']}\n{p['content'][:8000]}"
        for p in scraped_pages
    ])

    report_prompt = f"""# Research Report Request

## Query
{context}

## Sources ({len(all_results)} found)
{source_list or "No sources available."}

## Scraped Content ({len(scraped_pages)} pages)
{scraped_content or "No scraped content available."}

## Instructions
You are a senior research analyst. Write a comprehensive, publication-quality markdown research report.

### CRITICAL SOURCE RELIABILITY RULES:
1. **NEVER fabricate information** — If a source does not contain specific data (e.g., education details, exact dates), DO NOT include it. State "Not verified" or omit it entirely.
2. **Prioritize authoritative sources** — LinkedIn profiles, official company websites, government databases, reputable news outlets (Reuters, Bloomberg, Forbes), and academic publications are HIGH reliability. Personal blogs, forums, and unverified social media are LOW reliability.
3. **Cross-reference everything** — If two sources contradict each other, cite BOTH and note the discrepancy. Never silently pick one version over another.
4. **Distinguish facts from claims** — Use language like "According to [source]", "Reportedly", "As stated on [source]" rather than stating uncertain information as fact.
5. **Mark confidence levels** — After each major section, add a brief confidence note:
   - ✅ High confidence: Verified by 2+ authoritative sources
   - ⚠️ Medium confidence: Found in one source, not cross-verified
   - ❌ Low confidence: Unverified, conflicting, or from low-reliability sources
6. **For person profiles specifically** — Career history from LinkedIn is generally reliable. Education details are OFTEN wrong on LinkedIn — only include education if verified on an official university page, company bio, or the person's own official website. Do NOT guess education history.
7. **Never hallucinate URLs, dates, or titles** — Only cite sources that are explicitly listed above.
8. **Include Images** — If the scraped content contains relevant image URLs (e.g., headshots, charts, logos), embed them directly in the markdown using `![Alt text](image_url)`.

### Structure:
1. **Executive Summary** (3-4 paragraphs)
2. **Background & Context**
3. **Detailed Findings** (by subtopic, 3-5 paragraphs each with inline citations [N])
4. **Contrasting Perspectives & Debates**
5. **Key Data & Statistics** (in a table where possible)
6. **Analysis & Implications**
7. **Limitations & Gaps** (be honest about what could NOT be verified)
8. **Conclusion**
9. **Sources** (numbered list with URLs and reliability rating)

### Format Requirements:
- Minimum 2500 words
- Every factual claim must have [N] citation
- Use proper markdown (headers, bold, bullet points, tables)
- Be specific with numbers, dates, names
- Present multiple perspectives
- Go DEEP — not superficial
- Add a "Confidence & Verification" table at the end summarizing key claims and their confidence level"""

    report = ""
    try:
        report_response = await llm.chat.completions.create(
            model=settings.chat_model,
            messages=[
                {"role": "assistant", "content": "You are a senior research writer. Write comprehensive, well-cited reports."},
                {"role": "user", "content": report_prompt},
            ],
            temperature=0.4,
        )
        report = report_response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        report = f"# Research Report: {query}\n\n> Report generation failed: {e}\n\n## Sources\n\n"
        for i, r in enumerate(all_results):
            report += f"{i+1}. [{r.get('title', '')}]({r.get('url', '')})\n"

    # ── Save report & mark session complete ──
    if db_session and session_id:
        try:
            session_obj = await db_session.get(ResearchSession, session_id)
            if session_obj:
                session_obj.status = "completed"
                session_obj.report = report
                session_obj.total_searches = max_rounds
                session_obj.total_pages_scraped = len(scraped_pages)
                session_obj.summary = report[:300] + "..." if len(report) > 300 else report
                await db_session.flush()
                logger.info(f"Session {session_id} saved as completed with {len(report)} char report")
        except Exception as e:
            logger.error(f"Failed to save session: {e}")

    yield {"event": "report", "data": {"report": report}}
    yield {"event": "step_update", "data": {"stepType": "respond", "status": "completed", "content": "Report generated."}}
    yield {"event": "done", "data": {"sessionId": session_id, "status": "completed"}}


async def regenerate_report_only(
    session_id: str,
    db_session: AsyncSession,
) -> AsyncGenerator[Dict[str, Any], None]:
    
    query = select(ResearchSession).options(
        selectinload(ResearchSession.search_results)
    ).where(ResearchSession.id == session_id)
    
    result = await db_session.execute(query)
    session_obj = result.scalars().first()
    
    if not session_obj:
        yield {"event": "error", "data": {"message": "Session not found"}}
        return

    llm = get_async_llm()

    context = session_obj.query
    if session_obj.user_answers:
        context += f"\n\nUser clarifications:\n{session_obj.user_answers}"

    # ── Phase 3: Generate Report ──
    yield {"event": "step_update", "data": {
        "stepType": "respond",
        "status": "running",
        "content": "CrewAI agents regenerating comprehensive report...",
    }}

    all_results = session_obj.search_results or []
    scraped_pages = [r for r in all_results if r.scraped and r.content]

    source_list = "\n".join([
        f"{i+1}. [{r.title or 'Untitled'}]({r.url}) — {(r.snippet or '')[:300]}"
        for i, r in enumerate(all_results)
    ])

    scraped_content = "\n\n---\n\n".join([
        f"### Source: {p.url}\n{p.content[:8000]}"
        for p in scraped_pages
    ])

    report_prompt = f"""# Research Report Request (REGENERATION)

## Query
{context}

## Sources ({len(all_results)} found)
{source_list or "No sources available."}

## Scraped Content ({len(scraped_pages)} pages)
{scraped_content or "No scraped content available."}

## Instructions
You are a senior research analyst. Write a comprehensive, publication-quality markdown research report.

### CRITICAL SOURCE RELIABILITY RULES:
1. **NEVER fabricate information** — If a source does not contain specific data, DO NOT include it.
2. **Prioritize authoritative sources** — LinkedIn, official company websites, reputable news.
3. **Cross-reference everything** — Cite multiple sources for key claims.
4. **Include Images** — Embed relevant image URLs if found in scraped content.

### Structure:
1. **Executive Summary**
2. **Background & Context**
3. **Detailed Findings**
4. **Analysis & Implications**
5. **Conclusion**
6. **Sources**

### Format Requirements:
- Minimum 2500 words
- Every factual claim must have [N] citation
- Use proper markdown
- Add a "Confidence & Verification" table at the end"""

    report = ""
    try:
        report_response = await llm.chat.completions.create(
            model=settings.chat_model,
            messages=[
                {"role": "assistant", "content": "You are a senior research writer. Write comprehensive, well-cited reports."},
                {"role": "user", "content": report_prompt},
            ],
            temperature=0.4,
        )
        report = report_response.choices[0].message.content or ""
        
        # Save report
        session_obj.report = report
        session_obj.status = "completed"
        session_obj.summary = report[:300] + "..." if len(report) > 300 else report
        await db_session.flush()
        logger.info(f"Session {session_id} report regenerated successfully")
        
        yield {"event": "report", "data": {"report": report}}
        yield {"event": "step_update", "data": {"stepType": "respond", "status": "completed", "content": "Report regenerated."}}
        yield {"event": "done", "data": {"sessionId": session_id, "status": "completed"}}
        
    except Exception as e:
        logger.error(f"Report regeneration failed: {e}")
        yield {"event": "error", "data": {"message": f"Report regeneration failed: {e}"}}
