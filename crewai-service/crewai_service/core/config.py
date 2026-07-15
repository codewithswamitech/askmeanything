import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/deep_research"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Tavily
    TAVILY_API_KEY: str = ""
    
    # LLM (via Azure proxy) — used as a fallback when no Azure key is set
    LLM_BASE_URL: str = "http://localhost:3005/v1"
    LLM_API_KEY: str = "dummy_key_not_used"
    LLM_MODEL: str = "gpt-4o"

    # Azure OpenAI (direct) — when AZURE_OPENAI_API_KEY is set, the service
    # talks to Azure directly and the local Node proxy is not required.
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-12-01-preview"
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o-mini"
    
    # App
    SECRET_KEY: str = "change-me-to-a-random-secret-in-production"
    SERVICE_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3001,http://localhost:3000"
    
    # Auth
    AUTH_EMAIL: str = "admin@knowyourlead.ai"
    AUTH_PASSWORD: str = "admin123"
    AUTH_USER_ID: str = "00000000-0000-0000-0000-000000000001"
    AUTH_DISPLAY_NAME: str = "Claudius"
    
    # Rate limiting
    RATE_LIMIT: str = "10/minute"
    
    # Search defaults
    DEFAULT_MAX_SOURCES: int = 10
    DEFAULT_PAGES_TO_SCRAPE: int = 8
    MAX_SEARCH_QUERIES: int = 8
    SCRAPE_CONTENT_MAX_CHARS: int = 20000
    CACHE_TTL_SEARCH: int = 3600
    CACHE_TTL_SCRAPE: int = 86400
    CACHE_TTL_LLM: int = 1800
    
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def use_azure(self) -> bool:
        return bool(self.AZURE_OPENAI_API_KEY and self.AZURE_OPENAI_ENDPOINT)

    @property
    def chat_model(self) -> str:
        # Azure routes by deployment name; OpenAI/proxy routes by model name.
        return self.AZURE_OPENAI_DEPLOYMENT if self.use_azure else self.LLM_MODEL
    
    model_config = {"env_file": str(_ENV_FILE), "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
