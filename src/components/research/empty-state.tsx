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

// ─── Particle positions for floating decorative dots ──────────────────────────

const PARTICLES = [
  { top: '10%', left: '15%', size: 6, duration: 7, delay: 0 },
  { top: '25%', left: '80%', size: 4, duration: 5.5, delay: 1.2 },
  { top: '60%', left: '10%', size: 5, duration: 8, delay: 0.5 },
  { top: '75%', left: '85%', size: 3, duration: 6, delay: 2 },
  { top: '40%', left: '70%', size: 4, duration: 7.5, delay: 0.8 },
  { top: '85%', left: '45%', size: 5, duration: 6.5, delay: 1.5 },
  { top: '15%', left: '55%', size: 3, duration: 8.5, delay: 2.5 },
  { top: '50%', left: '25%', size: 4, duration: 5, delay: 0.3 },
  { top: '30%', left: '40%', size: 3, duration: 7, delay: 1.8 },
  { top: '70%', left: '60%', size: 5, duration: 6, delay: 0.9 },
  { top: '20%', left: '90%', size: 3, duration: 9, delay: 3 },
  { top: '90%', left: '20%', size: 4, duration: 5.5, delay: 2.2 },
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
      className="relative flex min-h-[65vh] flex-col items-center justify-center px-4 py-16"
    >
      {/* Mesh gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 mesh-gradient" />

      {/* Grid/mesh pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating decorative particles */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {PARTICLES.map((particle, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full bg-emerald-400/30 dark:bg-emerald-400/20"
            style={{
              top: particle.top,
              left: particle.left,
              width: particle.size,
              height: particle.size,
            }}
            animate={{
              y: [0, -20 - Math.random() * 15, 0],
              x: [0, (Math.random() - 0.5) * 16, 0],
              scale: [1, 1.3 + Math.random() * 0.4, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Hero illustration */}
      <motion.div variants={itemVariants} className="relative mb-12">
        {/* Background glow with shimmer */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <motion.div
            className="h-48 w-48 rounded-full bg-gradient-to-br from-emerald-200/50 via-teal-200/30 to-cyan-200/40 blur-3xl dark:from-emerald-500/25 dark:via-teal-500/15 dark:to-cyan-500/20"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-emerald-500/5">
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
                  'brightness(1.15) drop-shadow(0 0 16px rgba(16,185,129,0.5))',
                  'brightness(1) drop-shadow(0 0 0px rgba(16,185,129,0))',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Sparkles className="h-12 w-12 text-emerald-500" />
            </motion.div>
          </motion.div>

          {/* Floating orbit icons */}
          <motion.div
            className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-md border border-border/50"
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
            className="absolute -bottom-2 -left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-md border border-border/50"
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
            className="absolute -top-1 -left-3 flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-md border border-border/50"
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
      <motion.div variants={itemVariants} className="mb-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Web Research Agent
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base max-w-lg mx-auto leading-relaxed">
          Your AI-powered research assistant. Ask a question, and the agent will
          search, scrape, analyze, and compile a comprehensive report.
        </p>
      </motion.div>

      {/* Feature cards with glassmorphism + gradient border on hover */}
      <motion.div
        variants={itemVariants}
        className="mt-10 mb-14 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {features.map((feature, idx) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="gradient-border group relative flex flex-col items-center gap-2.5 rounded-xl border border-white/20 bg-white/40 p-5 text-center shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-white/5 dark:bg-white/5 dark:backdrop-blur-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/80 backdrop-blur-sm transition-colors duration-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10">
              <feature.icon className="h-5 w-5 text-foreground transition-colors duration-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Example queries with left accent border on hover */}
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
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/20 bg-white/40 p-3.5 text-left backdrop-blur-md transition-all duration-200 hover:border-border hover:bg-white/60 hover:shadow-md dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10 dark:backdrop-blur-md"
            >
              {/* Left accent border on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-500 to-teal-500 scale-y-0 origin-top transition-transform duration-300 group-hover:scale-y-100 rounded-r" />
              
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-base backdrop-blur-sm transition-colors duration-200 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10">
                {example.icon}
              </span>
              <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                {example.text}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-all duration-200 group-hover:text-emerald-500 group-hover:translate-x-0.5" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Subtle branding line */}
      <motion.div
        variants={itemVariants}
        className="mt-14 flex items-center gap-1.5 text-xs text-muted-foreground/50"
      >
        <Zap className="h-3 w-3" />
        <span>Powered by AI Web Research Agent</span>
      </motion.div>
    </motion.div>
  );
}
