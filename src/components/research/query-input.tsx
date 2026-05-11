'use client';

import React, { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowUp, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useResearchStore } from '@/lib/store';

export function QueryInput() {
  const { query, setQuery, isProcessing, setProcessing, settings, setSettings } = useResearchStore();
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
  const charCount = query.length;
  const maxChars = 500;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="relative">
        {/* Larger, softer gradient glow effect on focus */}
        <motion.div
          className="absolute -inset-[3px] rounded-2xl bg-gradient-to-r from-emerald-500/40 via-teal-400/30 to-emerald-500/40 opacity-0 blur-md"
          animate={{
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        <div className={`relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-lg transition-all duration-300 dark:shadow-black/20 ${
          isFocused 
            ? 'border-emerald-500/30 shadow-emerald-500/5' 
            : 'border-border shadow-sm'
        } ${
          isProcessing ? 'opacity-60 pointer-events-none' : ''
        }`}>
          {/* Label + Settings */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="research-query"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Sparkles className={`h-4 w-4 transition-colors duration-300 ${isFocused ? 'text-emerald-500' : 'text-emerald-500/70'}`} />
              Research Query
            </label>

            {/* Settings popover */}
            {!isProcessing && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Research Settings</h4>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Max Sources</Label>
                      <Select
                        value={String(settings.maxSources)}
                        onValueChange={(v) => setSettings({ ...settings, maxSources: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 sources</SelectItem>
                          <SelectItem value="10">10 sources</SelectItem>
                          <SelectItem value="15">15 sources</SelectItem>
                          <SelectItem value="20">20 sources</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Pages to Scrape</Label>
                      <Select
                        value={String(settings.pagesToScrape)}
                        onValueChange={(v) => setSettings({ ...settings, pagesToScrape: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 pages</SelectItem>
                          <SelectItem value="3">3 pages</SelectItem>
                          <SelectItem value="5">5 pages</SelectItem>
                          <SelectItem value="8">8 pages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {settings.maxSources} sources
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                        {settings.pagesToScrape} pages
                      </Badge>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Active settings badges */}
          {(settings.maxSources !== 10 || settings.pagesToScrape !== 5) && !isProcessing && (
            <div className="flex items-center gap-1.5 -mt-1">
              <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 px-2 py-0">
                <Settings2 className="h-2.5 w-2.5" />
                {settings.maxSources} sources · {settings.pagesToScrape} pages
              </Badge>
            </div>
          )}

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
            className="min-h-[100px] resize-none border-0 bg-transparent text-base shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-opacity duration-200"
            rows={3}
          />

          {/* Footer with hint, char count, and submit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                    className="text-xs text-muted-foreground/60"
                  >
                    Press{' '}
                    <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-muted/80 px-1.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      Enter
                    </kbd>{' '}
                    to start
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
              {/* Character count */}
              {charCount > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-[10px] tabular-nums font-medium ${
                    charCount > maxChars * 0.9 
                      ? 'text-amber-500' 
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {charCount}/{maxChars}
                </motion.span>
              )}

              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`gap-2 rounded-xl px-6 shadow-md transition-all duration-200 disabled:opacity-30 disabled:shadow-none ${
                    canSubmit
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-500/20 text-white'
                      : ''
                  }`}
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
      </div>
    </motion.div>
  );
}
