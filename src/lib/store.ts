import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentStep {
  stepType: string;
  stepLabel: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  content: string | null;
  order: number;
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

export interface ResearchState {
  currentSessionId: string | null;
  query: string;
  isProcessing: boolean;
  steps: AgentStep[];
  searchResults: SearchResult[];
  scrapedResults: ScrapedResult[];
  report: string | null;
  history: HistoryItem[];

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
}

// ─── Default steps definition ────────────────────────────────────────────────

const DEFAULT_STEPS: AgentStep[] = [
  { stepType: 'understand', stepLabel: 'Understand', status: 'pending', content: null, order: 0 },
  { stepType: 'plan', stepLabel: 'Plan', status: 'pending', content: null, order: 1 },
  { stepType: 'explore', stepLabel: 'Explore', status: 'pending', content: null, order: 2 },
  { stepType: 'scrape', stepLabel: 'Scrape', status: 'pending', content: null, order: 3 },
  { stepType: 'validate', stepLabel: 'Validate', status: 'pending', content: null, order: 4 },
  { stepType: 'report', stepLabel: 'Report', status: 'pending', content: null, order: 5 },
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

  setSessionId: (id) => set({ currentSessionId: id }),

  setQuery: (q) => set({ query: q }),

  setProcessing: (v) => set({ isProcessing: v }),

  addOrUpdateStep: (step) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.stepType === step.stepType ? { ...s, ...step } : s
      ),
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
    }),
}));
