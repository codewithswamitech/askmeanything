import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";

    const resp = await fetch(
      `${CREWAI_SERVICE_URL}/research/history?userId=${encodeURIComponent(userId)}&limit=${limit}&offset=${offset}`,
      { cache: "no-store" }
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
