'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { FileText, CheckCircle2, XCircle, Loader2, ArrowRight, Trash2, Clock, ExternalLink } from 'lucide-react';

interface HistoryItem {
  id: string;
  query: string;
  status: string;
  summary: string | null;
  report: string | null;
  stepCount: number;
  resultCount: number;
  createdAt: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (user?.id) params.set('userId', user.id);
        const res = await fetch(`/api/agent/history?${params}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    try {
      await fetch(`/api/agent/session/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const relativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3B7A]">Library</h1>
        <p className="text-slate-500 mt-1">All your past research sessions in one place.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading history...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText className="h-12 w-12 mb-4 text-slate-300" />
          <h3 className="font-bold text-slate-600 mb-1">No research sessions yet</h3>
          <p className="text-sm mb-4">Start your first research from the home page.</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#0F3B7A] text-white rounded-lg text-sm font-semibold hover:bg-[#0F3B7A]/90">
            Go to Home
          </button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center justify-between p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
              <button onClick={() => router.push(`/session/${item.id}`)} className="flex items-start gap-4 text-left flex-1 min-w-0">
                <div className="p-1.5 rounded bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.query}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relativeTime(item.createdAt)}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{item.resultCount} sources</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {item.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="h-3 w-3" />Done</span>
                    ) : item.status === 'running' ? (
                      <span className="flex items-center gap-1 text-orange-600 font-bold"><Loader2 className="h-3 w-3 animate-spin" />Running</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle className="h-3 w-3" />{item.status}</span>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
