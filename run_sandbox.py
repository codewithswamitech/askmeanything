"""
Creates an E2B sandbox from the pre-built template and keeps it alive.
start_cmd in e2b.toml automatically starts all services (Redis, Postgres,
azure-proxy, crewai FastAPI, Next.js on port 8080).
"""
import asyncio
import os
import sys

os.environ["E2B_API_KEY"] = "e2b_7cb6fe8b18b42468b1e59b45addb9cbd0c9d5e5c"

from e2b import AsyncSandbox

TEMPLATE_ID = "0ddiun3ymttcn7vpq2rg"
APP_PORT    = 8080

async def wait_for_port(sandbox, port: int, retries: int = 30, delay: int = 3):
    for i in range(retries):
        result = await sandbox.commands.run(
            f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{port}/ || echo 'ERR'",
            timeout=10,
        )
        code = result.stdout.strip()
        if code not in ("", "ERR", "000"):
            return True
        print(f"  waiting for port {port}... ({i+1}/{retries})", flush=True)
        await asyncio.sleep(delay)
    return False

async def main():
    print(f"Creating sandbox from template {TEMPLATE_ID}...", flush=True)
    sandbox = await AsyncSandbox.create(TEMPLATE_ID, timeout=3600)
    sid = sandbox.sandbox_id
    print(f"Sandbox ID : {sid}", flush=True)

    print("Waiting ~25 s for start_cmd to boot all services...", flush=True)
    await asyncio.sleep(25)

    # Verify ports
    for port, label in [(3005, "azure-proxy"), (8000, "crewai API"), (8080, "Next.js")]:
        res = await sandbox.commands.run(
            f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{port}/ || echo ERR",
            timeout=15,
        )
        code = res.stdout.strip()
        status = "UP" if code not in ("", "ERR", "000") else "still starting"
        print(f"  port {port} ({label}): {status} [{code}]", flush=True)

    # Extra wait if Next.js not ready yet
    res = await sandbox.commands.run(
        f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{APP_PORT}/ || echo ERR",
        timeout=15,
    )
    if res.stdout.strip() in ("", "ERR", "000"):
        print("Next.js not ready yet, waiting another 20 s...", flush=True)
        await asyncio.sleep(20)

    url = f"https://{sandbox.get_host(APP_PORT)}"
    print(f"\n✅ App is live at: {url}", flush=True)
    print(f"   Sandbox ID    : {sid}", flush=True)
    print(f"   Timeout       : 1 hour from now", flush=True)
    print("\nPress Ctrl+C to kill the sandbox.\n", flush=True)

    # Stream sandbox logs so we can see what's happening
    async def tail_logs():
        try:
            async for line in sandbox.commands.run_stream(
                "tail -f /tmp/crewai.log /tmp/azure-proxy.log 2>/dev/null || true"
            ):
                pass
        except Exception:
            pass

    try:
        while True:
            await asyncio.sleep(60)
            # ping to confirm still alive
            r = await sandbox.commands.run("echo alive", timeout=10)
            if "alive" not in r.stdout:
                print("Sandbox appears to have stopped.", flush=True)
                break
    except KeyboardInterrupt:
        print("\nShutting down sandbox...", flush=True)
        await sandbox.kill()
        print("Sandbox destroyed.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
