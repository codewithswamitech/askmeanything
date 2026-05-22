'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, ArrowRight } from 'lucide-react';

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'text';
  options?: string[];
}

interface ClarificationPanelProps {
  questions: ClarificationQuestion[];
  sessionId: string;
  onSubmit: (sessionId: string, answers: Record<string, string | string[]>) => void;
  onSkip: () => void;
}

export function ClarificationPanel({ questions, sessionId, onSubmit, onSkip }: ClarificationPanelProps) {
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({});
  const [textInput, setTextInput] = React.useState<Record<string, string>>({});

  const handleSelect = (qId: string, option: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const current = prev[qId];
      if (isMulti) {
        const arr = (Array.isArray(current) ? current : []) as string[];
        const updated = arr.includes(option) ? arr.filter((o) => o !== option) : [...arr, option];
        return { ...prev, [qId]: updated };
      }
      return { ...prev, [qId]: option };
    });
  };

  const handleSubmit = () => {
    const finalAnswers: Record<string, string | string[]> = { ...answers };
    for (const q of questions) {
      if (q.type === 'text' && textInput[q.id]) {
        finalAnswers[q.id] = textInput[q.id];
      }
    }
    onSubmit(sessionId, finalAnswers);
  };

  const hasAnyAnswer = Object.keys(answers).length > 0 || Object.keys(textInput).some(k => textInput[k].trim());

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-[#0F3B7A] mb-1">Quick clarifications</h3>
          <p className="text-sm text-slate-500">Help me narrow down the research for better results.</p>
        </div>

        <div className="space-y-5">
          {questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">{q.question}</label>

              {q.type === 'single_select' && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt, false)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                        answers[q.id] === opt
                          ? "bg-[#0F3B7A] text-white border-[#0F3B7A]"
                          : "bg-white border-slate-200 text-slate-700 hover:border-[#0F3B7A]/50"
                      )}
                    >
                      {answers[q.id] === opt && <Check className="h-3.5 w-3.5 mr-1" />}
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'multi_select' && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt, true)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                        Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)
                          ? "bg-[#0F3B7A] text-white border-[#0F3B7A]"
                          : "bg-white border-slate-200 text-slate-700 hover:border-[#0F3B7A]/50"
                      )}
                    >
                      {Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt) && <Check className="h-3.5 w-3.5 mr-1" />}
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'text' && (
                <input
                  type="text"
                  value={textInput[q.id] || ''}
                  onChange={(e) => setTextInput((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Type your answer..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3B7A]/20 focus:border-[#0F3B7A]"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onSkip}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip — proceed with defaults
          </button>
          <button
            onClick={handleSubmit}
            disabled={!hasAnyAnswer}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all shadow-sm",
              hasAnyAnswer ? "bg-[#0F3B7A] hover:bg-[#0F3B7A]/90" : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
