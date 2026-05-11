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
  Trash2,
  Pencil,
  Check,
  X,
  Copy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
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

function getTimeGroup(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    if (date >= todayStart) return 'Today';
    if (date >= yesterdayStart) return 'Yesterday';
    if (date >= weekStart) return 'This Week';
    return 'Older';
  } catch {
    return 'Older';
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
  onDelete,
  onRename,
  onDuplicate,
}: {
  item: HistoryItem;
  onClick: () => void;
  isActive: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, newQuery: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(item.query);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenaming) {
      setRenameValue(item.query);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isRenaming, item.query]);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== item.query) {
      onRename(item.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(item.query);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(item.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={`group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${
          isActive
            ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5'
            : 'hover:border-border/80'
        }`}
        onClick={() => { if (!isRenaming) onClick(); }}
      >
        {/* Slide-in colored left border on hover */}
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-500 to-teal-500 origin-top transition-transform duration-300 rounded-r ${
          isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
        }`} />
        
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleRenameSubmit}
                  className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-emerald-500/50 outline-none py-0.5 text-foreground"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRenameSubmit(); }}
                  className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsRenaming(false); setRenameValue(item.query); }}
                  className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium leading-snug">{truncate(item.query, 50)}</p>
                <div className="flex items-center gap-0.5 shrink-0">
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                    </motion.div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={handleDuplicateClick}
                    title="Duplicate session"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={handleRenameClick}
                    title="Rename session"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground/70 transition-colors duration-200 group-hover:text-muted-foreground/90 group-hover:border-emerald-500/20 group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-500/10 dark:group-hover:text-emerald-400/80">
              <Clock className="h-2.5 w-2.5" />
              {getRelativeTime(item.createdAt)}
            </span>
            <span className="text-[10px] text-muted-foreground/50">
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

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────

export function HistoryPanel() {
  const history = useResearchStore((s) => s.history);
  const setHistory = useResearchStore((s) => s.setHistory);
  const currentSessionId = useResearchStore((s) => s.currentSessionId);
  const [filter, setFilter] = React.useState('');
  const [isLoadingSession, setIsLoadingSession] = React.useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const filteredHistory = React.useMemo(() => {
    if (!filter.trim()) return history;
    const q = filter.toLowerCase();
    return history.filter(
      (item) =>
        item.query.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q)
    );
  }, [history, filter]);

  // Group history by time period
  const groupedHistory = React.useMemo(() => {
    const groups: Array<{ label: string; items: typeof filteredHistory }> = [];
    const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];
    const groupMap = new Map<string, typeof filteredHistory>();

    for (const item of filteredHistory) {
      const group = getTimeGroup(item.createdAt);
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(item);
    }

    for (const label of groupOrder) {
      const items = groupMap.get(label);
      if (items && items.length > 0) {
        groups.push({ label, items });
      }
    }

    return groups;
  }, [filteredHistory]);

  const refreshHistory = React.useCallback(async () => {
    try {
      const res = await fetch('/api/agent/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.sessions || []);
      }
    } catch {
      // silently fail
    }
  }, [setHistory]);

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
        // Silently fail
      } finally {
        setIsLoadingSession(null);
      }
    },
    [isLoadingSession, currentSessionId]
  );

  const handleDeleteAll = React.useCallback(async () => {
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/agent/history', { method: 'DELETE' });
      if (res.ok) {
        toast.success('All history cleared', {
          description: 'All research sessions have been deleted.',
        });
        await refreshHistory();
      } else {
        toast.error('Failed to clear history');
      }
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setIsDeletingAll(false);
    }
  }, [refreshHistory]);

  const handleDeleteSingle = React.useCallback(
    async (id: string) => {
      // Optimistically remove from local state
      setHistory(history.filter((item) => item.id !== id));

      try {
        const res = await fetch(`/api/agent/session/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Session deleted');
        } else {
          toast.error('Failed to delete session');
          // Revert optimistic update on failure
          await refreshHistory();
        }
      } catch {
        toast.error('Failed to delete session');
        await refreshHistory();
      }
    },
    [history, setHistory, refreshHistory]
  );

  const handleRename = React.useCallback(
    async (id: string, newQuery: string) => {
      try {
        const res = await fetch(`/api/agent/session/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: newQuery }),
        });
        if (res.ok) {
          toast.success('Session renamed');
          await refreshHistory();
        } else {
          toast.error('Failed to rename session');
        }
      } catch {
        toast.error('Failed to rename session');
      }
    },
    [refreshHistory]
  );

  const handleDuplicate = React.useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/agent/session/${id}/duplicate`, {
          method: 'POST',
        });
        if (res.ok) {
          toast.success('Session duplicated');
          await refreshHistory();
        } else {
          toast.error('Failed to duplicate session');
        }
      } catch {
        toast.error('Failed to duplicate session');
      }
    },
    [refreshHistory]
  );

  return (
    <div className="flex h-full flex-col max-[360px]:hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">History</h3>
        {history.length > 0 && (
          <>
            <Badge variant="secondary" className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              {history.length}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-500/10"
                  disabled={isDeletingAll}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {history.length} research session(s). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isDeletingAll ? 'Deleting...' : 'Delete all'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* Search with polished focus state */}
      {history.length > 0 && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Filter history..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 border-none bg-muted/50 pl-8 pr-3 text-xs shadow-none transition-all duration-200 focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:bg-muted/80"
            />
          </div>
        </div>
      )}

      {/* List with group headers */}
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
              className="flex flex-col items-center gap-4 py-16 text-center"
            >
              {/* CSS illustration for empty state */}
              <div className="relative mb-2">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
                  {/* Document shape */}
                  <rect x="18" y="10" width="44" height="56" rx="4" className="stroke-emerald-500/60" strokeWidth="1.5" fill="currentColor" style={{ color: 'oklch(0.97 0.02 162 / 0.3)' }} />
                  <rect x="18" y="10" width="44" height="56" rx="4" className="stroke-emerald-500/60 dark:stroke-emerald-400/50" strokeWidth="1.5" fill="none" />
                  {/* Folded corner */}
                  <path d="M48 10L62 24" className="stroke-emerald-500/60 dark:stroke-emerald-400/50" strokeWidth="1.5" fill="none" />
                  <path d="M48 10V24H62" className="stroke-emerald-500/40 dark:stroke-emerald-400/30" strokeWidth="1" fill="none" />
                  {/* Text lines */}
                  <rect x="26" y="32" width="20" height="2" rx="1" className="fill-emerald-500/25 dark:fill-emerald-400/20" />
                  <rect x="26" y="38" width="28" height="2" rx="1" className="fill-emerald-500/20 dark:fill-emerald-400/15" />
                  <rect x="26" y="44" width="16" height="2" rx="1" className="fill-emerald-500/15 dark:fill-emerald-400/10" />
                  {/* Search magnifying glass */}
                  <circle cx="50" cy="56" r="8" className="stroke-emerald-500/50 dark:stroke-emerald-400/40" strokeWidth="1.5" fill="none" />
                  <line x1="56" y1="62" x2="62" y2="68" className="stroke-emerald-500/50 dark:stroke-emerald-400/40" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-xl" />
              </div>
              {history.length === 0 ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground">
                    No research history
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[180px] leading-relaxed">
                    Your research history will appear here. Start a query to begin!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground">
                    No matching results
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[180px]">
                    Try adjusting your filter.
                  </p>
                </>
              )}
            </motion.div>
          )}

          <div className="space-y-1 pb-3">
            {groupedHistory.map((group) => (
              <React.Fragment key={group.label}>
                <GroupHeader label={group.label} />
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      isActive={currentSessionId === item.id}
                      onClick={() => handleLoadSession(item.id)}
                      onDelete={handleDeleteSingle}
                      onRename={handleRename}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
