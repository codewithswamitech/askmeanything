import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/agent/session/[id]/export?format=md|html
// Exports a session report as Markdown or HTML
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "md";

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

    if (!session.report) {
      return NextResponse.json(
        { error: "No report available for this session." },
        { status: 404 }
      );
    }

    const timestamp = new Date(session.createdAt).toISOString().slice(0, 10);
    const filename = `research-${timestamp}-${id.slice(0, 6)}`;

    if (format === "html") {
      const htmlContent = buildHtmlExport(session);
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.html"`,
        },
      });
    }

    // Default: Markdown export
    const mdContent = buildMarkdownExport(session);
    return new NextResponse(mdContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  } catch (error) {
    console.error("[export] Failed to export session:", error);
    return NextResponse.json(
      { error: "Failed to export session." },
      { status: 500 }
    );
  }
}

function buildMarkdownExport(session: {
  query: string;
  report: string;
  createdAt: Date;
  steps: Array<{ stepType: string; stepLabel: string; status: string; content: string | null }>;
  results: Array<{ url: string; title: string; snippet: string | null }>;
}): string {
  const lines: string[] = [];

  lines.push(`# Research Report`);
  lines.push(``);
  lines.push(`**Query:** ${session.query}`);
  lines.push(`**Date:** ${session.createdAt.toISOString()}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Sources section
  if (session.results.length > 0) {
    lines.push(`## Sources`);
    lines.push(``);
    for (const result of session.results) {
      lines.push(`- [${result.title}](${result.url})`);
      if (result.snippet) {
        lines.push(`  > ${result.snippet}`);
      }
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`## Report`);
  lines.push(``);
  lines.push(session.report || "No report content.");

  return lines.join("\n");
}

function buildHtmlExport(session: {
  query: string;
  report: string;
  createdAt: Date;
  steps: Array<{ stepType: string; stepLabel: string; status: string; content: string | null }>;
  results: Array<{ url: string; title: string; snippet: string | null }>;
}): string {
  // Simple Markdown to HTML conversion for basic elements
  const htmlReport = (session.report || "")
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo])/gm, (match) => match ? `<p>${match}` : match);

  const sourcesHtml = session.results
    .map(
      (r) =>
        `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a>${r.snippet ? ` — <em>${r.snippet}</em>` : ""}</li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Report — ${session.query}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #1a1a1a;
      line-height: 1.7;
      background: #fafafa;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #111; }
    h2 { font-size: 1.4rem; margin-top: 2rem; margin-bottom: 0.75rem; color: #222; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.5rem; }
    h3 { font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #333; }
    p { margin-bottom: 1rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .meta strong { color: #444; }
    hr { border: none; border-top: 1px solid #e5e5e5; margin: 2rem 0; }
    ul { margin-bottom: 1rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.4rem; }
    a { color: #059669; text-decoration: none; }
    a:hover { text-decoration: underline; }
    blockquote { border-left: 3px solid #059669; padding-left: 1rem; color: #555; margin: 0.5rem 0; font-style: italic; }
    code { background: #f0f0f0; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; }
    .sources { background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1rem; }
    .sources h2 { border: none; padding: 0; margin-top: 0; margin-bottom: 0.75rem; font-size: 1.1rem; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; font-size: 0.8rem; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>Research Report</h1>
  <div class="meta">
    <strong>Query:</strong> ${session.query}<br>
    <strong>Date:</strong> ${session.createdAt.toISOString()}
  </div>
  <hr>
  ${
    session.results.length > 0
      ? `<div class="sources">
    <h2>Sources</h2>
    <ul>${sourcesHtml}</ul>
  </div>
  <hr>`
      : ""
  }
  <h2>Report</h2>
  <div>${htmlReport}</div>
  <div class="footer">Generated by Research Agent</div>
</body>
</html>`;
}
