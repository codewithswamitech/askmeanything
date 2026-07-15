'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, authHeaders } from '@/lib/auth';
import { FileText, CheckCircle2, Download, Copy, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportItem {
  id: string;
  query: string;
  status: string;
  report: string | null;
  resultCount: number;
  createdAt: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agent/history`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setItems((data.items || []).filter((i: ReportItem) => i.status === 'completed' && i.report));
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleExport = (item: ReportItem) => {
    // The report markdown is already loaded client-side, so export locally
    // rather than round-tripping to the backend.
    const blob = new Blob([item.report || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${item.id.slice(0, 6)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (report: string) => {
    navigator.clipboard.writeText(report);
    toast.success('Report copied to clipboard');
  };

  const relativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3B7A]">Reports</h1>
        <p className="text-slate-500 mt-1">Completed research reports ready to read, copy, or export.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading reports...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText className="h-12 w-12 mb-4 text-slate-300" />
          <h3 className="font-bold text-slate-600 mb-1">No completed reports</h3>
          <p className="text-sm mb-4">Run a research query to generate your first report.</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#0F3B7A] text-white rounded-lg text-sm font-semibold hover:bg-[#0F3B7A]/90">
            Start Research
          </button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <button onClick={() => router.push(`/session/${item.id}`)} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.query}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium ml-6">
                    <span>{relativeTime(item.createdAt)}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{item.resultCount} sources</span>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleCopy(item.report || '')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Copy">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleExport(item)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Export MD">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => router.push(`/session/${item.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
