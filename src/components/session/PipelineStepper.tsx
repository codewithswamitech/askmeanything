'use client';

import { useResearchStore } from '@/lib/store';
import { Check, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PipelineStepper() {
  const steps = useResearchStore((s) => s.steps);
  const isProcessing = useResearchStore((s) => s.isProcessing);
  
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900">Agent pipeline</h3>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            {completedCount} of {totalCount} complete
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-slate-900">{progressPercent}% done</span>
            {isProcessing && <span className="text-slate-500 font-medium">· calculating remaining...</span>}
          </div>
          <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center">
            Details
            <ChevronRight className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Progress Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-in-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="relative flex items-start justify-between">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isRunning = step.status === 'running';
            
            let durationStr = '';
            if (step.completedAt && step.startedAt) {
              durationStr = `${Math.round((step.completedAt - step.startedAt) / 1000)}s`;
            } else if (isRunning && step.startedAt) {
              // We could have a local tick here, but for now we'll just leave it or let the main elapsed handle it
              durationStr = '...';
            }

            return (
              <div key={step.stepType} className="flex flex-col items-center gap-3 w-32 relative group">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border-2 bg-white transition-colors z-10",
                  isCompleted ? "border-blue-600 bg-blue-600 text-white" : 
                  isRunning ? "border-blue-600 text-blue-600 shadow-sm shadow-blue-500/20" : "border-slate-200 text-slate-400"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> :
                   isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> :
                   <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                
                <div className="text-center">
                  <div className={cn(
                    "text-sm font-bold mb-0.5 transition-colors",
                    isCompleted || isRunning ? "text-slate-900" : "text-slate-500"
                  )}>
                    {step.stepLabel}
                  </div>
                  <div className="text-xs text-slate-500 font-medium h-4">
                    {durationStr || step.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
