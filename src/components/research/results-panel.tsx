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
} from 'lucide-react';
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

function SourcesTab() {
  const searchResults = useResearchStore((s) => s.searchResults);
  const scrapedResults = useResearchStore((s) => s.scrapedResults);

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

  if (allSources.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <div className="rounded-full bg-muted p-4">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No sources found yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Sources will appear here as the agent explores the web.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <AnimatePresence mode="popLayout">
        {allSources.map((source, idx) => (
          <motion.div
            key={source.url}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className="h-full transition-all duration-200 hover:border-border hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Favicon */}
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
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
                        <h4 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                          {source.title}
                        </h4>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
        ))}
      </AnimatePresence>
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
        className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <div className="rounded-full bg-muted p-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No scraped content yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Scraped page content will appear here as the agent processes sources.
        </p>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <AccordionItem value={result.url} className="rounded-lg border px-4">
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
                  <div className="rounded-md bg-muted/50 p-4">
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

// ─── Report Tab ───────────────────────────────────────────────────────────────

function ReportTab() {
  const report = useResearchStore((s) => s.report);
  const isProcessing = useResearchStore((s) => s.isProcessing);
  const currentSessionId = useResearchStore((s) => s.currentSessionId);
  const steps = useResearchStore((s) => s.steps);
  const reportStep = steps.find((s) => s.stepType === 'report');
  const isReportRunning = reportStep?.status === 'running';

  const handleExport = (format: 'md' | 'html') => {
    if (!currentSessionId) return;
    window.open(`/api/agent/session/${currentSessionId}/export?format=${format}`, '_blank');
  };

  if (!report && !isReportRunning) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <div className="rounded-full bg-muted p-4">
          <FileOutput className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No report generated yet.</p>
        <p className="text-xs text-muted-foreground/70">
          The final research report will appear here once the agent finishes.
        </p>
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
    >
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{report || ''}</ReactMarkdown>
      </div>
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

  const sourcesCount = new Set([
    ...searchResults.map((r) => r.url),
    ...scrapedResults.map((r) => r.url),
  ]).size;

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
      <Tabs defaultValue="sources" className="w-full">
        <div className="flex items-center justify-between gap-2">
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="sources" className="gap-1.5 data-[state=active]:bg-background">
              <Globe className="h-3.5 w-3.5" />
              Sources
              {sourcesCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                >
                  {sourcesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scraped" className="gap-1.5 data-[state=active]:bg-background">
              <FileText className="h-3.5 w-3.5" />
              Scraped
              {scrapedResults.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                >
                  {scrapedResults.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5 data-[state=active]:bg-background">
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
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0">
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

        <ScrollArea className="mt-4 max-h-[600px]">
          <TabsContent value="sources" className="mt-0">
            <SourcesTab />
          </TabsContent>
          <TabsContent value="scraped" className="mt-0">
            <ScrapedContentTab />
          </TabsContent>
          <TabsContent value="report" className="mt-0">
            <ReportTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </motion.div>
  );
}
