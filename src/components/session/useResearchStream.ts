'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useResearchStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { toast } from 'sonner';

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'text';
  options?: string[];
}

export interface ClarificationState {
  isPending: boolean;
  questions: ClarificationQuestion[];
  sessionId: string;
  summary: string;
}

export function useResearchSession(sessionId: string, initialQuery: string | null) {
  const store = useResearchStore();
  const { user } = useAuthStore();
  const abortRef = useRef<AbortController | null>(null);

  const [clarification, setClarification] = useState<ClarificationState>({
    isPending: false,
    questions: [],
    sessionId: '',
    summary: '',
  });

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
    plan: 'Plan',
    search: 'Explore',
    scrape: 'Scrape',
    validate: 'Validate',
    respond: 'Report',
  };

  const processStream = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>, query: string) => {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n');
        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) currentData = line.slice(6);
        }

        if (currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);

            switch (currentEvent) {
              case 'clarification_required':
                store.addOrUpdateStep({
                  stepType: 'understand',
                  stepLabel: 'Understand Query',
                  status: 'completed',
                  content: data.questions ? `Found ${data.questions.length} clarifications` : 'Analysis complete',
                  order: 0,
                  startedAt: null,
                  completedAt: null,
                });
                setClarification({
                  isPending: true,
                  questions: data.questions || [],
                  sessionId: data.sessionId || '',
                  summary: data.summary || '',
                });
                store.stopTimer();
                store.setProcessing(false);
                return;

              case 'step_update': {
                const mappedType = stepTypeMap[data.stepType] || data.stepType;
                const label = stepLabelMap[data.stepType] || data.stepType;
                store.addOrUpdateStep({
                  stepType: mappedType,
                  stepLabel: label,
                  status: data.status,
                  content: data.content || null,
                  order: 0,
                  startedAt: null,
                  completedAt: null,
                });
                break;
              }
              case 'search_result':
                store.addSearchResult({
                  url: data.url,
                  title: data.title,
                  snippet: data.snippet || data.content,
                  hostName: data.hostName || (data.url ? new URL(data.url).hostname.replace('www.', '') : 'Web'),
                });
                break;
              case 'scrape_result':
                store.addScrapedResult({
                  url: data.url,
                  title: data.title,
                  content: data.content,
                });
                break;
              case 'report':
                store.setReport(data.report);
                break;
              case 'done':
                if (data.sessionId) {
                  store.setSessionId(data.sessionId);
                  // Update URL without a full page reload so it reflects the actual session ID
                  if (typeof window !== 'undefined' && window.history) {
                    window.history.replaceState(null, '', `/session/${data.sessionId}`);
                  }
                }
                if (data.status === 'completed') {
                  store.setShowCelebration(true);
                  setTimeout(() => store.setShowCelebration(false), 3000);
                  toast.success('Research Complete!', {
                    description: `Your report on '${query}' is ready.`,
                  });
                }
                break;
            }
          } catch {
            // Ignore partial JSON parse errors
          }
        }
      }
    }
  }, [store]);

  const startResearch = useCallback(async (query: string, userAnswers?: Record<string, string | string[]>) => {
    // If we're already processing THIS exact query and haven't changed sessions, do nothing
    if (store.isProcessing && store.query === query) return;

    // Abort any previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    store.resetSession();
    setClarification({ isPending: false, questions: [], sessionId: '', summary: '' });
    store.setQuery(query);
    store.setProcessing(true);
    store.startTimer();

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch('/api/agent/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          settings: store.settings,
          userId: user?.id || null,
          ...(userAnswers ? { userAnswers: JSON.stringify(userAnswers), sessionId: clarification.sessionId } : {}),
        }),
        signal: abort.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      await processStream(reader, query);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Research failed:', err);
        toast.error('Research failed', { description: (err as Error).message });
      }
    } finally {
      store.stopTimer();
      store.setProcessing(false);
      abortRef.current = null;
    }
  }, [store, user, clarification.sessionId, processStream]);

  const answerClarification = useCallback(async (sessionId: string, answers: Record<string, string | string[]>) => {
    setClarification((prev) => ({ ...prev, isPending: false }));
    store.setProcessing(true);
    store.startTimer();

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch('/api/agent/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: store.query,
          settings: store.settings,
          userId: user?.id || null,
          sessionId,
          userAnswers: JSON.stringify(answers),
        }),
        signal: abort.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      await processStream(reader, store.query);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Research failed:', err);
        toast.error('Research failed', { description: (err as Error).message });
      }
    } finally {
      store.stopTimer();
      store.setProcessing(false);
      abortRef.current = null;
    }
  }, [store, user, processStream]);

  const skipClarification = useCallback(() => {
    answerClarification(clarification.sessionId, { skipped: 'true' });
  }, [clarification.sessionId, answerClarification]);

  const regenerateReport = useCallback(async () => {
    if (!sessionId || sessionId === 'new') return;
    
    store.setProcessing(true);
    store.startTimer();
    
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch('/api/agent/research/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        signal: abort.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      await processStream(reader, store.query);
      toast.success('Report regenerated successfully!');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Regeneration failed:', err);
        toast.error('Regeneration failed', { description: (err as Error).message });
      }
    } finally {
      store.stopTimer();
      store.setProcessing(false);
      abortRef.current = null;
    }
  }, [sessionId, store, processStream]);

  const loadSession = useCallback(async (id: string) => {
    store.resetSession();
    store.setSessionId(id);
    try {
      const res = await fetch(`/api/agent/session/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const session = data.session;
      if (!session) return;

      store.setQuery(session.query);
      for (const step of session.steps || []) {
        store.addOrUpdateStep({
          stepType: stepTypeMap[step.stepType] || step.stepType,
          stepLabel: step.stepLabel || step.stepType,
          status: step.status,
          content: step.content,
          order: step.order,
          startedAt: null,
          completedAt: null,
        });
      }
      for (const result of session.results || []) {
        store.addSearchResult({
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          hostName: result.hostName,
        });
        if (result.scraped && result.fullContent) {
          store.addScrapedResult({
            url: result.url,
            title: result.title,
            content: result.fullContent,
          });
        }
      }
      if (session.report) store.setReport(session.report);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, [store]);

  useEffect(() => {
    // We only want to trigger the initial research ONCE per mount/session.
    if (sessionId === 'new' && initialQuery) {
      if (store.query === initialQuery) return; // Prevent loop if already started
      
      const timeoutId = setTimeout(() => {
        startResearch(initialQuery);
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (sessionId !== 'new') {
      if (store.currentSessionId === sessionId) return;
      
      const timeoutId = setTimeout(() => {
        loadSession(sessionId);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [sessionId, initialQuery, store.query, store.currentSessionId, startResearch, loadSession]);

  useEffect(() => {
    if (!store.isProcessing || store.startTime === null) return;
    const interval = setInterval(() => {
      store.tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [store.isProcessing, store.startTime, store.tickTimer]);

  return {
    clarification,
    answerClarification,
    skipClarification,
    regenerateReport,
    startResearch
  };
}
