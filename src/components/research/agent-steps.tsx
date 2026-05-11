'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ClipboardList,
  Globe,
  FileText,
  CheckCircle,
  FileOutput,
  Loader2,
  X,
  Circle,
  Minus,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useResearchStore, type AgentStep } from '@/lib/store';

// ─── Step icon mapping ────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ElementType> = {
  understand: Search,
  plan: ClipboardList,
  explore: Globe,
  scrape: FileText,
  validate: CheckCircle,
  report: FileOutput,
};

const STEP_EMOJIS: Record<string, string> = {
  understand: '🔍',
  plan: '📋',
  explore: '🌐',
  scrape: '📄',
  validate: '✅',
  report: '📝',
};

// ─── Status helpers ───────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: AgentStep['status'] }) {
  switch (status) {
    case 'running':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="flex h-5 w-5 items-center justify-center"
        >
          <Loader2 className="h-5 w-5 text-amber-500" />
        </motion.div>
      );
    case 'completed':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative flex h-5 w-5 items-center justify-center"
        >
          <span className="step-complete-ripple" />
          <CheckCircle className="relative h-5 w-5 text-emerald-500" />
        </motion.div>
      );
    case 'failed':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="flex h-5 w-5 items-center justify-center"
        >
          <X className="h-5 w-5 text-red-500" />
        </motion.div>
      );
    case 'skipped':
      return (
        <div className="flex h-5 w-5 items-center justify-center">
          <Minus className="h-5 w-5 text-muted-foreground" />
        </div>
      );
    case 'pending':
    default:
      return (
        <div className="flex h-5 w-5 items-center justify-center">
          <Circle className="h-4 w-4 text-muted-foreground/40" />
        </div>
      );
  }
}

// ─── Time ago helper ──────────────────────────────────────────────────────────

function getTimeAgo(timestamp: number | null): string | null {
  if (timestamp === null) return null;
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

// ─── Step Copy Button ─────────────────────────────────────────────────────────

function StepCopyButton({ content }: { content: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-muted-foreground hover:bg-muted"
      title="Copy step content"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  isActive,
  isExpanded,
  isLast,
  onToggleExpand,
}: {
  step: AgentStep;
  index: number;
  isActive: boolean;
  isExpanded: boolean;
  isLast: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = STEP_ICONS[step.stepType] || Circle;
  const emoji = STEP_EMOJIS[step.stepType] || '';
  const prevStatusRef = React.useRef(step.status);
  const [justStarted, setJustStarted] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // Detect when a step transitions to running
  React.useEffect(() => {
    if (step.status === 'running' && prevStatusRef.current !== 'running') {
      setJustStarted(true);
      const timer = setTimeout(() => setJustStarted(false), 600);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = step.status;
  }, [step.status]);

  // Compute step duration for completed steps
  const stepDuration = React.useMemo(() => {
    if (step.status !== 'completed' && step.status !== 'failed') return null;
    if (!step.startedAt || !step.completedAt) return null;
    const durationMs = step.completedAt - step.startedAt;
    if (durationMs < 0) return null;
    const durationSec = Math.floor(durationMs / 1000);
    if (durationSec < 60) return `${durationSec}s`;
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    return `${m}m ${s}s`;
  }, [step.status, step.startedAt, step.completedAt]);

  // Time ago for completed steps
  const timeAgo = React.useMemo(() => {
    if (step.status === 'completed' || step.status === 'failed') {
      return getTimeAgo(step.completedAt);
    }
    return null;
  }, [step.status, step.completedAt]);

  // Refresh time ago every 30 seconds
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (timeAgo && timeAgo !== 'just now') {
      const interval = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(interval);
    }
  }, [timeAgo]);

  const glowColor = {
    pending: 'shadow-none',
    running: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    completed: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    failed: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]',
    skipped: 'shadow-none',
  }[step.status];

  const borderColor = {
    pending: 'border-border/40',
    running: 'border-amber-500/60',
    completed: 'border-emerald-500/60',
    failed: 'border-red-500/60',
    skipped: 'border-transparent',
  }[step.status];

  const bgColor = {
    pending: 'bg-muted/30',
    running: 'bg-amber-50 dark:bg-amber-500/10',
    completed: 'bg-emerald-50 dark:bg-emerald-500/10',
    failed: 'bg-red-50 dark:bg-red-500/10',
    skipped: 'bg-muted/30',
  }[step.status];

  const statusBadge = {
    pending: (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Pending
      </Badge>
    ),
    running: (
      <Badge className="bg-amber-500 text-white text-xs hover:bg-amber-500">
        Running
      </Badge>
    ),
    completed: (
      <Badge className="bg-emerald-500 text-white text-xs hover:bg-emerald-500">
        Done
      </Badge>
    ),
    failed: (
      <Badge variant="destructive" className="text-xs">
        Failed
      </Badge>
    ),
    skipped: (
      <Badge variant="secondary" className="text-xs text-muted-foreground">
        Skipped
      </Badge>
    ),
  }[step.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3"
    >
      {/* Vertical connecting line + Node */}
      <div className="relative flex flex-col items-center">
        {/* Step number badge */}
        <div className="absolute -top-1 -left-1 z-10 flex h-4 w-4 items-center justify-center">
          <span className="text-[9px] font-bold text-muted-foreground/50">
            {index + 1}
          </span>
        </div>

        {/* Node with glow and breathing ring */}
        <motion.div
          animate={
            isActive
              ? {
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(245,158,11,0.3)',
                    '0 0 0 6px rgba(245,158,11,0)',
                    '0 0 0 0 rgba(245,158,11,0.3)',
                  ],
                }
              : {}
          }
          transition={
            isActive
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
          className={`relative flex h-12 w-12 items-center justify-center rounded-xl border-2 ${borderColor} ${bgColor} shadow-sm transition-all duration-300 ${glowColor}`}
        >
          <span
            className={`text-lg sm:text-xl ${justStarted ? 'step-start-anim' : ''}`}
            role="img"
            aria-label={step.stepLabel}
          >
            {emoji}
          </span>
        </motion.div>

        {/* Vertical dotted connector line between steps */}
        {!isLast && (
          <motion.div
            className="w-0.5 min-h-6 flex-1 dotted-connector"
            initial={{ scaleY: 0, originY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        )}
      </div>

      {/* Card */}
      <Card
        className={`flex-1 cursor-pointer border ${borderColor} mb-2 transition-all duration-300 hover:shadow-md`}
        onClick={onToggleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{step.stepLabel}</span>
                <div className="flex items-center gap-2">
                  {stepDuration && (
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {stepDuration}
                    </span>
                  )}
                  {timeAgo && (
                    <span className="text-[10px] text-muted-foreground/40">
                      {timeAgo}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge}
              {step.content && (
                isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )
              )}
            </div>
          </div>

          {/* Content preview tooltip on hover (when not expanded) */}
          <AnimatePresence>
            {isHovered && step.content && !isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-2 overflow-hidden rounded-md border border-border/40 bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground/70 shadow-sm dark:bg-muted/40"
              >
                <span className="block truncate">{step.content.length > 50 ? step.content.slice(0, 50) + '…' : step.content}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isExpanded && step.content && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="relative mt-2">
                  <div className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {step.content}
                  </div>
                  <StepCopyButton content={step.content} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Agent Steps Pipeline ─────────────────────────────────────────────────────

export function AgentSteps() {
  const steps = useResearchStore((s) => s.steps);
  const [expandedStep, setExpandedStep] = React.useState<string | null>(null);

  const activeStep = steps.find((s) => s.status === 'running');
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalCount = steps.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Agent Pipeline</h3>
        {activeStep && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              className="relative flex h-2 w-2 items-center justify-center"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </motion.div>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {activeStep.stepLabel}...
            </span>
          </motion.div>
        )}
      </div>

      <div className="space-y-0">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => (
            <StepCard
              key={step.stepType}
              step={step}
              index={index}
              isActive={step.status === 'running'}
              isExpanded={expandedStep === step.stepType}
              isLast={index === steps.length - 1}
              onToggleExpand={() =>
                setExpandedStep((prev) =>
                  prev === step.stepType ? null : step.stepType
                )
              }
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Stylish progress bar with gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 flex items-center gap-4 rounded-lg border bg-muted/30 px-3 py-2.5"
      >
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted p-[2px]">
          <div className="relative h-full w-full rounded-full bg-muted">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full progress-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums min-w-[32px] text-right">
          {Math.round(progressPct)}%
        </span>
      </motion.div>
      </div>
    </motion.div>
  );
}
