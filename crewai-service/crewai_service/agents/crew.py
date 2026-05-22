import json
from typing import Optional
from crewai import Agent, Task, Crew, Process, LLM
from crewai_service.core.config import settings


def get_llm(temperature: float = 0.3) -> LLM:
    return LLM(
        model=f"openai/{settings.LLM_MODEL}",
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        temperature=temperature,
    )


def create_research_crew(
    query: str,
    user_answers: str = "",
) -> Crew:
    llm = get_llm()
    llm_creative = get_llm(temperature=0.5)
    llm_cold = get_llm(temperature=0.1)

    context_block = f"## Original Query\n{query}"
    if user_answers:
        context_block += f"\n\n## User Clarifications\n{user_answers}"

    planner = Agent(
        role="Senior Research Strategist",
        goal="Create a comprehensive, multi-angle search strategy that covers every dimension of the topic. Think like a research director at a top consulting firm — leave no angle unexplored.",
        backstory="""You are a world-class research strategist with 25+ years at McKinsey & Co. Your superpower is decomposing any question into its constituent parts and identifying the exact searches needed to build a complete picture. You always consider:
- Temporal dimensions (history, current state, future projections)
- Stakeholder perspectives (experts, practitioners, critics, affected parties)
- Evidence types (statistics, case studies, expert opinions, primary sources)
- Geographic/cultural variations
- Contrasting viewpoints and debates""",
        llm=llm_cold,
        verbose=False,
        allow_delegation=False,
    )

    searcher = Agent(
        role="Expert Web Intelligence Analyst",
        goal="Execute searches with surgical precision, evaluate every result for relevance and credibility, and compile only the highest-quality sources. Never settle for mediocre sources.",
        backstory="""You are an elite intelligence analyst who previously worked at a government research agency. You have an uncanny ability to:
- Craft queries that surface exactly the right results
- Instantly assess source credibility (academic? industry? blog? propaganda?)
- Identify the 20% of sources that contain 80% of the value
- Find primary sources and original data rather than secondary summaries
- Detect bias and conflict of interest in sources""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    analyst = Agent(
        role="Deep Content Analyst & Synthesizer",
        goal="Extract every meaningful fact, data point, and insight from scraped content. Identify patterns, contradictions, and gaps. Build a structured knowledge base from raw web content.",
        backstory="""You are a PhD-level research analyst with expertise in information synthesis. Your approach is forensic:
- You read every word and extract granular details
- You cross-reference claims between sources
- You identify what's missing, not just what's present
- You distinguish between facts, opinions, and speculation
- You quantify confidence levels for each finding
- You organize information into a structured taxonomy""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    gap_analyst = Agent(
        role="Research Gap Detector",
        goal="Review all collected information and identify critical gaps that need additional research. Decide if another search round is needed and what specific queries would fill the gaps.",
        backstory="""You are a research quality auditor with an obsessive attention to completeness. You ask:
- What questions are still unanswered?
- Are there perspectives or stakeholders we haven't covered?
- Is the evidence strong enough to support firm conclusions?
- What specific searches would fill the identified gaps?
- Is there newer information available that we might have missed?
You decide: 'sufficient' (report is ready) or 'insufficient' (need more research with specific queries).""",
        llm=llm_cold,
        verbose=False,
        allow_delegation=False,
    )

    fact_checker = Agent(
        role="Chief Verification Officer",
        goal="Independently verify every significant claim by checking it against multiple sources. Flag unverified claims, contradictions, and potential misinformation.",
        backstory="""You are a veteran fact-checker who worked at Snopes and PolitiFact. Your methodology:
- Every factual claim must be supported by at least 2 independent sources
- You distinguish between primary and secondary sources
- You check for recency (is the information still current?)
- You flag logical fallacies and unsupported conclusions
- You assess the overall reliability of the evidence base
- You assign confidence ratings: HIGH, MEDIUM, LOW, UNVERIFIED""",
        llm=llm_cold,
        verbose=False,
        allow_delegation=False,
    )

    writer = Agent(
        role="Senior Research Report Writer",
        goal="Transform all verified research findings into a comprehensive, beautifully structured, publication-quality markdown report that reads like it came from a top-tier consulting firm or research institution.",
        backstory="""You are an award-winning research writer whose reports have been cited in The Economist, Harvard Business Review, and Nature. Your writing style:
- Crystal clear and precise, never vague
- Data-rich with specific numbers, dates, and proper citations
- Balanced — presents multiple perspectives fairly
- Structured with clear hierarchy (H1, H2, H3)
- Uses tables, bullet points, and bold for emphasis
- Opens with an executive summary that captures the essence
- Ends with actionable conclusions
- Minimum 2500 words for comprehensive reports
- Every claim has an inline citation [N]""",
        llm=llm_creative,
        verbose=False,
        allow_delegation=False,
    )

    reviewer = Agent(
        role="Quality Assurance Reviewer",
        goal="Review the final report for completeness, accuracy, readability, and formatting. Ensure it meets professional standards before delivery.",
        backstory="""You are a senior editor at a leading research publication. You check:
- Does the report answer the original question comprehensively?
- Are all claims properly cited?
- Is the structure logical and easy to navigate?
- Are there any unsupported assertions?
- Is the language professional and clear?
- Does it meet the minimum quality bar for publication?
You either APPROVE the report or request specific improvements.""",
        llm=llm_cold,
        verbose=False,
        allow_delegation=False,
    )

    plan_task = Task(
        description=f"""{context_block}

## Your Task
Analyze this research request and produce a comprehensive search strategy.

Output ONLY valid JSON (no markdown fences):
{{
  "research_type": "string",
  "complexity": "simple|moderate|complex",
  "key_topics": ["4-6 main topics"],
  "search_queries": ["8-12 specific queries covering: history, current state, statistics, expert opinions, debates, recent developments, practical implications"],
  "information_gaps_predicted": ["what you anticipate might be hard to find"],
  "perspectives_to_cover": ["different viewpoints to ensure balanced coverage"]
}}""",
        expected_output="JSON with research_type, complexity, key_topics, search_queries, information_gaps_predicted, perspectives_to_cover.",
        agent=planner,
    )

    analyze_task = Task(
        description=f"""{context_block}

## Your Task
Given the search results and scraped content below, perform a deep analysis.

For each sub-topic, extract:
- Every key fact, figure, date, name mentioned
- Direct quotes from authoritative sources
- Statistical data with context
- Contradictions between sources
- Quality assessment of evidence

Output ONLY valid JSON:
{{
  "subtopics": [{{
    "name": "subtopic name",
    "key_findings": ["finding with source ref [1]", ...],
    "data_points": ["specific numbers/stats"],
    "quotes": ["direct quotes from sources"],
    "contradictions": ["conflicting info"],
    "evidence_strength": "strong|moderate|weak",
    "gaps": ["missing info on this subtopic"]
  }}],
  "overall_quality": "comprehensive|adequate|insufficient",
  "missing_perspectives": ["viewpoints not yet covered"]
}}""",
        expected_output="JSON analysis organized by subtopics with findings, data, contradictions, and quality ratings.",
        agent=analyst,
    )

    gap_task = Task(
        description=f"""{context_block}

## Your Task
Review the analysis from the previous task. Decide if the research is sufficient or if more searching is needed.

Output ONLY valid JSON:
{{
  "assessment": "sufficient|insufficient",
  "confidence": "high|medium|low",
  "reasoning": "why you think the research is or isn't sufficient",
  "additional_queries_needed": ["specific queries if insufficient, empty array if sufficient"],
  "specific_gaps": ["exactly what information is still missing"]
}}

Be rigorous. If key aspects of the query are not well-covered, say 'insufficient'.""",
        expected_output="JSON with assessment (sufficient/insufficient), confidence, and any additional queries needed.",
        agent=gap_analyst,
    )

    factcheck_task = Task(
        description=f"""{context_block}

## Your Task
Verify the key claims from the research analysis.

Output ONLY valid JSON:
{{
  "verified_claims": [{{
    "claim": "the claim text",
    "sources": [1, 2],
    "confidence": "HIGH|MEDIUM|LOW",
    "caveats": "any context needed"
  }}],
  "unverified_claims": ["claims with only one source"],
  "contradictions_found": [{{
    "topic": "what",
    "source_a_says": "...",
    "source_b_says": "...",
    "resolution": "likely explanation"
  }}],
  "overall_reliability": "high|medium|low",
  "recommendations": ["what the reader should be cautious about"]
}}""",
        expected_output="JSON verification report with verified claims, unverified claims, contradictions, and reliability ratings.",
        agent=fact_checker,
    )

    report_task = Task(
        description=f"""{context_block}

## Your Task
Write a comprehensive, publication-quality markdown research report.

## Structure Required:
# [Title]

## Executive Summary (3-4 paragraphs)

## Background & Context (detailed)

## Detailed Findings (organized by subtopic, 3-5 paragraphs each)
- Use inline citations [1], [2]
- Include tables/bullet points for complex data
- Be specific with numbers, dates, names

## Contrasting Perspectives & Debates

## Key Data & Statistics (dedicated section)

## Analysis & Implications

## Limitations & Gaps

## Conclusion

## Sources (numbered with URLs)

## REQUIREMENTS:
- Minimum 2500 words
- Every claim must have [N] citation
- Professional, precise language
- Multiple perspectives presented fairly
- NOT superficial — go deep on each subtopic""",
        expected_output="Comprehensive markdown report (2500+ words) with inline citations and all required sections.",
        agent=writer,
    )

    review_task = Task(
        description=f"""{context_block}

## Your Task
Review the report from the previous task for quality.

Output ONLY valid JSON:
{{
  "approved": true/false,
  "quality_score": 1-10,
  "issues": ["specific problems found"],
  "improvements": ["specific changes needed if not approved"]
}}

Only approve if: all claims are cited, structure is logical, language is professional, and it comprehensively answers the query.""",
        expected_output="JSON with approved (boolean), quality_score (1-10), issues, and improvements.",
        agent=reviewer,
    )

    return Crew(
        agents=[planner, searcher, analyst, gap_analyst, fact_checker, writer, reviewer],
        tasks=[plan_task, analyze_task, gap_task, factcheck_task, report_task, review_task],
        process=Process.sequential,
        verbose=False,
    )
