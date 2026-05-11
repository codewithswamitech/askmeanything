'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sparkles, PanelLeftClose, PanelLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueryInput } from '@/components/research/query-input';
import { AgentSteps } from '@/components/research/agent-steps';
import { ResultsPanel } from '@/components/research/results-panel';
import { HistoryPanel } from '@/components/research/history-panel';
import { EmptyState } from '@/components/research/empty-state';
import { useResearchStore } from '@/lib/store';

export default function Home() {
  const store = useResearchStore();
  const {
    isProcessing,
    setProcessing,
    setSessionId,
    setHistory,
    addOrUpdateStep,
    addSearchResult,
    addScrapedResult,
    setReport,
    setQuery,
    resetSession,
  } = store;

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const hasStartedResearch = useResearchStore((s) => s.currentSessionId !== null || s.isProcessing);
  const abortRef = useRef<AbortController | null>(null);

  // Step type mapping: backend → frontend store types
  const stepTypeMap: Record<string, string> = {
    understand: 'understand',
    plan: 'plan',
    search: 'explore',
    scrape: 'scrape',
    validate: 'validate',
    respond: 'report',
  };

  const stepLabelMap: Record<string, string> = {
    understand: 'Understand Query',
    plan: 'Plan Search Strategy',
    search: 'Explore Web',
    scrape: 'Scrape Pages',
    validate: 'Validate Findings',
    respond: 'Generate Report',
  };

  // Start research via SSE
  const startResearch = useCallback(
    async (query: string) => {
      if (isProcessing) return;

      // Reset previous session state
      resetSession();
      setQuery(query);
      setProcessing(true);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const response = await fetch('/api/agent/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: abort.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Set a placeholder session ID so the UI switches to research view
        setSessionId('active');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events
          const lines = buffer.split('\n');
          buffer = '';

          let currentEvent = '';
          let currentData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '' && currentEvent && currentData) {
              // Empty line = end of event
              try {
                const data = JSON.parse(currentData);

                switch (currentEvent) {
                  case 'step_update': {
                    const mappedType = stepTypeMap[data.stepType] || data.stepType;
                    const label = stepLabelMap[data.stepType] || data.stepType;
                    addOrUpdateStep({
                      stepType: mappedType,
                      stepLabel: label,
                      status: data.status,
                      content: data.content || null,
                      order: 0,
                    });
                    break;
                  }
                  case 'search_result':
                    addSearchResult({
                      url: data.url,
                      title: data.title,
                      snippet: data.snippet,
                      hostName: data.hostName,
                    });
                    break;
                  case 'scrape_result':
                    addScrapedResult({
                      url: data.url,
                      title: data.title,
                      content: data.content,
                    });
                    break;
                  case 'report':
                    setReport(data.report);
                    break;
                  case 'done':
                    if (data.sessionId) {
                      setSessionId(data.sessionId);
                    }
                    break;
                }
              } catch {
                // Ignore JSON parse errors for partial events
              }

              currentEvent = '';
              currentData = '';
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Research failed:', err);
          addOrUpdateStep({
            stepType: 'understand',
            stepLabel: 'Understand Query',
            status: 'failed',
            content: `Research failed: ${(err as Error).message}`,
            order: 0,
          });
        }
      } finally {
        setProcessing(false);
        abortRef.current = null;
        // Refresh history
        try {
          const res = await fetch('/api/agent/history');
          if (res.ok) {
            const data = await res.json();
            setHistory(data.sessions || []);
          }
        } catch {
          // silently fail
        }
      }
    },
    [
      isProcessing,
      resetSession,
      setQuery,
      setProcessing,
      setSessionId,
      addOrUpdateStep,
      addSearchResult,
      addScrapedResult,
      setReport,
      setHistory,
    ]
  );

  // Load a saved session
  const loadSession = useCallback(
    async (sessionData: {
      session: {
        id: string;
        query: string;
        report: string | null;
        summary: string | null;
        steps: Array<{ stepType: string; stepLabel: string; status: string; content: string | null; order: number }>;
        results: Array<{ url: string; title: string; snippet: string | null; hostName: string | null; fullContent: string | null; scraped: boolean }>;
      };
    }) => {
      resetSession();
      setQuery(sessionData.session.query);
      setSessionId(sessionData.session.id);

      // Load steps
      for (const step of sessionData.session.steps) {
        const mappedType = stepTypeMap[step.stepType] || step.stepType;
        addOrUpdateStep({
          stepType: mappedType,
          stepLabel: step.stepLabel,
          status: step.status as 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
          content: step.content,
          order: step.order,
        });
      }

      // Load results
      for (const result of sessionData.session.results) {
        addSearchResult({
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          hostName: result.hostName,
        });
        if (result.scraped && result.fullContent) {
          addScrapedResult({
            url: result.url,
            title: result.title,
            content: result.fullContent,
          });
        }
      }

      // Load report
      if (sessionData.session.report) {
        setReport(sessionData.session.report);
      }
    },
    [resetSession, setQuery, setSessionId, addOrUpdateStep, addSearchResult, addScrapedResult, setReport]
  );

  // Listen for submit events
  useEffect(() => {
    const handleSubmit = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      startResearch(customEvent.detail.query);
    };

    const handleLoadSession = (e: Event) => {
      const customEvent = e as CustomEvent;
      loadSession(customEvent.detail);
    };

    window.addEventListener('research:submit', handleSubmit);
    window.addEventListener('research:load-session', handleLoadSession);
    return () => {
      window.removeEventListener('research:submit', handleSubmit);
      window.removeEventListener('research:load-session', handleLoadSession);
    };
  }, [startResearch, loadSession]);

  // Fetch history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/agent/history');
        if (res.ok) {
          const data = await res.json();
          setHistory(data.sessions || []);
        }
      } catch {
        // Silently fail
      }
    }
    fetchHistory();
  }, [setHistory]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-9 w-9"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Research Agent</h1>
              <p className="text-[10px] text-muted-foreground">AI-Powered Web Research</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-500/10"
            >
              <motion.div
                className="h-2 w-2 rounded-full bg-amber-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Processing...
              </span>
            </motion.div>
          )}
          {hasStartedResearch && !isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                abortRef.current?.abort();
                resetSession();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Research
            </Button>
          )}
        </div>
      </header>

      {/* ─── Main Layout ────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ─── Sidebar (History) ────────────────────────────────── */}
        <AnimatePresence>
          {(sidebarOpen || (!sidebarCollapsed)) && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 overflow-hidden border-r bg-card/50 backdrop-blur-sm"
            >
              <HistoryPanel />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ─── Mobile sidebar overlay ───────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* ─── Content ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!hasStartedResearch ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <EmptyState />
                <div className="px-4 pb-8 sm:px-6 lg:px-8">
                  <QueryInput />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="research"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col"
              >
                {/* Query input (sticky top) */}
                <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg px-4 py-3 sm:px-6 lg:px-8">
                  <QueryInput />
                </div>

                {/* Agent Steps + Results layout */}
                <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
                  {/* Agent Steps sidebar */}
                  <div className="w-full shrink-0 border-b p-4 sm:p-6 lg:w-80 xl:w-96 lg:border-b-0 lg:border-r lg:overflow-y-auto">
                    <AgentSteps />
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <ResultsPanel />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
