import { useEffect, useState } from 'react';
import type { ValidatedAnalysisResult } from '../shared/queueLensDomain.js';
import { REVIEW_BRIEF_UI } from '../shared/reviewBrief.js';
import { fetchValidatedAnalysis } from './api.js';
import { DecisionCard } from './components/DecisionCard.js';
import { StatePanel } from './components/StatePanel.js';

export function App() {
  const [result, setResult] = useState<ValidatedAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchValidatedAnalysis();
        if (!cancelled) setResult(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <StatePanel phase="loading" />;
  }

  if (error || !result) {
    return (
      <>
        <StatePanel phase="error" message={error ?? 'No data.'} />
        <p className="privacy muted small">
          QueueLens sends bounded public thread text and rules to OpenAI when configured. The API key stays on the
          server only.
        </p>
      </>
    );
  }

  const phase: 'success' | 'partial' | 'error' =
    result.status === 'success' ? 'success' : result.status === 'partial' ? 'partial' : 'error';

  const bannerMessage =
    phase === 'partial' && result.validationWarnings.length > 0
      ? REVIEW_BRIEF_UI.partialBanner
      : phase === 'partial'
        ? result.safeFallbackMessage
        : undefined;

  return (
    <main className="app">
      <header className="top">
        <h1>QueueLens</h1>
      </header>

      <StatePanel phase={phase} message={bannerMessage} />

      <DecisionCard result={result} />

      <footer className="footer muted small">
        <p className="privacy">
          Privacy: only text shown in Technical details raw context may be sent to OpenAI for this review.
        </p>
      </footer>
    </main>
  );
}
