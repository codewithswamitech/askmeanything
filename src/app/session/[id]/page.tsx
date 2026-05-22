'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useResearchSession } from '@/components/session/useResearchStream';
import { ClarificationPanel } from '@/components/session/ClarificationPanel';
import { SessionHeader } from '@/components/session/SessionHeader';
import { PipelineStepper } from '@/components/session/PipelineStepper';
import { MetricsGrid } from '@/components/session/MetricsGrid';
import { SessionContent } from '@/components/session/SessionContent';
import { Loader2 } from 'lucide-react';

function SessionContentInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const initialQuery = searchParams.get('q');

  const { clarification, answerClarification, skipClarification, regenerateReport } = useResearchSession(sessionId, initialQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SessionHeader sessionId={sessionId} />

      {clarification.isPending ? (
        <ClarificationPanel
          questions={clarification.questions}
          sessionId={clarification.sessionId}
          onSubmit={answerClarification}
          onSkip={skipClarification}
        />
      ) : (
        <>
          <PipelineStepper />
          <MetricsGrid />
          <SessionContent onRegenerate={regenerateReport} />
        </>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F3B7A]" />
      </div>
    }>
      <SessionContentInner />
    </Suspense>
  );
}
