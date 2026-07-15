import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    // Identity is derived server-side from the token; userId query param is ignored.
    const limit = encodeURIComponent(searchParams.get("limit") || "50");
    const offset = encodeURIComponent(searchParams.get("offset") || "0");

    const resp = await fetch(
      `${CREWAI_SERVICE_URL}/research/history?limit=${limit}&offset=${offset}`,
      { cache: "no-store", headers: { Authorization: auth } }
    );

    if (!resp.ok) {
      return NextResponse.json({ error: "Failed to fetch history." }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[history] Proxy failed:", error);
    return NextResponse.json({ error: "Failed to fetch research history." }, { status: 500 });
  }
}
