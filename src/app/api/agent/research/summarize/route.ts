import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json();
  const { sessionId, report } = body;

  if (!sessionId && !report) {
    return NextResponse.json(
      { error: "sessionId or report is required" },
      { status: 400 }
    );
  }

  try {
    const resp = await fetch(`${CREWAI_SERVICE_URL}/research/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ sessionId, report }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json(
        { error: data?.detail || "Failed to generate summary" },
        { status: resp.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to research service" },
      { status: 500 }
    );
  }
}
