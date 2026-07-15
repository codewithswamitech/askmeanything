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

// An option like "Other (please specify)" / "Other" that should reveal a free-text input.
const isOtherOption = (opt: string) => /^\s*other\b/i.test(opt) || /please specify/i.test(opt);

export function ClarificationPanel({ questions, sessionId, onSubmit, onSkip }: ClarificationPanelProps) {
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({});
  const [textInput, setTextInput] = React.useState<Record<string, string>>({});
  const [otherInput, setOtherInput] = React.useState<Record<string, string>>({});

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

  // Is the "Other" option currently selected for this question?
  const isOtherSelected = (q: ClarificationQuestion): boolean => {
    const sel = answers[q.id];
    if (Array.isArray(sel)) return sel.some(isOtherOption);
    return typeof sel === 'string' && isOtherOption(sel);
  };

  const handleSubmit = () => {
    const finalAnswers: Record<string, string | string[]> = { ...answers };
    for (const q of questions) {
      if (q.type === 'text') {
        if (textInput[q.id]) finalAnswers[q.id] = textInput[q.id];
        continue;
      }
      // Substitute the literal "Other" choice with the user's typed value.
      const custom = otherInput[q.id]?.trim();
      const sel = finalAnswers[q.id];
      if (custom && Array.isArray(sel)) {
        finalAnswers[q.id] = sel.map((o) => (isOtherOption(o) ? custom : o));
      } else if (custom && typeof sel === 'string' && isOtherOption(sel)) {
        finalAnswers[q.id] = custom;
      }
    }
    onSubmit(sessionId, finalAnswers);
  };

  // A selected "Other" with no typed value isn't a valid answer.
  const isQuestionAnswered = (q: ClarificationQuestion): boolean => {
    if (q.type === 'text') return !!textInput[q.id]?.trim();
    const sel = answers[q.id];
    const hasSelection = Array.isArray(sel) ? sel.length > 0 : !!sel;
    if (!hasSelection) return false;
    if (isOtherSelected(q)) {
      const arr = Array.isArray(sel) ? sel : [];
      const onlyOther = Array.isArray(sel) ? arr.every(isOtherOption) : true;
      if (onlyOther && !otherInput[q.id]?.trim()) return false;
    }
    return true;
  };

  const hasAnyAnswer = questions.some(isQuestionAnswered);

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

              {(q.type === 'single_select' || q.type === 'multi_select') && q.options && isOtherSelected(q) && (
                <input
                  type="text"
                  autoFocus
                  value={otherInput[q.id] || ''}
                  onChange={(e) => setOtherInput((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Please specify..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3B7A]/20 focus:border-[#0F3B7A]"
                />
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
