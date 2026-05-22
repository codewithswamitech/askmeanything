import asyncio
import os
import time

async def run_command(cmd):
    try:
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        return stdout.decode(), stderr.decode(), process.returncode
    except Exception as e:
        return "", str(e), -1

async def main():
    print("🚀 Attempting to start local services...")
    
    # Check for Postgres via 'brew services'
    print("Checking brew services for postgresql...")
    stdout, stderr, code = await run_command("brew services start postgresql@14")
    if code == 0 and "Started" in stdout:
        print("✅ Started postgresql@14 via brew")
    else:
        stdout, stderr, code = await run_command("brew services start postgresql")
        if code == 0 and "Started" in stdout:
            print("✅ Started postgresql via brew")
        else:
            print("❌ Failed to start postgres via brew. Trying direct pg_ctl...")
            pg_data_paths = [
                "/opt/homebrew/var/postgres",
                "/usr/local/var/postgres",
                os.path.expanduser("~/Library/Application Support/Postgres/var-14")
            ]
            for path in pg_data_paths:
                if os.path.exists(path):
                    print(f"Found data at {path}, starting...")
                    await run_command(f"pg_ctl -D '{path}' start")
                    break

    # Check for Redis via 'brew services'
    print("Checking brew services for redis...")
    stdout, stderr, code = await run_command("brew services start redis")
    if code == 0 and "Started" in stdout:
        print("✅ Started redis via brew")
    else:
        print("❌ Failed to start redis via brew. Trying direct redis-server...")
        try:
            subprocess.Popen(["redis-server", "--daemonize", "yes"])
            print("✅ Started redis-server manually")
        except:
            print("❌ Failed to start redis-server manually")

    print("⏳ Waiting 3 seconds for services to stabilize...")
    time.sleep(3)
    print("🏁 Done.")

if __name__ == "__main__":
    import subprocess
    asyncio.run(main())
