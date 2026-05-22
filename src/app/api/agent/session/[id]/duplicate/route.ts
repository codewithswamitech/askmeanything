import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resp = await fetch(`${CREWAI_SERVICE_URL}/research/session/${id}/duplicate`, { method: "POST" });

    if (!resp.ok) {
      return NextResponse.json({ error: "Failed to duplicate session." }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[duplicate] Proxy failed:", error);
    return NextResponse.json({ error: "Failed to duplicate session." }, { status: 500 });
  }
}
