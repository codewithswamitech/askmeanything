'use client';

import { useResearchStore } from '@/lib/store';
import { Target, Globe, User, CheckCircle2, ChevronRight, Edit3 } from 'lucide-react';

export function SessionHeader({ sessionId }: { sessionId: string }) {
  const query = useResearchStore((s) => s.query);
  const isProcessing = useResearchStore((s) => s.isProcessing);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase">
        <span className="text-slate-500">RESEARCH SESSION</span>
        <span className="text-slate-400">#{sessionId === 'new' ? 'PENDING' : sessionId.slice(0, 6).toUpperCase()}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        {isProcessing ? (
          <span className="text-orange-600 flex items-center gap-1.5 bg-orange-50 px-2 py-0.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            IN PROGRESS
          </span>
        ) : (
          <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="h-3.5 w-3.5" />
            COMPLETED
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F3B7A] leading-tight">
          {query || 'Untitled Research'}
        </h1>
        <button className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700">
          Edit query
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4" />
          High detail
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4" />
          Web sources
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Cross-validated
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          Analyst persona
        </div>
      </div>
    </div>
  );
}
