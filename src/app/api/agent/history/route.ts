import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/agent/history
// Returns all research sessions ordered by most recent, with counts
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const sessions = await db.researchSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            steps: true,
            results: true,
          },
        },
      },
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      query: s.query,
      status: s.status,
      summary: s.summary,
      stepsCount: s._count.steps,
      resultsCount: s._count.results,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ sessions: formatted });
  } catch (error) {
    console.error("[history] Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch research history." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/agent/history
// Deletes all research sessions
// ---------------------------------------------------------------------------

export async function DELETE() {
  try {
    const result = await db.researchSession.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All research history cleared.",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("[history] Failed to delete sessions:", error);
    return NextResponse.json(
      { error: "Failed to delete research history." },
      { status: 500 }
    );
  }
}
