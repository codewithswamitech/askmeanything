import asyncio
import os
from dotenv import load_dotenv
from e2b import AsyncSandbox

# Load environment variables from crewai-service/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "crewai-service", ".env"))

async def main():
    print("🚀 Spawning E2B Sandbox with template ID '0ddiun3ymttcn7vpq2rg'...")
    # Timeout is in seconds. 3600 = 1 hour (max for free tier), up to 24 hours for Pro.
    sandbox = await AsyncSandbox.create("0ddiun3ymttcn7vpq2rg", timeout=3600)
    
    print("📦 Starting Redis & PostgreSQL...")
    await sandbox.commands.run("sudo service redis-server start")
    await sandbox.commands.run("sudo service postgresql start")
    
    print("🗄️ Initializing Database...")
    await sandbox.commands.run("sudo -u postgres psql -c \"CREATE USER deepresearch WITH PASSWORD 'deepresearch123';\" || true")
    await sandbox.commands.run("sudo -u postgres psql -c \"CREATE DATABASE deep_research OWNER deepresearch;\" || true")
    
    print("🐍 Starting Azure OpenAI Proxy...")
    await sandbox.commands.run(
        "cd /app && npx tsx azure-proxy.ts",
        background=True
    )

    print("🐍 Starting FastAPI Backend...")
    openai_key = os.getenv("LLM_API_KEY", "dummy_key_not_used")
    tavily_key = os.getenv("TAVILY_API_KEY", "")
    llm_base_url = "http://127.0.0.1:3005/v1"
    llm_model = os.getenv("LLM_MODEL", "gpt-4o")
    
    # Run DB migrations/init before starting uvicorn
    await sandbox.commands.run(
        "cd /app/crewai-service && "
        "DATABASE_URL='postgresql+asyncpg://deepresearch:deepresearch123@localhost:5432/deep_research' "
        "python3 -c 'import asyncio; from crewai_service.core.database import init_db; asyncio.run(init_db())'"
    )

    await sandbox.commands.run(
        "cd /app/crewai-service && "
        "DATABASE_URL='postgresql+asyncpg://deepresearch:deepresearch123@localhost:5432/deep_research' "
        "REDIS_URL='redis://localhost:6379/0' "
        f"LLM_API_KEY='{openai_key}' "
        f"TAVILY_API_KEY='{tavily_key}' "
        f"LLM_BASE_URL='{llm_base_url}' "
        f"LLM_MODEL='{llm_model}' "
        "CORS_ORIGINS='*' "
        "uvicorn crewai_service.main:app --host 0.0.0.0 --port 8000",
        background=True
    )
    
    print("⚛️ Starting Next.js Frontend on port 8080...")
    await sandbox.commands.run(
        "cd /app && "
        "CREWAI_SERVICE_URL='http://127.0.0.1:8000' "
        "HOSTNAME='0.0.0.0' "
        "PORT='8080' "
        "node .next/standalone/server.js",
        background=True
    )
    
    print("⏳ Waiting for servers to initialize (45s)...")
    for i in range(45):
        print(f"Waiting... {45-i}s", end="\r")
        await asyncio.sleep(1)
    print("\n")
    
    # Verification
    print("🔍 Verifying services...")
    for port in [8080, 8000, 3005]:
        res = await sandbox.commands.run(f"curl -s -I http://127.0.0.1:{port} || echo 'FAILED'")
        if "FAILED" in res.stdout or not res.stdout:
            print(f"❌ Port {port} is NOT responding!")
        else:
            print(f"✅ Port {port} is UP")

    url = f"https://{sandbox.get_host(8080)}"
    print(f"\n✅ App is deployed and running!")
    print(f"🌍 Access your AskMeAnything app at: {url}")
    print(f"🆔 Sandbox ID: {sandbox.sandbox_id}")
    
    print("\nPress Ctrl+C to stop and kill the sandbox.")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down sandbox...")
        await sandbox.kill()
        print("Sandbox destroyed.")

if __name__ == "__main__":
    asyncio.run(main())
