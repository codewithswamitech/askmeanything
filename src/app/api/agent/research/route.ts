import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResearchRequest {
  query: string;
  sessionId?: string;
}

interface LLMMessage {
  role: "assistant" | "user";
  content: string;
}

// Web search results come directly from the SDK as SearchFunctionResultItem[]
// Page reader results come directly as PageReaderFunctionResult
// We re-export the URL field as-is; scraped text is extracted from HTML.

interface AnalysisResult {
  researchType: string;
  keyTopics: string[];
  informationNeeded: string[];
  complexity: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function callLLM(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  messages: LLMMessage[]
): Promise<string> {
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// POST handler – the main agentic research endpoint
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let body: ResearchRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { query, sessionId: existingSessionId } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "A non-empty 'query' field is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ---- Create or resume session ----
  let session;
  if (existingSessionId) {
    session = await db.researchSession.findUnique({
      where: { id: existingSessionId },
    });
  }
  if (!session) {
    session = await db.researchSession.create({
      data: {
        query: query.trim(),
        status: "running",
      },
    });
  } else {
    session = await db.researchSession.update({
      where: { id: session.id },
      data: { status: "running" },
    });
  }

  const sessionId = session.id;

  // ---- SSE stream ----
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const fail = (err: unknown, msg: string) => {
        console.error(`[research] ${msg}`, err);
      };

      // Helper: create or update an AgentStep
      const saveStep = async (
        stepType: string,
        stepLabel: string,
        status: string,
        order: number,
        content?: string,
        metadata?: object
      ) => {
        return db.agentStep.upsert({
          where: {
            id: `${sessionId}-${stepType}`,
          },
          create: {
            id: `${sessionId}-${stepType}`,
            sessionId,
            stepType,
            stepLabel,
            status,
            content,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
            order,
          },
          update: {
            status,
            content,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
          },
        });
      };

      let zai: Awaited<ReturnType<typeof ZAI.create>>;
      try {
        zai = await ZAI.create();
      } catch (err) {
        fail(err, "Failed to initialise ZAI SDK");
        await db.researchSession.update({
          where: { id: sessionId },
          data: { status: "failed" },
        });
        send("done", { sessionId, status: "failed", error: "SDK init failed" });
        controller.close();
        return;
      }

      // Accumulators shared across steps
      const allSearchResults: {
        url: string;
        name: string;
        snippet: string;
        host_name: string;
      }[] = [];
      const scrapedPages: { url: string; title: string; content: string }[] =
        [];

      // ================================================================
      // STEP 1 – UNDERSTAND
      // ================================================================
      let analysis: AnalysisResult;
      try {
        send("step_update", {
          stepType: "understand",
          status: "running",
          content: "Analyzing your query…",
        });
        await saveStep("understand", "Understand Query", "running", 1);

        const understandPrompt = `You are a research query analyzer. Analyze the user's query and determine:
1) What type of research is needed
2) Key topics to investigate
3) What kind of information would best answer the query
4) The complexity level (simple / moderate / complex)

Respond ONLY with valid JSON in this exact format (no markdown fences):
{
  "researchType": "string",
  "keyTopics": ["string"],
  "informationNeeded": ["string"],
  "complexity": "simple | moderate | complex",
  "summary": "string"
}`;

        const rawAnalysis = await callLLM(zai, [
          { role: "assistant", content: understandPrompt },
          { role: "user", content: query },
        ]);

        // Strip markdown fences if present
        const cleaned = rawAnalysis
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();

        analysis = parseJson<AnalysisResult>(cleaned, {
          researchType: "general",
          keyTopics: [query],
          informationNeeded: [],
          complexity: "moderate",
          summary: rawAnalysis,
        });

        await saveStep(
          "understand",
          "Understand Query",
          "completed",
          1,
          analysis.summary,
          analysis
        );

        send("step_update", {
          stepType: "understand",
          status: "completed",
          content: analysis.summary,
        });
      } catch (err) {
        fail(err, "UNDERSTAND step failed");
        analysis = {
          researchType: "general",
          keyTopics: [query],
          informationNeeded: [],
          complexity: "moderate",
          summary: `Analysis fallback for query: "${query}"`,
        };
        await saveStep("understand", "Understand Query", "failed", 1, String(err));
        send("step_update", {
          stepType: "understand",
          status: "failed",
          content: "Failed to analyze query, proceeding with defaults.",
        });
      }

      // ================================================================
      // STEP 2 – PLAN
      // ================================================================
      let searchQueries: string[] = [];
      try {
        send("step_update", {
          stepType: "plan",
          status: "running",
          content: "Generating search queries…",
        });
        await saveStep("plan", "Plan Search Strategy", "running", 2);

        const planPrompt = `Based on the following research analysis, generate 2-4 specific web search queries that would yield the most relevant and comprehensive results.

Research Analysis:
- Type: ${analysis.researchType}
- Topics: ${analysis.keyTopics.join(", ")}
- Information Needed: ${analysis.informationNeeded.join(", ")}
- Complexity: ${analysis.complexity}

Original query: ${query}

Return ONLY a valid JSON array of strings (no markdown fences). Example:
["query 1", "query 2", "query 3"]`;

        const rawPlan = await callLLM(zai, [
          { role: "assistant", content: planPrompt },
          { role: "user", content: `Generate search queries for: ${query}` },
        ]);

        const cleanedPlan = rawPlan
          .replace(/```\s*/g, "")
          .trim();

        searchQueries = parseJson<string[]>(cleanedPlan, [
          query,
          `${query} latest research`,
          `${query} comprehensive guide`,
        ]);

        // Ensure at least 2 queries
        if (searchQueries.length < 2) {
          searchQueries.push(`${query} overview`);
        }

        await saveStep(
          "plan",
          "Plan Search Strategy",
          "completed",
          2,
          `Planned ${searchQueries.length} queries`,
          { queries: searchQueries }
        );

        send("step_update", {
          stepType: "plan",
          status: "completed",
          content: `Generated ${searchQueries.length} search queries.`,
        });
      } catch (err) {
        fail(err, "PLAN step failed");
        searchQueries = [query, `${query} latest`];
        await saveStep("plan", "Plan Search Strategy", "failed", 2, String(err));
        send("step_update", {
          stepType: "plan",
          status: "failed",
          content: "Failed to plan queries, using defaults.",
        });
      }

      // ================================================================
      // STEP 3 – EXPLORE (web search)
      // ================================================================
      try {
        send("step_update", {
          stepType: "search",
          status: "running",
          content: `Searching across ${searchQueries.length} queries…`,
        });
        await saveStep("search", "Explore Web", "running", 3);

        for (let i = 0; i < searchQueries.length; i++) {
          const q = searchQueries[i];
          send("step_update", {
            stepType: "search",
            status: "running",
            content: `Searching: "${q}" (${i + 1}/${searchQueries.length})`,
          });

          try {
            const items = await zai.functions.invoke("web_search", {
              query: q,
              num: 10,
            });

            for (const item of items) {
              // Avoid duplicate URLs
              if (!allSearchResults.some((r) => r.url === item.url)) {
                allSearchResults.push(item);
                send("search_result", {
                  url: item.url,
                  title: item.name,
                  snippet: item.snippet,
                  hostName: item.host_name,
                });

                // Persist to DB
                await db.searchResult.create({
                  data: {
                    sessionId,
                    url: item.url,
                    title: item.name,
                    snippet: item.snippet,
                    hostName: item.host_name,
                  },
                });
              }
            }
          } catch (err) {
            fail(err, `Web search failed for: ${q}`);
            // Continue with remaining queries
          }
        }

        await saveStep(
          "search",
          "Explore Web",
          "completed",
          3,
          `Found ${allSearchResults.length} unique results`,
          { totalResults: allSearchResults.length }
        );

        send("step_update", {
          stepType: "search",
          status: "completed",
          content: `Found ${allSearchResults.length} unique results.`,
        });
      } catch (err) {
        fail(err, "EXPLORE step failed");
        await saveStep("search", "Explore Web", "failed", 3, String(err));
        send("step_update", {
          stepType: "search",
          status: "failed",
          content: "Search encountered errors.",
        });
      }

      // ================================================================
      // STEP 4 – SCRAPE top pages
      // ================================================================
      const pagesToScrape = allSearchResults.slice(0, 5);

      if (pagesToScrape.length > 0) {
        try {
          send("step_update", {
            stepType: "scrape",
            status: "running",
            content: `Scraping ${pagesToScrape.length} top pages…`,
          });
          await saveStep("scrape", "Scrape Pages", "running", 4);

          for (let i = 0; i < pagesToScrape.length; i++) {
            const page = pagesToScrape[i];
            send("step_update", {
              stepType: "scrape",
              status: "running",
              content: `Reading: ${page.name ?? page.url} (${i + 1}/${pagesToScrape.length})`,
            });

            try {
              const result = await zai.functions.invoke("page_reader", {
                url: page.url,
              });

              const title = result?.data?.title ?? page.name ?? page.url;
              const htmlContent = result?.data?.html ?? "";

              // Extract text content from HTML (simple approach)
              const textContent = htmlContent
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 8000); // Limit content size

              if (textContent.length > 50) {
                scrapedPages.push({
                  url: page.url,
                  title,
                  content: textContent,
                });

                send("scrape_result", {
                  url: page.url,
                  title,
                  content: textContent.slice(0, 500),
                });

                // Update DB record
                await db.searchResult.updateMany({
                  where: { sessionId, url: page.url },
                  data: {
                    fullContent: textContent,
                    scraped: true,
                    title,
                  },
                });
              }
            } catch (err) {
              fail(err, `Scrape failed for: ${page.url}`);
              // Continue with remaining pages
            }
          }

          await saveStep(
            "scrape",
            "Scrape Pages",
            "completed",
            4,
            `Scraped ${scrapedPages.length} pages successfully`,
            { pagesScraped: scrapedPages.length }
          );

          send("step_update", {
            stepType: "scrape",
            status: "completed",
            content: `Successfully scraped ${scrapedPages.length} pages.`,
          });
        } catch (err) {
          fail(err, "SCRAPE step failed");
          await saveStep("scrape", "Scrape Pages", "failed", 4, String(err));
          send("step_update", {
            stepType: "scrape",
            status: "failed",
            content: "Scraping encountered errors.",
          });
        }
      } else {
        await saveStep("scrape", "Scrape Pages", "skipped", 4, "No results to scrape");
        send("step_update", {
          stepType: "scrape",
          status: "completed",
          content: "No results to scrape.",
        });
      }

      // ================================================================
      // STEP 5 – VALIDATE
      // ================================================================
      let validationReport: string;
      try {
        send("step_update", {
          stepType: "validate",
          status: "running",
          content: "Cross-referencing findings and verifying accuracy…",
        });
        await saveStep("validate", "Validate Findings", "running", 5);

        const sourceList = allSearchResults
          .map((r, i) => `${i + 1}. [${r.name ?? "Untitled"}](${r.url}) — ${r.snippet ?? ""}`)
          .join("\n");

        const scrapeList = scrapedPages
          .map((p) => `### ${p.title}\nSource: ${p.url}\n${p.content.slice(0, 2000)}`)
          .join("\n\n---\n\n");

        const validatePrompt = `You are a fact-checker and quality analyst. Review these search results and scraped content. Assess:
1) Source reliability — Are the sources credible and authoritative?
2) Information consistency — Do multiple sources agree?
3) Completeness — How well does the information cover the original query?
4) Contradictions or gaps — Note any conflicting information or missing areas.

Original query: ${query}

Search Results:
${sourceList || "No search results available."}

Scraped Content:
${scrapeList || "No scraped content available."}

Provide your assessment as a concise evaluation (2-4 paragraphs).`;

        validationReport = await callLLM(zai, [
          { role: "assistant", content: validatePrompt },
          { role: "user", content: `Validate findings for: ${query}` },
        ]);

        await saveStep(
          "validate",
          "Validate Findings",
          "completed",
          5,
          validationReport
        );

        send("step_update", {
          stepType: "validate",
          status: "completed",
          content: "Validation complete. Findings assessed.",
        });
      } catch (err) {
        fail(err, "VALIDATE step failed");
        validationReport = "Validation step encountered an error. Proceeding with available data.";
        await saveStep("validate", "Validate Findings", "failed", 5, String(err));
        send("step_update", {
          stepType: "validate",
          status: "failed",
          content: "Validation failed, proceeding with available data.",
        });
      }

      // ================================================================
      // STEP 6 – RESPOND (generate final report)
      // ================================================================
      let finalReport: string;
      try {
        send("step_update", {
          stepType: "respond",
          status: "running",
          content: "Generating comprehensive research report…",
        });
        await saveStep("respond", "Generate Report", "running", 6);

        const sourcesList = allSearchResults
          .map((r, i) => `${i + 1}. **${r.name ?? "Untitled"}** — [${r.url}](${r.url})${r.snippet ? `\n   ${r.snippet}` : ""}`)
          .join("\n");

        const scrapedContentSummary = scrapedPages
          .map(
            (p) =>
              `### ${p.title}\nSource: ${p.url}\n${p.content.slice(0, 3000)}`
          )
          .join("\n\n---\n\n");

        const respondPrompt = `Generate a comprehensive, well-structured markdown research report.

## Context
- **Original Query:** ${query}
- **Research Type:** ${analysis.researchType}
- **Topics Investigated:** ${analysis.keyTopics.join(", ")}

## Available Sources
${sourcesList || "No sources available."}

## Scraped Content
${scrapedContentSummary || "No scraped content available."}

## Quality Assessment
${validationReport}

## Instructions
Write a comprehensive report with:
1. **Executive Summary** — A concise overview of key findings (2-3 paragraphs)
2. **Detailed Findings** — Organized by topic with headers, using bullet points and bold text for key facts
3. **Key Insights** — The most important takeaways
4. **Source References** — Numbered reference list at the end linking back to sources

Use proper markdown formatting: headers (##, ###), bullet points, bold text, and numbered references like [1], [2], etc. Make the report informative, well-organized, and professional.`;

        finalReport = await callLLM(zai, [
          { role: "assistant", content: respondPrompt },
          { role: "user", content: `Write the report for: ${query}` },
        ]);

        await saveStep("respond", "Generate Report", "completed", 6, finalReport);

        // Save report to session
        await db.researchSession.update({
          where: { id: sessionId },
          data: {
            report: finalReport,
            summary: finalReport.slice(0, 500),
            status: "completed",
          },
        });

        send("report", { report: finalReport });
        send("step_update", {
          stepType: "respond",
          status: "completed",
          content: "Report generated successfully.",
        });
      } catch (err) {
        fail(err, "RESPOND step failed");
        finalReport = `# Research Report\n\n**Query:** ${query}\n\n> An error occurred while generating the final report. Please try again.\n\n${scrapedPages.length > 0 ? `## Available Findings\n\n${scrapedPages.map((p) => `- [${p.title}](${p.url})`).join("\n")}` : "No findings were available."}`;

        await saveStep("respond", "Generate Report", "failed", 6, String(err));

        await db.researchSession.update({
          where: { id: sessionId },
          data: { status: "failed" },
        });

        send("report", { report: finalReport });
        send("step_update", {
          stepType: "respond",
          status: "failed",
          content: "Report generation failed.",
        });
      }

      // ================================================================
      // DONE
      // ================================================================
      send("done", { sessionId, status: "completed" });
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
