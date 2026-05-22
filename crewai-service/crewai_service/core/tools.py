import json
import hashlib
import httpx
import asyncio
import logging
from typing import List, Dict, Any, Optional
from crewai_service.core.config import settings
from crewai_service.core.cache import get_redis

logger = logging.getLogger(__name__)


def _cache_key(prefix: str, value: str) -> str:
    h = hashlib.md5(value.encode()).hexdigest()[:12]
    return f"deep_research:{prefix}:{h}"


async def cached_tavily_search(
    query: str,
    max_results: int = 10,
    search_depth: str = "advanced",
) -> Dict[str, Any]:
    cache_key = _cache_key("search", f"{query}:{max_results}:{search_depth}")
    
    redis = await get_redis()
    cached = await redis.get(cache_key)
    if cached:
        logger.info(f"Cache HIT for search: {query[:50]}")
        return json.loads(cached)
    
    logger.info(f"Cache MISS for search: {query[:50]}")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.TAVILY_API_KEY}",
    }
    payload = {
        "query": query,
        "max_results": max_results,
        "include_answer": True,
        "include_raw_content": False,
        "search_depth": search_depth,
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post("https://api.tavily.com/search", headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
    
    results = []
    for r in data.get("results", []):
        results.append({
            "url": r.get("url", ""),
            "title": r.get("title", ""),
            "snippet": r.get("content", ""),
            "score": r.get("score", 0),
        })
    
    response_data = {
        "answer": data.get("answer", ""),
        "results": results,
    }
    
    await redis.set(cache_key, json.dumps(response_data), ex=settings.CACHE_TTL_SEARCH)
    return response_data


async def cached_jina_reader(url: str) -> Dict[str, str]:
    cache_key = _cache_key("scrape", url)
    
    redis = await get_redis()
    cached = await redis.get(cache_key)
    if cached:
        logger.info(f"Cache HIT for scrape: {url[:60]}")
        return json.loads(cached)
    
    logger.info(f"Cache MISS for scrape: {url[:60]}")
    jina_url = f"https://r.jina.ai/{url}"
    headers = {
        "Accept": "text/plain",
        "X-Return-Format": "text",
    }
    
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(jina_url, headers=headers)
            resp.raise_for_status()
            content = resp.text[:settings.SCRAPE_CONTENT_MAX_CHARS]
            result = {"url": url, "content": content, "success": True}
    except Exception as e:
        logger.warning(f"Scrape failed for {url}: {e}")
        result = {"url": url, "content": "", "success": False, "error": str(e)}
    
    await redis.set(cache_key, json.dumps(result), ex=settings.CACHE_TTL_SCRAPE)
    return result


async def batch_scrape(urls: List[str], concurrency: int = 5) -> List[Dict[str, str]]:
    sem = asyncio.Semaphore(concurrency)
    
    async def _scrape(url: str):
        async with sem:
            return await cached_jina_reader(url)
    
    tasks = [_scrape(u) for u in urls]
    return await asyncio.gather(*tasks)


async def cached_llm_call(
    messages: List[Dict[str, str]],
    llm_client,
) -> str:
    cache_key = _cache_key("llm", json.dumps(messages, sort_keys=True))
    
    redis = await get_redis()
    cached = await redis.get(cache_key)
    if cached:
        logger.info("Cache HIT for LLM call")
        return cached
    
    logger.info("Cache MISS for LLM call")
    response = await llm_client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=messages,
    )
    content = response.choices[0].message.content or ""
    
    await redis.set(cache_key, content, ex=settings.CACHE_TTL_LLM)
    return content
