import { NextResponse } from "next/server";

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json();
  const { query, sessionId, userAnswers, maxSources, pagesToScrape, userId } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "A non-empty 'query' field is required." }, { status: 400 });
  }

  // Step 1: Get clarification questions from Python service
  if (!userAnswers) {
    try {
      const clarifyResp = await fetch(`${CREWAI_SERVICE_URL}/research/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ query: query.trim(), maxSources: maxSources ?? 10, pagesToScrape: pagesToScrape ?? 8, userId }),
      });

      if (clarifyResp.ok) {
        const clarifyData = await clarifyResp.json();

        if (clarifyData.needsClarification && clarifyData.questions?.length > 0) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(
                `event: step_update\ndata: ${JSON.stringify({
                  stepType: "understand",
                  status: "completed",
                  content: clarifyData.summary || "Waiting for clarification...",
                })}\n\n`
              ));
              controller.enqueue(encoder.encode(
                `event: clarification_required\ndata: ${JSON.stringify({
                  questions: clarifyData.questions,
                  sessionId: clarifyData.sessionId,
                })}\n\n`
              ));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        }

        // No clarification needed — proceed directly
        return streamResearch(query, clarifyData.sessionId, "", maxSources, pagesToScrape, userId, auth);
      }
    } catch (err) {
      console.error("[bridge] Clarification failed:", err);
      // Fallback: proceed without clarification
      return streamResearch(query, sessionId, "", maxSources, pagesToScrape, userId, auth);
    }
  }

  // Step 2: User answered — stream full research
  return streamResearch(query, sessionId, userAnswers, maxSources, pagesToScrape, userId, auth);
}

function streamResearch(
  query: string,
  sessionId: string | undefined,
  userAnswers: string,
  maxSources: number | undefined,
  pagesToScrape: number | undefined,
  userId: string | undefined,
  auth: string,
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      try {
        const resp = await fetch(`${CREWAI_SERVICE_URL}/research/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: auth },
          body: JSON.stringify({
            query,
            sessionId,
            userAnswers,
            maxSources: maxSources ?? 10,
            pagesToScrape: pagesToScrape ?? 8,
            userId,
          }),
        });

        if (!resp.ok) {
          throw new Error(`CrewAI service error: ${resp.status}`);
        }

        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const lines = part.split("\n");
            let currentEvent = "";
            let currentData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
              else if (line.startsWith("data: ")) currentData = line.slice(6);
            }

            if (currentEvent && currentData) {
              try {
                const data = JSON.parse(currentData);
                send(currentEvent, data);
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        console.error("[bridge] Research stream failed:", err);
        send("step_update", {
          stepType: "understand",
          status: "failed",
          content: `Service error: ${(err as Error).message}`,
        });
        send("done", { sessionId, status: "failed", error: (err as Error).message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
