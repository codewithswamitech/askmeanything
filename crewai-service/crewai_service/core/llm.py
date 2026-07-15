"""Central LLM client factory.

When AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT are set, requests go straight
to Azure OpenAI. Otherwise they fall back to the OpenAI-compatible endpoint
(the local Node proxy) configured by LLM_BASE_URL / LLM_API_KEY.
"""
from openai import AsyncOpenAI, AsyncAzureOpenAI

from crewai_service.core.config import settings


def get_async_llm(timeout: float | None = None):
    """Return an async OpenAI-compatible client (Azure or proxy/OpenAI).

    Chat calls should pass `model=settings.chat_model`, which resolves to the
    Azure deployment name when Azure is active and the plain model name otherwise.
    """
    kwargs = {} if timeout is None else {"timeout": timeout}
    if settings.use_azure:
        return AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            **kwargs,
        )
    return AsyncOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        **kwargs,
    )
