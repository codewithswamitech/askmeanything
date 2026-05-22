'use client';

import { useRouter } from 'next/navigation';
import { Building2, User, Globe, FileText, CheckCircle2, Shield, TrendingUp, Users, GitCompare, Microscope, Scale, Newspaper, Brain, Target } from 'lucide-react';

const templates = [
  { icon: Building2, title: 'Competitive Analysis', desc: 'Map competitors, market share, strategies, and positioning in a specific industry or niche.', query: 'Conduct a comprehensive competitive analysis of', detail: 'High' },
  { icon: User, title: 'Person Deep-Dive', desc: 'Profile a leader, expert, or public figure — background, achievements, and influence.', query: 'Provide a detailed professional profile of', detail: 'High' },
  { icon: Globe, title: 'Industry Landscape', desc: 'Trends, key players, signals, and growth opportunities across a sector.', query: 'Analyze the current landscape and trends in the', detail: 'High' },
  { icon: FileText, title: 'Document Q&A', desc: 'Summarize, extract key points, and answer questions about a specific document or topic.', query: 'Summarize and analyze the key points about', detail: 'Medium' },
  { icon: CheckCircle2, title: 'Quick Fact-Check', desc: 'Verify a specific claim across multiple authoritative sources.', query: 'Fact-check this claim and provide evidence: ', detail: 'Medium' },
  { icon: Shield, title: 'Compliance & Policy', desc: 'Regulatory scan, compliance requirements, and policy landscape for a domain.', query: 'Provide a regulatory and compliance analysis for', detail: 'High' },
  { icon: TrendingUp, title: 'Executive Brief', desc: '2-page leadership brief with key insights, risks, and recommendations.', query: 'Create an executive brief summarizing the current state of', detail: 'High' },
  { icon: Users, title: 'Market Sizing', desc: 'TAM, SAM, SOM analysis with data-driven estimates for a market.', query: 'Provide a market sizing analysis (TAM/SAM/SOM) for', detail: 'High' },
  { icon: GitCompare, title: 'Vendor Comparison', desc: 'Side-by-side feature matrix, pricing, and capability comparison of tools or services.', query: 'Compare the features, pricing, and capabilities of', detail: 'High' },
  { icon: Microscope, title: 'Technology Deep-Dive', desc: 'Architecture, capabilities, limitations, and ecosystem of a technology.', query: 'Provide a deep technical analysis of', detail: 'High' },
  { icon: Scale, title: 'Risk Assessment', desc: 'Identify, categorize, and evaluate risks for a business decision or initiative.', query: 'Conduct a risk assessment for', detail: 'Medium' },
  { icon: Newspaper, title: 'News & Sentiment', desc: 'Recent news coverage, public sentiment, and media narrative around a topic.', query: 'Analyze recent news coverage and public sentiment about', detail: 'Medium' },
  { icon: Brain, title: 'Research Gaps', desc: 'Identify what is NOT yet known about a topic and where further research is needed.', query: 'Identify research gaps and unknowns in the field of', detail: 'High' },
  { icon: Target, title: 'Product Teardown', desc: 'Feature-by-feature analysis of a product, its strengths, weaknesses, and competitive moat.', query: 'Provide a comprehensive product teardown of', detail: 'High' },
];

export default function TemplatesPage() {
  const router = useRouter();

  const handleUseTemplate = (query: string, detail: string) => {
    router.push(`/?q=${encodeURIComponent(query)}&detail=${detail}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3B7A]">Templates</h1>
        <p className="text-slate-500 mt-1">Pre-built research frames to get structured, professional results faster.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((tpl, i) => (
          <button
            key={i}
            onClick={() => handleUseTemplate(tpl.query, tpl.detail)}
            className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 bg-white hover:border-[#0F3B7A]/30 hover:shadow-sm text-left transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <tpl.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-0.5">{tpl.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{tpl.desc}</p>
              <span className="inline-block mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {tpl.detail} detail
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
