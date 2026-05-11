import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/agent/session/[id]/duplicate
// Duplicates a research session with all steps, results, and report
// ---------------------------------------------------------------------------

export async function POST(
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

    // Fetch the original session with all related data
    const original = await db.researchSession.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: "asc" } },
        results: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    // Create a new session with the same query
    const duplicated = await db.researchSession.create({
      data: {
        query: original.query,
        status: "completed",
        summary: original.summary,
        report: original.report,
        notes: original.notes,
        steps: {
          create: original.steps.map((step) => ({
            stepType: step.stepType,
            stepLabel: step.stepLabel,
            status: step.status,
            content: step.content,
            metadata: step.metadata,
            order: step.order,
          })),
        },
        results: {
          create: original.results.map((result) => ({
            url: result.url,
            title: result.title,
            snippet: result.snippet,
            hostName: result.hostName,
            fullContent: result.fullContent,
            scraped: result.scraped,
            qualityScore: result.qualityScore,
          })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: duplicated.id,
    });
  } catch (error) {
    console.error("[duplicate] Failed to duplicate session:", error);
    return NextResponse.json(
      { error: "Failed to duplicate session." },
      { status: 500 }
    );
  }
}
