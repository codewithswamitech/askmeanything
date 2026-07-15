import os
from crewai import Agent, Task, Crew, Process, LLM
from crewai_service.core.config import settings


def get_llm(temperature: float = 0.3) -> LLM:
    if settings.use_azure:
        # crewai/litellm route Azure by deployment name and read these env vars.
        os.environ["AZURE_API_KEY"] = settings.AZURE_OPENAI_API_KEY
        os.environ["AZURE_API_BASE"] = settings.AZURE_OPENAI_ENDPOINT
        os.environ["AZURE_API_VERSION"] = settings.AZURE_OPENAI_API_VERSION
        return LLM(
            model=f"azure/{settings.AZURE_OPENAI_DEPLOYMENT}",
            api_key=settings.AZURE_OPENAI_API_KEY,
            base_url=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            temperature=temperature,
        )
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
    # Only the planning step runs through crewai (see research.py, which calls
    # crew.tasks[0]); search, analysis, fact-checking and report writing are
    # implemented directly as LLM calls in core/research.py. The extra agents
    # that used to live here were never executed, so they were removed.
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

    return Crew(
        agents=[planner],
        tasks=[plan_task],
        process=Process.sequential,
        verbose=False,
    )
