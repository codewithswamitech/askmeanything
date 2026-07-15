# KnowYourLead — Deep Research Agent

A Next.js frontend paired with a Python (FastAPI + CrewAI) "deep research" backend. The
frontend proxies research requests to the backend, which orchestrates web search (Tavily),
scraping, and an LLM (Azure OpenAI) to produce cited research reports streamed over SSE.

## Architecture

```
Browser ──► Next.js frontend (:3001)
                 │  src/app/api/crewai/[...path]  (proxy)
                 │  src/app/api/agent/*           (research, history, session)
                 ▼  CREWAI_SERVICE_URL
            FastAPI backend (crewai-service, :8002)
                 ├─ PostgreSQL  (deep_research @ :5432)   sessions / reports
                 ├─ Redis       (:6379)                    cache
                 ├─ Tavily                                 web search
                 └─ Azure OpenAI                           LLM (direct)
```

## Prerequisites

- Node.js + npm (or bun) and Python 3.11+
- **PostgreSQL** reachable on `localhost:5432` with:
  - user `deepresearch` / password `deepresearch123`
  - database `deep_research` owned by that user
- **Redis** reachable on `localhost:6379`
- An **Azure OpenAI** key + endpoint (set in `crewai-service/.env`) and a **Tavily** API key

> The backend talks to Azure OpenAI **directly** when `AZURE_OPENAI_API_KEY` and
> `AZURE_OPENAI_ENDPOINT` are set, so the optional Node proxy (`azure-proxy.ts`, port 3005)
> is **not required**. The `LLM endpoint: ...:3005` line in the backend log is just an
> unused fallback value in that mode.

## Running locally

### 1. Frontend (port 3001)

```bash
npm install
npm run dev        # next dev -p 3001  →  http://localhost:3001
```

The frontend reads `.env.local` at startup:

```env
CREWAI_SERVICE_URL=http://127.0.0.1:8002
```

Point this at wherever the backend is listening. (Next.js dev hot-reloads `.env.local`,
so route handlers pick up changes without a manual restart.)

### 2. Backend (crewai-service)

```bash
cd crewai-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Run on port 8002 (8000/8001 are commonly occupied by other apps)
.venv/bin/uvicorn crewai_service.main:app --host 127.0.0.1 --port 8002
```

Configuration is read from `crewai-service/.env` — database/Redis URLs, the Azure OpenAI
and Tavily keys, auth, CORS, and rate limits. Note: `.env` contains `SERVICE_PORT`, but the
listening port is set by the `--port` flag on the `uvicorn` command above.

The database schema is created automatically on startup (`init_db()`). To initialize it
manually:

```bash
cd crewai-service
.venv/bin/python -c 'import asyncio; from crewai_service.core.database import init_db; asyncio.run(init_db())'
```

### 3. Verify

```bash
curl http://127.0.0.1:8002/health            # direct: {"status":"ok",...,"version":"2.0.0"}
curl http://localhost:3001/api/crewai/health # through the frontend proxy
```

## Ports

| Service          | Port | Notes                                                       |
|------------------|------|-------------------------------------------------------------|
| Next.js frontend | 3001 | `npm run dev`                                               |
| CrewAI backend   | 8002 | 8000 / 8001 are frequently taken by other local apps        |
| PostgreSQL       | 5432 | `deep_research` database                                    |
| Redis            | 6379 | cache                                                       |
| Azure proxy      | 3005 | optional; only needed if not using Azure OpenAI directly    |

## Backend API (FastAPI)

| Method | Path                          | Purpose                                  |
|--------|-------------------------------|------------------------------------------|
| GET    | `/health`                     | Service health                           |
| POST   | `/research/clarify`           | Clarifying questions for a query         |
| POST   | `/research/stream`            | Run deep research (SSE stream)           |
| POST   | `/research/regenerate`        | Regenerate a report for an existing session |
| GET    | `/research/history`           | List a user's research sessions          |
| GET    | `/research/session/{id}`      | Fetch a session                          |
| DELETE | `/research/session/{id}`      | Delete a session                         |

## Troubleshooting

- **Frontend can't reach the backend** — confirm `CREWAI_SERVICE_URL` in `.env.local` matches
  the backend's actual port, then check `curl http://localhost:3001/api/crewai/health`.
- **Port already in use** — pick another port for `uvicorn --port` and update
  `CREWAI_SERVICE_URL` to match.
- **DB/Redis connection errors on startup** — ensure PostgreSQL (`deep_research`) and Redis
  are running and the credentials in `crewai-service/.env` are correct.
