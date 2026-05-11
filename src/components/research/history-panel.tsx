'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  History,
  Inbox,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  ListFilter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useResearchStore, type HistoryItem } from '@/lib/store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  if (isCompleted) {
    return (
      <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400">
        <CheckCircle className="h-3 w-3" />
        Done
      </Badge>
    );
  }

  if (isFailed) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      {status}
    </Badge>
  );
}

// ─── History Item Card ────────────────────────────────────────────────────────

function HistoryItemCard({
  item,
  onClick,
  isActive,
}: {
  item: HistoryItem;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isActive
            ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5'
            : 'hover:border-border'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">{truncate(item.query, 50)}</p>
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="shrink-0"
              >
                <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
              </motion.div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {getRelativeTime(item.createdAt)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {item.stepsCount} steps · {item.resultsCount} results
            </span>
          </div>

          {item.summary && (
            <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-2">
              {truncate(item.summary, 100)}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────

export function HistoryPanel() {
  const history = useResearchStore((s) => s.history);
  const currentSessionId = useResearchStore((s) => s.currentSessionId);
  const [filter, setFilter] = React.useState('');
  const [isLoadingSession, setIsLoadingSession] = React.useState<string | null>(null);

  const filteredHistory = React.useMemo(() => {
    if (!filter.trim()) return history;
    const q = filter.toLowerCase();
    return history.filter(
      (item) =>
        item.query.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q)
    );
  }, [history, filter]);

  const handleLoadSession = React.useCallback(
    async (id: string) => {
      if (isLoadingSession || currentSessionId === id) return;
      setIsLoadingSession(id);
      try {
        const res = await fetch(`/api/agent/session/${id}`);
        if (res.ok) {
          const data = await res.json();
          // Dispatch a custom event so the page can handle session loading
          window.dispatchEvent(
            new CustomEvent('research:load-session', { detail: data })
          );
        }
      } catch {
        // Silently fail — could add toast notification here
      } finally {
        setIsLoadingSession(null);
      }
    },
    [isLoadingSession, currentSessionId]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">History</h3>
        {history.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {history.length}
          </Badge>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter history..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 border-none bg-muted/50 pl-8 text-xs shadow-none focus-visible:ring-1"
            />
          </div>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1 px-3">
        {isLoadingSession && (
          <div className="space-y-2 py-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredHistory.length === 0 && !isLoadingSession && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-12 text-center"
            >
              <div className="rounded-full bg-muted p-3">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              {history.length === 0 ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground">
                    No research history
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Start a research session to see it here.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground">
                    No matching results
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Try adjusting your filter.
                  </p>
                </>
              )}
            </motion.div>
          )}

          <div className="space-y-2 pb-3">
            {filteredHistory.map((item) => (
              <HistoryItemCard
                key={item.id}
                item={item}
                isActive={currentSessionId === item.id}
                onClick={() => handleLoadSession(item.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
