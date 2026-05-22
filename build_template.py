import asyncio
import os
import sys
from dotenv import load_dotenv
from e2b import Template, default_build_logger

load_dotenv(os.path.join("crewai-service", ".env"))
os.environ["E2B_ACCESS_TOKEN"] = os.getenv("E2B_API_KEY") # Sometimes required for building

async def main():
    print("Loading Dockerfile...", flush=True)
    template = Template().from_dockerfile("e2b.Dockerfile")
    
    print("Building template on E2B (this may take a few minutes)...", flush=True)
    try:
        build_info = await Template.build(
            template, 
            "askmeanything-app", 
            cpu_count=2, 
            memory_mb=2048,
            on_build_logs=default_build_logger()
        )
        print("Build completed:", build_info, flush=True)
    except Exception as e:
        print("Build failed:", e, flush=True)

asyncio.run(main())
