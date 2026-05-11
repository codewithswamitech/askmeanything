import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/agent/history
// Returns all research sessions ordered by most recent, with counts
// Automatically marks stale "running" sessions (>5 min old) as "failed"
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // Mark stale running sessions as failed (created more than 5 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleResult = await db.researchSession.updateMany({
      where: {
        status: "running",
        createdAt: {
          lt: fiveMinutesAgo,
        },
      },
      data: {
        status: "failed",
      },
    });

    if (staleResult.count > 0) {
      console.log(
        `[history] Marked ${staleResult.count} stale running session(s) as failed`
      );
    }

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
