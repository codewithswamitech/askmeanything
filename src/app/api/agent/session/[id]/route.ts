import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/agent/session/[id]
// Returns full session details including all steps and results
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    const session = await db.researchSession.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
        results: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const formatted = {
      id: session.id,
      query: session.query,
      status: session.status,
      summary: session.summary,
      report: session.report,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      steps: session.steps.map((step) => ({
        id: step.id,
        stepType: step.stepType,
        stepLabel: step.stepLabel,
        status: step.status,
        content: step.content,
        metadata: step.metadata ? JSON.parse(step.metadata) : null,
        order: step.order,
        createdAt: step.createdAt.toISOString(),
      })),
      results: session.results.map((result) => ({
        id: result.id,
        url: result.url,
        title: result.title,
        snippet: result.snippet,
        hostName: result.hostName,
        fullContent: result.fullContent,
        scraped: result.scraped,
        qualityScore: result.qualityScore,
        createdAt: result.createdAt.toISOString(),
      })),
    };

    return NextResponse.json({ session: formatted });
  } catch (error) {
    console.error("[session] Failed to fetch session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/agent/session/[id]
// Deletes a single research session and its related steps/results
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    const session = await db.researchSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    await db.researchSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[session] Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/agent/session/[id]
// Renames a research session's query
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { query: newQuery } = body;

    if (!newQuery || typeof newQuery !== "string" || newQuery.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const session = await db.researchSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    await db.researchSession.update({
      where: { id },
      data: { query: newQuery.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[session] Failed to rename session:", error);
    return NextResponse.json(
      { error: "Failed to rename session." },
      { status: 500 }
    );
  }
}
