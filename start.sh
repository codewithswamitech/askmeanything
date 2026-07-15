#!/bin/bash
set -e

echo "[start.sh] Starting services..."

# 1. Start Redis
service redis-server start || true

# 2. Start PostgreSQL
service postgresql start || true
sleep 3

# 3. Init PostgreSQL user and database (idempotent)
sudo -u postgres psql -c "CREATE USER deepresearch WITH PASSWORD 'deepresearch123';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE deep_research OWNER deepresearch;" 2>/dev/null || true

# 4. Start Azure OpenAI proxy on port 3005
cd /app
npx tsx azure-proxy.ts > /tmp/azure-proxy.log 2>&1 &
echo "[start.sh] Azure proxy starting on port 3005..."
sleep 4

# 5. Init crewai database schema
cd /app/crewai-service
DATABASE_URL='postgresql+asyncpg://deepresearch:deepresearch123@localhost:5432/deep_research' \
  python3 -c 'import asyncio; from crewai_service.core.database import init_db; asyncio.run(init_db())' || true

# 6. Start crewai FastAPI service on port 8000
DATABASE_URL='postgresql+asyncpg://deepresearch:deepresearch123@localhost:5432/deep_research' \
REDIS_URL='redis://localhost:6379/0' \
LLM_API_KEY='dummy_key_not_used' \
TAVILY_API_KEY='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' \
LLM_BASE_URL='http://127.0.0.1:3005/v1' \
LLM_MODEL='gpt-4o' \
CORS_ORIGINS='*' \
AUTH_EMAIL='admin@knowyourlead.ai' \
AUTH_PASSWORD='Omkar@2210' \
AUTH_DISPLAY_NAME='Admin' \
  uvicorn crewai_service.main:app --host 0.0.0.0 --port 8000 > /tmp/crewai.log 2>&1 &
echo "[start.sh] crewai FastAPI service starting on port 8000..."
sleep 5

# 7. Start Next.js standalone on port 8080 (foreground — keeps sandbox alive)
echo "[start.sh] Starting Next.js on port 8080..."
cd /app
CREWAI_SERVICE_URL='http://127.0.0.1:8000' \
HOSTNAME='0.0.0.0' \
PORT='8080' \
DATABASE_URL='file:/app/db/custom.db' \
  node .next/standalone/server.js
