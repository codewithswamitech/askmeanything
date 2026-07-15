import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const response = await fetch(`${CREWAI_SERVICE_URL}/research/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to connect to research service" }, { status: 500 });
  }

  // Forward the stream
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
