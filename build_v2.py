import asyncio
import os
from dotenv import load_dotenv
from e2b import Template, default_build_logger

# Load environment variables
env_path = os.path.join(os.getcwd(), "crewai-service", ".env")
load_dotenv(env_path)

async def main():
    # Use from_dockerfile to parse the local Dockerfile
    # This sends the instructions to E2B's remote builder
    # Local Docker is NOT needed
    template = Template().from_dockerfile("Dockerfile")
    
    print("🚀 Starting E2B Cloud Build (V2)...")
    print("This will upload your code and build the environment in the E2B cloud.")
    print("No local Docker daemon is required.\n")
    
    try:
        build_info = await Template.build(
            template, 
            "askmeanything-app", 
            cpu_count=2, 
            memory_mb=2048,
            on_build_logs=default_build_logger()
        )
        print("\n✅ Build completed successfully!")
        print(f"Template Name: {build_info.name}")
        print(f"Template ID: {build_info.template_id}")
    except Exception as e:
        print(f"\n❌ Build failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
