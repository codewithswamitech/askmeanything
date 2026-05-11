'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sparkles, PanelLeftClose, PanelLeft, RotateCcw, Timer, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueryInput } from '@/components/research/query-input';
import { AgentSteps } from '@/components/research/agent-steps';
import { ResultsPanel } from '@/components/research/results-panel';
import { HistoryPanel } from '@/components/research/history-panel';
import { EmptyState } from '@/components/research/empty-state';
import { ThemeToggle } from '@/components/research/theme-toggle';
import { useResearchStore } from '@/lib/store';
import { toast } from 'sonner';

export default function Home() {
  const store = useResearchStore();
  const {
    isProcessing,
    history,
    setProcessing,
    setSessionId,
    setHistory,
    addOrUpdateStep,
    addSearchResult,
    addScrapedResult,
    setReport,
    setQuery,
    resetSession,
    startTimer,
    tickTimer,
    stopTimer,
    setElapsedSeconds,
    elapsedSeconds,
    startTime,
  } = store;

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const hasStartedResearch = useResearchStore((s) => s.currentSessionId !== null || s.isProcessing);
  const abortRef = useRef<AbortController | null>(null);
  const [scrolled, setScrolled] = React.useState(false);

  // Track scroll position for header opacity
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      startTimer();

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const response = await fetch('/api/agent/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, settings: useResearchStore.getState().settings }),
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

          // Parse complete SSE events (split on double newline)
          // Keep incomplete data in buffer for next chunk
          const parts = buffer.split('\n\n');
          // The last part may be incomplete
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const lines = part.split('\n');
            let currentEvent = '';
            let currentData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                currentEvent = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                currentData = line.slice(6);
              }
            }

            if (currentEvent && currentData) {
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
                    if (data.status === 'completed') {
                      toast.success('Research Complete!', {
                        description: `Your report on '${query}' is ready to view.`,
                        action: {
                          label: 'View Report',
                          onClick: () => {
                            const reportTab = document.querySelector('[value="report"]') as HTMLElement;
                            reportTab?.click();
                          },
                        },
                        duration: 6000,
                      });
                    }
                    break;
                }
              } catch {
                // Ignore JSON parse errors for partial events
              }
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
        stopTimer();
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
        steps: Array<{ stepType: string; stepLabel: string; status: string; content: string | null; order: number; createdAt?: string }>;
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

      // Calculate total duration from step timestamps
      const stepsWithTimestamps = sessionData.session.steps.filter(
        (s) => s.createdAt && (s.status === 'completed' || s.status === 'failed')
      );
      if (stepsWithTimestamps.length >= 2) {
        const timestamps = stepsWithTimestamps.map((s) => new Date(s.createdAt!).getTime());
        const earliest = Math.min(...timestamps);
        const latest = Math.max(...timestamps);
        const durationSeconds = Math.floor((latest - earliest) / 1000);
        if (durationSeconds > 0) {
          startTimer();
          setElapsedSeconds(durationSeconds);
        }
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
    [resetSession, setQuery, setSessionId, addOrUpdateStep, addSearchResult, addScrapedResult, setReport, startTimer, setElapsedSeconds]
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

  // Elapsed timer tick
  useEffect(() => {
    if (!isProcessing || startTime === null) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isProcessing, startTime, tickTimer]);

  // Format elapsed seconds
  const formatElapsed = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K — Focus the query input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('research-query')?.focus();
        return;
      }

      // Escape — Cancel research or close mobile sidebar
      if (e.key === 'Escape') {
        if (isProcessing) {
          abortRef.current?.abort();
          resetSession();
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
        return;
      }

      // Ctrl/Cmd + Enter — Submit research
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const textarea = document.getElementById('research-query') as HTMLTextAreaElement | null;
        if (textarea) {
          const query = textarea.value.trim();
          if (query && !isProcessing) {
            startResearch(query);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, sidebarOpen, resetSession, startResearch]);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between px-4 lg:px-6 transition-all duration-300 backdrop-blur-md ${scrolled ? 'bg-background/95 shadow-sm' : 'bg-background/80'}`}>
        {/* Shimmer gradient border-bottom (emerald to teal) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] header-shimmer-border" />

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
          <div className="flex items-center gap-2.5">
            {/* Logo with animated glow border */}
            <motion.div
              className="relative flex h-9 w-9 items-center justify-center rounded-xl"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(16,185,129,0.2), 0 0 0 0 rgba(20,184,166,0.1)',
                  '0 0 12px 2px rgba(16,185,129,0.25), 0 0 20px 4px rgba(20,184,166,0.1)',
                  '0 0 0 0 rgba(16,185,129,0.2), 0 0 0 0 rgba(20,184,166,0.1)',
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20" />
              <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm border border-emerald-500/20">
                <Sparkles className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-sm font-semibold leading-none tracking-tight">Research Agent</h1>
              {history.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {history.length} research session{history.length !== 1 ? 's' : ''} completed
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Processing badge with pulsing animation + timer */}
          <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 shadow-sm shadow-amber-500/10 dark:bg-amber-500/10 dark:shadow-amber-500/5">
                <motion.div
                  className="relative flex h-2 w-2 items-center justify-center"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </motion.div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Processing...
                </span>
                {elapsedSeconds > 0 && (
                  <span className="flex items-center gap-1 text-[11px] tabular-nums text-amber-600/80 dark:text-amber-400/80">
                    <Timer className="h-3 w-3" />
                    {formatElapsed(elapsedSeconds)}
                  </span>
                )}
              </div>
              {/* Cancel button */}
              <motion.button
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 0 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  abortRef.current?.abort();
                  resetSession();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:border-red-500/20 dark:hover:text-red-400"
                title="Cancel research"
              >
                <X className="h-3.5 w-3.5" />
              </motion.button>
            </motion.div>
          )}
          </AnimatePresence>
          {/* Completed timer badge */}
          {!isProcessing && hasStartedResearch && elapsedSeconds > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 shadow-sm dark:bg-emerald-500/10"
            >
              <Timer className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatElapsed(elapsedSeconds)}
              </span>
            </motion.div>
          )}
          {hasStartedResearch && !isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-200"
              onClick={() => {
                abortRef.current?.abort();
                resetSession();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Research
            </Button>
          )}
          <ThemeToggle />
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
                className="page-transition"
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
                {/* Muted mesh gradient background for research view */}
                <div className="pointer-events-none absolute inset-0 -z-10 mesh-gradient-muted" />

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

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="group shrink-0 border-t bg-background/80 backdrop-blur-sm transition-all duration-300 hover:bg-background/95">
        {/* Animated gradient separator line */}
        <div className="h-px animated-divider" />
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-2.5 px-4">
          <span className="h-3 w-[1px] bg-border" />
          <span className="text-[11px] text-muted-foreground/60 transition-colors duration-300 group-hover:text-muted-foreground/80">
            Powered by AI Research Agent · Built with Next.js
          </span>
          <span className="h-3 w-[1px] bg-border" />
          <span className="group/badge inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground/50 transition-all duration-300 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 group-hover:text-emerald-600/80 dark:group-hover:text-emerald-400/80 group-hover/badge:animate-[version-glow_2s_ease-in-out_infinite]">
            v1.0.0
          </span>
        </div>
      </footer>
    </div>
  );
}
