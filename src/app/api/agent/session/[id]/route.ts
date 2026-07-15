import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const resp = await fetch(`${CREWAI_SERVICE_URL}/research/session/${id}`, {
      cache: "no-store",
      headers: { Authorization: auth },
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "Session not found." }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[session] Proxy failed:", error);
    return NextResponse.json({ error: "Failed to fetch session." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const resp = await fetch(`${CREWAI_SERVICE_URL}/research/session/${id}`, {
      method: "DELETE",
      headers: { Authorization: auth },
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "Failed to delete session." }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[session] Delete proxy failed:", error);
    return NextResponse.json({ error: "Failed to delete session." }, { status: 500 });
  }
}
