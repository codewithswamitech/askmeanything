'use client';

import React, { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useResearchStore } from '@/lib/store';

export function QueryInput() {
  const { query, setQuery, isProcessing, setProcessing } = useResearchStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || isProcessing) return;
    setProcessing(true);
    // Dispatch a custom event so the page can listen and trigger the API call
    window.dispatchEvent(
      new CustomEvent('research:submit', { detail: { query: trimmed } })
    );
  }, [query, isProcessing, setProcessing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSubmit = query.trim().length > 0 && !isProcessing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="relative">
        {/* Gradient border effect on focus */}
        <motion.div
          className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 opacity-0 blur-sm"
          animate={{
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1.02 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        <div className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg transition-shadow duration-300 dark:shadow-black/20">
          {/* Label */}
          <label
            htmlFor="research-query"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Research Query
          </label>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            id="research-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="What would you like to research? e.g., 'Find details about Elon Musk and his companies'"
            disabled={isProcessing}
            className="min-h-[100px] resize-none border-0 bg-transparent text-base shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            rows={3}
          />

          {/* Footer with hint and submit */}
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.span
                  key="processing"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Research in progress...
                </motion.span>
              ) : (
                <motion.span
                  key="hint"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-xs text-muted-foreground"
                >
                  Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd> to start
                </motion.span>
              )}
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="gap-2 rounded-xl bg-primary px-6 shadow-md transition-all hover:shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
                {isProcessing ? 'Processing' : 'Research'}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
