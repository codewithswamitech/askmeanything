import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "md";

    const resp = await fetch(
      `${CREWAI_SERVICE_URL}/research/session/${id}/export?format=${format}`,
      { cache: "no-store" }
    );

    if (!resp.ok) {
      return NextResponse.json({ error: "Export failed." }, { status: resp.status });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `research-${timestamp}-${id.slice(0, 6)}`;
    const contentType = format === "html" ? "text/html" : "text/markdown";
    const extension = format === "html" ? "html" : "md";

    const blob = await resp.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${filename}.${extension}"`,
      },
    });
  } catch (error) {
    console.error("[export] Proxy failed:", error);
    return NextResponse.json({ error: "Failed to export session." }, { status: 500 });
  }
}
