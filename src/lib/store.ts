import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentStep {
  stepType: string;
  stepLabel: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  content: string | null;
  order: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string | null;
  hostName: string | null;
}

export interface ScrapedResult {
  url: string;
  title: string;
  content: string;
}

export interface HistoryItem {
  id: string;
  query: string;
  status: string;
  summary: string | null;
  createdAt: string;
  stepsCount: number;
  resultsCount: number;
}

export interface ResearchSettings {
  maxSources: number;
  pagesToScrape: number;
}

export interface ResearchState {
  currentSessionId: string | null;
  query: string;
  isProcessing: boolean;
  steps: AgentStep[];
  searchResults: SearchResult[];
  scrapedResults: ScrapedResult[];
  report: string | null;
  history: HistoryItem[];
  settings: ResearchSettings;

  // Elapsed timer
  startTime: number | null;
  elapsedSeconds: number;

  // Opened sources tracker
  openedSources: Set<string>;

  // Actions
  setSessionId: (id: string | null) => void;
  setQuery: (q: string) => void;
  setProcessing: (v: boolean) => void;
  addOrUpdateStep: (step: AgentStep) => void;
  addSearchResult: (result: SearchResult) => void;
  addScrapedResult: (result: ScrapedResult) => void;
  setReport: (r: string) => void;
  setHistory: (items: HistoryItem[]) => void;
  resetSession: () => void;
  setSettings: (settings: ResearchSettings) => void;
  startTimer: () => void;
  tickTimer: () => void;
  stopTimer: () => void;
  setElapsedSeconds: (seconds: number) => void;
  markSourceOpened: (url: string) => void;
}

// ─── Default steps definition ────────────────────────────────────────────────

const DEFAULT_STEPS: AgentStep[] = [
  { stepType: 'understand', stepLabel: 'Understand', status: 'pending', content: null, order: 0, startedAt: null, completedAt: null },
  { stepType: 'plan', stepLabel: 'Plan', status: 'pending', content: null, order: 1, startedAt: null, completedAt: null },
  { stepType: 'explore', stepLabel: 'Explore', status: 'pending', content: null, order: 2, startedAt: null, completedAt: null },
  { stepType: 'scrape', stepLabel: 'Scrape', status: 'pending', content: null, order: 3, startedAt: null, completedAt: null },
  { stepType: 'validate', stepLabel: 'Validate', status: 'pending', content: null, order: 4, startedAt: null, completedAt: null },
  { stepType: 'report', stepLabel: 'Report', status: 'pending', content: null, order: 5, startedAt: null, completedAt: null },
];

// ─── Store ───────────────────────────────────────────────────────────────────

export const useResearchStore = create<ResearchState>((set) => ({
  currentSessionId: null,
  query: '',
  isProcessing: false,
  steps: DEFAULT_STEPS,
  searchResults: [],
  scrapedResults: [],
  report: null,
  history: [],
  settings: {
    maxSources: 10,
    pagesToScrape: 5,
  },

  // Timer
  startTime: null,
  elapsedSeconds: 0,

  // Opened sources
  openedSources: new Set<string>(),

  setSessionId: (id) => set({ currentSessionId: id }),

  setQuery: (q) => set({ query: q }),

  setProcessing: (v) => set({ isProcessing: v }),

  addOrUpdateStep: (step) =>
    set((state) => ({
      steps: state.steps.map((s) => {
        if (s.stepType !== step.stepType) return s;
        const now = Date.now();
        let startedAt = s.startedAt;
        let completedAt = s.completedAt;
        // Track when a step transitions to running
        if (step.status === 'running' && s.status !== 'running') {
          startedAt = now;
          completedAt = null;
        }
        // Track when a step transitions to completed/failed/skipped
        if (
          (step.status === 'completed' || step.status === 'failed' || step.status === 'skipped') &&
          s.status !== step.status
        ) {
          completedAt = now;
        }
        return { ...s, ...step, startedAt, completedAt };
      }),
    })),

  addSearchResult: (result) =>
    set((state) => {
      // Avoid duplicates by URL
      if (state.searchResults.some((r) => r.url === result.url)) return state;
      return { searchResults: [...state.searchResults, result] };
    }),

  addScrapedResult: (result) =>
    set((state) => {
      // Avoid duplicates by URL
      if (state.scrapedResults.some((r) => r.url === result.url)) return state;
      return { scrapedResults: [...state.scrapedResults, result] };
    }),

  setReport: (r) => set({ report: r }),

  setHistory: (items) => set({ history: items }),

  resetSession: () =>
    set({
      currentSessionId: null,
      query: '',
      isProcessing: false,
      steps: DEFAULT_STEPS,
      searchResults: [],
      scrapedResults: [],
      report: null,
      startTime: null,
      elapsedSeconds: 0,
      openedSources: new Set<string>(),
    }),

  setSettings: (settings) => set({ settings }),

  startTimer: () =>
    set({
      startTime: Date.now(),
      elapsedSeconds: 0,
    }),

  tickTimer: () =>
    set((state) => {
      if (state.startTime === null) return state;
      return {
        elapsedSeconds: Math.floor((Date.now() - state.startTime) / 1000),
      };
    }),

  stopTimer: () =>
    set((state) => {
      if (state.startTime === null) return state;
      return {
        elapsedSeconds: Math.floor((Date.now() - state.startTime) / 1000),
        startTime: null,
      };
    }),

  setElapsedSeconds: (seconds) =>
    set({
      elapsedSeconds: seconds,
      startTime: null, // Don't start ticking
    }),

  markSourceOpened: (url) =>
    set((state) => {
      const next = new Set(state.openedSources);
      next.add(url);
      return { openedSources: next };
    }),
}));
