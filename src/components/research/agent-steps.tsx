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
          className="flex h-5 w-5 items-center justify-center"
        >
          <CheckCircle className="h-5 w-5 text-emerald-500" />
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

function StepCard({
  step,
  isActive,
  isExpanded,
  onToggleExpand,
}: {
  step: AgentStep;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = STEP_ICONS[step.stepType] || Circle;
  const emoji = STEP_EMOJIS[step.stepType] || '';

  const borderColor = {
    pending: 'border-transparent',
    running: 'border-amber-500/50',
    completed: 'border-emerald-500/50',
    failed: 'border-red-500/50',
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
      {/* Node */}
      <div className="relative flex flex-col items-center">
        <motion.div
          animate={{
            scale: isActive ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 ${borderColor} ${bgColor} shadow-sm transition-all duration-300`}
        >
          <span className="text-xl" role="img" aria-label={step.stepLabel}>
            {emoji}
          </span>
        </motion.div>

        {/* Connector line */}
        <motion.div
          className="w-0.5 min-h-6 flex-1"
          style={{
            backgroundColor:
              step.status === 'completed'
                ? 'var(--color-emerald-500, #10b981)'
                : 'var(--color-border)',
          }}
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        />
      </div>

      {/* Card */}
      <Card
        className={`flex-1 cursor-pointer border ${borderColor} mb-2 transition-all duration-300 hover:shadow-md`}
        onClick={onToggleExpand}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{step.stepLabel}</span>
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

          <AnimatePresence>
            {isExpanded && step.content && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {step.content}
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Agent Pipeline</h3>
        {activeStep && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              className="h-2 w-2 rounded-full bg-amber-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
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
              isActive={step.status === 'running'}
              isExpanded={expandedStep === step.stepType}
              onToggleExpand={() =>
                setExpandedStep((prev) =>
                  prev === step.stepType ? null : step.stepType
                )
              }
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 flex items-center gap-4 rounded-lg border bg-muted/30 px-3 py-2"
      >
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-muted-foreground">
            {steps.filter((s) => s.status === 'completed').length}/{steps.length}
          </span>
        </div>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{
              width: `${
                (steps.filter((s) => s.status === 'completed').length /
                  steps.length) *
                100
              }%`,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
