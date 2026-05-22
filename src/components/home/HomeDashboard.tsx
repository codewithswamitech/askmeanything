'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { Paperclip, ChevronDown, Sparkles, Building2, User, Globe, FileText, CheckCircle2, Shield, ArrowRight, History as HistoryIcon, LayoutTemplate, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  query: string;
  status: string;
  resultCount: number;
  createdAt: string;
}

const frames = [
  { icon: Building2, title: 'Competitive analysis', desc: 'Map a market in one pass', query: 'Conduct a competitive analysis of ' },
  { icon: User, title: 'Person deep-dive', desc: 'Profile a leader or expert', query: 'Provide a detailed professional profile of ' },
  { icon: Globe, title: 'Industry landscape', desc: 'Trends, players, signals', query: 'Analyze the current landscape and trends in ' },
  { icon: FileText, title: 'Document Q&A', desc: 'Read, summarize, extract', query: 'Summarize and analyze the key points about ' },
  { icon: CheckCircle2, title: 'Quick fact-check', desc: 'Verify a claim across sources', query: 'Fact-check this claim and provide evidence: ' },
  { icon: Shield, title: 'Compliance & policy', desc: 'Regulatory scan & cite', query: 'Provide a regulatory and compliance analysis for ' },
];

export function HomeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [detailLevel, setDetailLevel] = useState(searchParams.get('detail') || 'High');
  const [webSearchOn, setWebSearchOn] = useState(true);
  const [persona, setPersona] = useState('Analyst');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) queueMicrotask(() => setQuery(q));
  }, [searchParams]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const params = new URLSearchParams();
        if (user?.id) params.set('userId', user.id);
        params.set('limit', '4');
        const res = await fetch(`/api/agent/history?${params}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.items || []);
        }
      } catch { /* silent */ }
    }
    loadHistory();
  }, [user]);

  const handleStart = () => {
    if (!query.trim()) return;
    router.push(`/session/new?q=${encodeURIComponent(query)}`);
  };

  const handleFrameClick = (frameQuery: string) => {
    setQuery(frameQuery);
  };

  const relativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Good evening, Claudius</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span>{format(new Date(), 'EEE, MMM d · h:mm a')}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0F3B7A]">
          What would you like to research?
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mt-4">
          Ask anything — a person, a product, a market. The agent plans, searches, scrapes, validates and writes a structured report you can cite from.
        </p>
      </div>

      {/* Main Search Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 mb-12">
        <div className="flex gap-3 p-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#0F3B7A] flex items-center justify-center text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything — e.g. &quot;Latest moves in Indian insurance digital channels&quot;"
            className="w-full min-h-[60px] resize-none bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400 mt-1.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleStart();
              }
            }}
          />
        </div>
        
        <div className="flex items-center justify-between border-t px-4 py-3 bg-white rounded-b-2xl" ref={dropdownRef}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Detail Level */}
            <div className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === 'detail' ? null : 'detail')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-sm font-medium hover:bg-slate-50 transition-colors">
                <span className={cn("h-2 w-2 rounded-full", detailLevel === 'High' ? 'bg-blue-500' : detailLevel === 'Medium' ? 'bg-yellow-500' : 'bg-slate-400')}></span>
                Detail · {detailLevel}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
              </button>
              {openDropdown === 'detail' && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50">
                  {['Low', 'Medium', 'High'].map((level) => (
                    <button key={level} onClick={() => { setDetailLevel(level); setOpenDropdown(null); }} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
                      <span className="font-medium">{level}</span>
                      {detailLevel === level && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Web Search */}
            <button onClick={() => setWebSearchOn(!webSearchOn)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors", webSearchOn ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white text-slate-500")}>
              <Globe className="h-4 w-4" />
              Web search · {webSearchOn ? 'On' : 'Off'}
            </button>

            {/* Persona */}
            <div className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === 'persona' ? null : 'persona')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-sm font-medium hover:bg-slate-50 transition-colors">
                <User className="h-4 w-4 text-blue-500" />
                Persona · {persona}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
              </button>
              {openDropdown === 'persona' && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50">
                  {['Analyst', 'Researcher', 'Journalist', 'Skeptic'].map((p) => (
                    <button key={p} onClick={() => { setPersona(p); setOpenDropdown(null); }} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
                      <span className="font-medium">{p}</span>
                      {persona === p && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              <Paperclip className="h-4 w-4" />
              Attach context
            </button>
            <div className="px-3 py-1 text-xs font-mono text-slate-400 bg-slate-50 rounded border border-slate-200">
              ⌘ K to focus
            </div>
          </div>
          
          <button 
            onClick={handleStart}
            disabled={!query.trim()}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all shadow-sm",
              query.trim() 
                ? "bg-[#0F3B7A] hover:bg-[#0F3B7A]/90" 
                : "bg-[#0F3B7A]/90 cursor-not-allowed"
            )}
          >
            Start research
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Frames */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          Start with a frame
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {frames.map((frame, i) => (
            <button key={i} onClick={() => handleFrameClick(frame.query)} className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0F3B7A]/30 hover:shadow-sm hover:bg-slate-50 text-left transition-all group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                <frame.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-0.5">{frame.title}</h3>
                <p className="text-xs text-slate-500">{frame.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent & Templates grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
              <HistoryIcon className="h-3.5 w-3.5" />
              Recent research
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View all</button>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {history.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">No recent research sessions.</div>
            )}
            {history.map((item, i) => (
              <button key={item.id} onClick={() => router.push(`/session/${item.id}`)} className="w-full flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left group">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.query}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                      <span>{relativeTime(item.createdAt)}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{item.resultCount} sources</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        done
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Templates
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Browse</button>
          </div>
          
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500/30 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
              <div className="flex items-center gap-2 mb-1 relative">
                <h4 className="font-bold text-slate-900 text-sm">Executive brief</h4>
                <span className="px-2 py-0.5 rounded-full bg-[#0F3B7A] text-white text-[10px] font-bold">MOST USED</span>
              </div>
              <p className="text-xs text-slate-500 mb-3 relative">2-page report for leadership</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 relative">
                <CheckCircle2 className="h-3.5 w-3.5" />
                6 steps
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500/30 hover:shadow-sm transition-all cursor-pointer group">
              <h4 className="font-bold text-slate-900 text-sm mb-1">Vendor comparison</h4>
              <p className="text-xs text-slate-500 mb-3">Side-by-side feature matrix</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                7 steps
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
