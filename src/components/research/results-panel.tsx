'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Globe,
  FileText,
  BookOpen,
  FileOutput,
  Copy,
  Check,
  Loader2,
  SearchX,
  Download,
  FileQuestion,
  Database,
  Timer,
  CheckCircle,
  Layers,
  Search,
  X,
  Clock,
  ArrowUp,
  Eye,
  List,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useResearchStore } from '@/lib/store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateUrl(url: string, maxLength = 50): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    if (path.length > maxLength) {
      return parsed.hostname + '/...' + path.slice(-maxLength + 12);
    }
    return parsed.hostname + path;
  } catch {
    return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return '';
  }
}

// ─── Report Heading Parser for TOC ────────────────────────────────────────────

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function parseReportHeadings(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const headings: TocItem[] = [];
  let headingCounter = 0;

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`#]/g, '').trim();
      const id = `report-heading-${headingCounter++}`;
      headings.push({ id, text, level });
    }
  }
  return headings;
}

function getFirstReportHeading(markdown: string): string | null {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,2})\s+(.+)$/);
    if (match) {
      return match[2].replace(/[*_`#]/g, '').trim();
    }
  }
  return null;
}

// ─── Source Category Detection ─────────────────────────────────────────────────

type SourceCategory = 'News' | 'Wiki' | 'Gov' | 'Edu' | 'Social' | 'Web';

interface CategoryConfig {
  label: string;
  className: string;
}

const CATEGORY_STYLES: Record<SourceCategory, CategoryConfig> = {
  News: {
    label: 'News',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  },
  Wiki: {
    label: 'Wiki',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  },
  Gov: {
    label: 'Gov',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  },
  Edu: {
    label: 'Edu',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
  },
  Social: {
    label: 'Social',
    className: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400 border-pink-200 dark:border-pink-500/20',
  },
  Web: {
    label: 'Web',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20',
  },
};

function getSourceCategory(url: string): SourceCategory {
  try {
    const { hostname } = new URL(url);
    const domain = hostname.toLowerCase();

    // Wiki
    if (domain.includes('wikipedia.org') || domain.includes('wiki')) return 'Wiki';

    // News
    if (
      domain.includes('news') ||
      domain.includes('bbc.') ||
      domain.includes('cnn.') ||
      domain.includes('reuters.com') ||
      domain.includes('nytimes.com') ||
      domain.includes('washingtonpost.com') ||
      domain.includes('theguardian.com') ||
      domain.includes('apnews.com') ||
      domain.includes('cnbc.com') ||
      domain.includes('bloomberg.com') ||
      domain.includes('techcrunch.com') ||
      domain.includes('theverge.com') ||
      domain.includes('arstechnica.com') ||
      domain.includes('wired.com')
    ) return 'News';

    // Gov
    if (domain.endsWith('.gov') || domain.includes('government')) return 'Gov';

    // Edu
    if (domain.endsWith('.edu') || domain.includes('university') || domain.includes('academic')) return 'Edu';

    // Social
    if (
      domain.includes('twitter.com') ||
      domain.includes('x.com') ||
      domain.includes('reddit.com') ||
      domain.includes('facebook.com') ||
      domain.includes('linkedin.com') ||
      domain.includes('instagram.com') ||
      domain.includes('tiktok.com') ||
      domain.includes('youtube.com') ||
      domain.includes('medium.com')
    ) return 'Social';

    return 'Web';
  } catch {
    return 'Web';
  }
}

function SourceCategoryBadge({ url }: { url: string }) {
  const category = getSourceCategory(url);
  const config = CATEGORY_STYLES[category];

  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold leading-none ${config.className}`}>
      {config.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — do nothing silently
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Sources Tab ──────────────────────────────────────────────────────────────

function SourceSkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

function SourcesTab() {
  const searchResults = useResearchStore((s) => s.searchResults);
  const scrapedResults = useResearchStore((s) => s.scrapedResults);
  const isProcessing = useResearchStore((s) => s.isProcessing);
  const openedSources = useResearchStore((s) => s.openedSources);
  const markSourceOpened = useResearchStore((s) => s.markSourceOpened);
  const [sourceFilter, setSourceFilter] = React.useState('');

  // Merge unique sources from both search and scraped results
  const allSources = React.useMemo(() => {
    const seen = new Set<string>();
    const sources: Array<{
      url: string;
      title: string;
      snippet: string | null;
      hostName: string | null;
    }> = [];

    for (const r of searchResults) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        sources.push(r);
      }
    }
    for (const r of scrapedResults) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        sources.push({ url: r.url, title: r.title, snippet: null, hostName: null });
      }
    }
    return sources;
  }, [searchResults, scrapedResults]);

  // Filter sources by search text
  const filteredSources = React.useMemo(() => {
    if (!sourceFilter.trim()) return allSources;
    const q = sourceFilter.toLowerCase();
    return allSources.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        (s.snippet && s.snippet.toLowerCase().includes(q))
    );
  }, [allSources, sourceFilter]);

  const hasSources = allSources.length > 0;
  const openedCount = allSources.filter((s) => openedSources.has(s.url)).length;

  // Show loading skeletons when processing and no sources yet
  if (!hasSources && isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {[0, 1, 2, 3].map((idx) => (
          <motion.div
            key={`skeleton-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            <SourceSkeletonCard />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (!hasSources) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      >
        <div className="relative">
          <div className="rounded-full bg-muted/80 p-4">
            <SearchX className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-xl" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">No sources found yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
            Sources will appear here as the agent explores the web.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Search input for filtering sources */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search sources..."
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 border-border/60 bg-muted/30 pl-8 pr-8 text-xs shadow-none transition-all duration-200 focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:bg-muted/50"
          />
          <AnimatePresence>
            {sourceFilter.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => setSourceFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          {sourceFilter.trim() && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[11px] text-muted-foreground/60"
            >
              <span className="font-medium text-muted-foreground/80">{filteredSources.length}</span> of{' '}
              <span className="font-medium text-muted-foreground/80">{allSources.length}</span> sources match
            </motion.p>
          )}
          {openedCount > 0 && !sourceFilter.trim() && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70"
            >
              <Eye className="inline h-3 w-3 mr-0.5" />
              <span className="font-medium">{openedCount}</span>/{allSources.length} opened
            </motion.p>
          )}
        </div>
      </div>

      {/* Sources grid */}
      <div className="grid gap-3 sm:grid-cols-2">
      <AnimatePresence mode="popLayout">
        {filteredSources.map((source, idx) => {
          const isOpened = openedSources.has(source.url);
          return (
            <motion.div
              key={source.url}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
                onClick={() => markSourceOpened(source.url)}
              >
                <Card className={`relative h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80 hover:scale-[1.01] ${isOpened ? 'border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5' : ''}`}>
                  {/* Left accent border on hover */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-500 to-teal-500 scale-y-0 origin-top transition-transform duration-300 group-hover:scale-y-100 rounded-r" />
                  {/* Opened indicator */}
                  {isOpened && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500/50" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Favicon */}
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background transition-shadow duration-200 group-hover:shadow-sm ${isOpened ? 'border-emerald-500/30' : ''}`}>
                        {getFaviconUrl(source.url) && (
                          <img
                            src={getFaviconUrl(source.url)}
                            alt=""
                            className="h-5 w-5"
                            loading="lazy"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <h4 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {source.title}
                            </h4>
                            <SourceCategoryBadge url={source.url} />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isOpened && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20"
                              >
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </motion.div>
                            )}
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-muted-foreground opacity-0 translate-x-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-emerald-500" />
                          </div>
                        </div>

                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {truncateUrl(source.url)}
                        </p>

                        {source.snippet && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                            {source.snippet}
                          </p>
                        )}

                        {source.hostName && (
                          <Badge variant="secondary" className="mt-2 text-[10px]">
                            {source.hostName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          );
        })}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Scraped Content Tab ──────────────────────────────────────────────────────

function ScrapedContentTab() {
  const scrapedResults = useResearchStore((s) => s.scrapedResults);

  if (scrapedResults.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      >
        <div className="relative">
          <div className="rounded-full bg-muted/80 p-4">
            <Database className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-xl" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">No scraped content yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
            Scraped page content will appear here as the agent processes sources.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Accordion type="multiple" className="space-y-2">
        {scrapedResults.map((result, idx) => (
          <motion.div
            key={result.url}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <AccordionItem value={result.url} className="rounded-lg border px-4 transition-all duration-200 hover:border-border/80">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-500/20">
                    <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {truncateUrl(result.url, 60)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {result.content.length.toLocaleString()} chars
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="relative">
                  <div className="rounded-md bg-muted/50 p-4 border border-border/30">
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground font-sans">
                      {result.content}
                    </pre>
                  </div>
                  <div className="absolute right-2 top-2">
                    <CopyButton text={result.content} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </motion.div>
  );
}

// ─── Table of Contents (TOC) Component ────────────────────────────────────────

function ReportToc({ headings, activeId }: { headings: TocItem[]; activeId: string | null }) {
  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (headings.length <= 3) return null;

  return (
    <nav className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-0">
        <div className="flex items-center gap-1.5 mb-3">
          <List className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Contents
          </span>
        </div>
        <div className="space-y-0.5 max-h-[480px] overflow-y-auto scrollbar-thin">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            return (
              <button
                key={heading.id}
                onClick={() => scrollToHeading(heading.id)}
                className={`block w-full text-left rounded-md px-2.5 py-1.5 text-[11px] leading-snug transition-all duration-150 hover:bg-muted/50 ${
                  heading.level === 3 ? 'pl-6' : 'pl-2.5'
                } ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`block truncate ${isActive ? 'border-l-2 border-emerald-500 pl-2 -ml-0.5' : ''}`}>
                  {heading.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// ─── Report Tab ───────────────────────────────────────────────────────────────

function CopyReportButton({ report }: { report: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success('Report copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy report');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 text-xs border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy Report
        </>
      )}
    </Button>
  );
}

function ReportTab() {
  const report = useResearchStore((s) => s.report);
  const isProcessing = useResearchStore((s) => s.isProcessing);
  const currentSessionId = useResearchStore((s) => s.currentSessionId);
  const steps = useResearchStore((s) => s.steps);
  const reportStep = steps.find((s) => s.stepType === 'report');
  const isReportRunning = reportStep?.status === 'running';

  // Word count and reading time (must be before any early return)
  const wordCount = React.useMemo(() => {
    if (!report) return 0;
    return report.split(/\s+/).filter((w) => w.length > 0).length;
  }, [report]);

  const readingTime = React.useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Parse headings for TOC (before early return)
  const headings = React.useMemo(() => {
    if (!report) return [];
    return parseReportHeadings(report);
  }, [report]);

  // Extract first heading for report title (before early return)
  const firstHeading = React.useMemo(() => {
    if (!report) return null;
    return getFirstReportHeading(report);
  }, [report]);

  // Scroll progress indicator
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const reportRef = React.useRef<HTMLDivElement>(null);

  // IntersectionObserver for active TOC heading
  const [activeHeadingId, setActiveHeadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = reportRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      setScrollProgress(Math.min(pct, 1));
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Set up IntersectionObserver for headings
  React.useEffect(() => {
    if (headings.length <= 3) return;
    const el = reportRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is intersecting from the top
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the one closest to the top
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveHeadingId(visible[0].target.id);
        }
      },
      { root: el, threshold: 0.2, rootMargin: '-10% 0px -70% 0px' }
    );

    // Wait a tick for the DOM to render
    const timer = setTimeout(() => {
      for (const heading of headings) {
        const headingEl = document.getElementById(heading.id);
        if (headingEl) observer.observe(headingEl);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [headings]);

  const handleExport = (format: 'md' | 'html') => {
    if (!currentSessionId) return;
    window.open(`/api/agent/session/${currentSessionId}/export?format=${format}`, '_blank');
  };

  // Scroll to top handler
  const scrollToTop = () => {
    const el = reportRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!report && !isReportRunning) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      >
        <div className="relative">
          <div className="rounded-full bg-muted/80 p-4">
            <FileQuestion className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-xl" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">No report generated yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
            The final research report will appear here once the agent finishes.
          </p>
        </div>
      </motion.div>
    );
  }

  if (isReportRunning || isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4 py-8"
      >
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          <span className="text-sm font-medium">Generating report...</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Scroll progress indicator */}
      <div className="absolute top-0 left-0 right-0 z-10 h-[2px] overflow-hidden rounded-full">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
          style={{ width: `${scrollProgress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Report header with gradient title */}
      {firstHeading && (
        <div className="mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
            {firstHeading}
          </h2>
          <div className="mt-2 h-px bg-gradient-to-r from-emerald-500/40 via-teal-500/20 to-transparent" />
        </div>
      )}

      {/* Word count & reading time + Copy report button */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-[11px] font-semibold tabular-nums border border-border/50">
            {wordCount.toLocaleString()} words
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-[11px] font-semibold tabular-nums border border-border/50">
            <Clock className="h-3 w-3" />
            {readingTime} min read
          </span>
        </div>
        <CopyReportButton report={report || ''} />
      </div>

      {/* Report content with TOC sidebar */}
      <div className="flex gap-6">
        {/* TOC sidebar - desktop only */}
        <ReportToc headings={headings} activeId={activeHeadingId} />

        {/* Main report content */}
        <div className="flex-1 min-w-0">
          <div ref={reportRef} className="prose prose-sm prose-neutral dark:prose-invert max-w-none max-h-[560px] overflow-y-auto scrollbar-thin pr-1">
            <ReactMarkdown
              components={{
                h2: ({ children, ...props }) => {
                  // Find the matching heading index and assign id
                  const text = String(children).replace(/[*_`#]/g, '').trim();
                  const idx = headings.findIndex((h) => h.text === text && h.level === 2);
                  const id = idx >= 0 ? headings[idx].id : undefined;
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const text = String(children).replace(/[*_`#]/g, '').trim();
                  const idx = headings.findIndex((h) => h.text === text && h.level === 3);
                  const id = idx >= 0 ? headings[idx].id : undefined;
                  return <h3 id={id} {...props}>{children}</h3>;
                },
              }}
            >
              {report || ''}
            </ReactMarkdown>
          </div>

          {/* Scroll to top button */}
          <AnimatePresence>
            {scrollProgress > 0.1 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={scrollToTop}
                className="fixed bottom-6 right-6 xl:right-auto xl:relative xl:bottom-auto xl:mt-2 xl:ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600 z-20"
                title="Scroll to top"
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stats Summary Card ────────────────────────────────────────────────────

function StatsSummaryCard() {
  const searchResults = useResearchStore((s) => s.searchResults);
  const scrapedResults = useResearchStore((s) => s.scrapedResults);
  const steps = useResearchStore((s) => s.steps);
  const elapsedSeconds = useResearchStore((s) => s.elapsedSeconds);
  const report = useResearchStore((s) => s.report);

  const sourcesCount = new Set([
    ...searchResults.map((r) => r.url),
    ...scrapedResults.map((r) => r.url),
  ]).size;

  const completedSteps = steps.filter((s) => s.status === 'completed').length;

  // Format time
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const stats = [
    {
      icon: Layers,
      label: 'Sources',
      value: sourcesCount,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      icon: FileText,
      label: 'Scraped',
      value: scrapedResults.length,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
    },
    {
      icon: Timer,
      label: 'Duration',
      value: formatTime(elapsedSeconds),
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      icon: CheckCircle,
      label: 'Steps',
      value: `${completedSteps}/${steps.length}`,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: idx * 0.1 }}
          className={`flex items-center gap-2.5 rounded-xl border p-3 ${stat.bg}`}
        >
          <stat.icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-sm font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Main Results Panel ───────────────────────────────────────────────────────

export function ResultsPanel() {
  const searchResults = useResearchStore((s) => s.searchResults);
  const scrapedResults = useResearchStore((s) => s.scrapedResults);
  const report = useResearchStore((s) => s.report);
  const currentSessionId = useResearchStore((s) => s.currentSessionId);
  const isProcessing = useResearchStore((s) => s.isProcessing);
  const openedSources = useResearchStore((s) => s.openedSources);

  const sourcesCount = new Set([
    ...searchResults.map((r) => r.url),
    ...scrapedResults.map((r) => r.url),
  ]).size;

  const openedCount = React.useMemo(() => {
    const allUrls = new Set([
      ...searchResults.map((r) => r.url),
      ...scrapedResults.map((r) => r.url),
    ]);
    return [...allUrls].filter((url) => openedSources.has(url)).length;
  }, [searchResults, scrapedResults, openedSources]);

  const hasReport = report && !isProcessing;

  const handleExport = (format: 'md' | 'html') => {
    if (!currentSessionId) return;
    window.open(`/api/agent/session/${currentSessionId}/export?format=${format}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Stats summary card when research completed */}
      {hasReport && <StatsSummaryCard />}

      <Tabs defaultValue="sources" className="w-full">
        <div className="flex items-center justify-between gap-2">
          {/* Polished tab list with subtle styling */}
          <TabsList className="w-full justify-start bg-muted/50 p-1 gap-0.5 rounded-lg">
            <TabsTrigger
              value="sources"
              className="gap-1.5 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 transition-all duration-200"
            >
              <Globe className="h-3.5 w-3.5" />
              Sources
              {sourcesCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  {sourcesCount}
                </Badge>
              )}
              {openedCount > 0 && (
                <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 tabular-nums ml-0.5">
                  {openedCount} viewed
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="scraped"
              className="gap-1.5 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 transition-all duration-200"
            >
              <FileText className="h-3.5 w-3.5" />
              Scraped
              {scrapedResults.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  {scrapedResults.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="gap-1.5 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 transition-all duration-200"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Report
              {hasReport && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Badge className="ml-1 h-5 min-w-5 rounded-full bg-emerald-500 px-1.5 text-[10px] text-white hover:bg-emerald-500">
                    ✓
                  </Badge>
                </motion.div>
              )}
            </TabsTrigger>
          </TabsList>

          {hasReport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 shrink-0 transition-all duration-200">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('md')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('html')}>
                  <FileOutput className="mr-2 h-4 w-4" />
                  Download HTML
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-4 max-h-[600px] overflow-y-auto scrollbar-thin">
          <TabsContent value="sources" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SourcesTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="scraped" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ScrapedContentTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="report" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ReportTab />
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
