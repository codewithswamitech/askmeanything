'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Brain,
  FileSearch,
  BarChart3,
  ArrowRight,
  Search,
  Globe,
  FileText,
  Rocket,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResearchStore } from '@/lib/store';

// ─── Feature highlight data ───────────────────────────────────────────────────

const features = [
  {
    icon: Brain,
    title: 'Ask Anything',
    description: 'Enter any topic, question, or research goal in natural language.',
  },
  {
    icon: FileSearch,
    title: 'Deep Research',
    description: 'Agent explores the web, scrapes multiple sources, and cross-references data.',
  },
  {
    icon: BarChart3,
    title: 'Smart Reports',
    description: 'Get comprehensive, well-structured research reports with citations.',
  },
];

const EXAMPLE_QUERIES = [
  {
    icon: '🤖',
    text: 'Find information about OpenAI and their latest developments',
  },
  {
    icon: '⚛️',
    text: 'Research the current state of quantum computing',
  },
  {
    icon: '🔴',
    text: 'Get details about the Mars rover missions',
  },
  {
    icon: '🚗',
    text: 'Analyze recent trends in electric vehicle market',
  },
  {
    icon: '🔬',
    text: 'What are the latest breakthroughs in CRISPR gene editing',
  },
  {
    icon: '📈',
    text: 'Analyze the global semiconductor chip shortage',
  },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmptyState() {
  const { setQuery, setProcessing } = useResearchStore();

  const handleExampleClick = (query: string) => {
    setQuery(query);
    setProcessing(true);
    window.dispatchEvent(
      new CustomEvent('research:submit', { detail: { query } })
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative flex min-h-[60vh] flex-col items-center justify-center px-4 py-12"
    >
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-radial from-emerald-100/40 via-emerald-50/20 to-transparent dark:from-emerald-900/20 dark:via-emerald-950/10 blur-3xl" />
      </div>

      {/* Dot pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-0"
        style={{
          backgroundImage: 'radial-gradient(circle, oklch(0.3 0 0) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Hero illustration */}
      <motion.div variants={itemVariants} className="relative mb-10">
        {/* Background glow with shimmer */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <motion.div
            className="h-40 w-40 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/40 blur-3xl dark:from-emerald-500/20 dark:to-teal-500/20"
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-border/50 bg-card shadow-xl">
          {/* Central icon with shimmer pulse */}
          <motion.div
            animate={{
              y: [0, -4, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <motion.div
              className="relative"
              animate={{
                filter: [
                  'brightness(1) drop-shadow(0 0 0px rgba(16,185,129,0))',
                  'brightness(1.15) drop-shadow(0 0 12px rgba(16,185,129,0.4))',
                  'brightness(1) drop-shadow(0 0 0px rgba(16,185,129,0))',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Sparkles className="h-10 w-10 text-emerald-500" />
            </motion.div>
          </motion.div>

          {/* Floating orbit icons */}
          <motion.div
            className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-md border"
            animate={{
              y: [0, -3, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </motion.div>

          <motion.div
            className="absolute -bottom-2 -left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-md border"
            animate={{
              y: [0, 3, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
          </motion.div>

          <motion.div
            className="absolute -top-1 -left-3 flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-md border"
            animate={{
              y: [0, 2, 0],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1.5,
            }}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div variants={itemVariants} className="mb-3 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Web Research Agent
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base max-w-lg mx-auto">
          Your AI-powered research assistant. Ask a question, and the agent will
          search, scrape, analyze, and compile a comprehensive report.
        </p>
      </motion.div>

      {/* Feature cards with glassmorphism */}
      <motion.div
        variants={itemVariants}
        className="mt-8 mb-12 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {features.map((feature, idx) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            className="relative flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 text-center shadow-sm backdrop-blur-md dark:border-white/5 dark:bg-white/5 dark:backdrop-blur-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80 backdrop-blur-sm">
              <feature.icon className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-sm font-semibold">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Example queries */}
      <motion.div variants={itemVariants} className="w-full max-w-2xl">
        <div className="mb-4 flex items-center gap-2 justify-center">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Try an example
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLE_QUERIES.map((example, idx) => (
            <motion.button
              key={idx}
              variants={itemVariants}
              onClick={() => handleExampleClick(example.text)}
              className="group flex items-center gap-3 rounded-xl border border-white/20 bg-white/40 p-3 text-left backdrop-blur-md transition-all duration-200 hover:border-border hover:bg-white/60 hover:shadow-sm dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10 dark:backdrop-blur-md"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-base backdrop-blur-sm">
                {example.icon}
              </span>
              <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {example.text}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground group-hover:translate-x-0.5" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Subtle branding line */}
      <motion.div
        variants={itemVariants}
        className="mt-12 flex items-center gap-1.5 text-xs text-muted-foreground/50"
      >
        <Zap className="h-3 w-3" />
        <span>Powered by AI Web Research Agent</span>
      </motion.div>
    </motion.div>
  );
}
