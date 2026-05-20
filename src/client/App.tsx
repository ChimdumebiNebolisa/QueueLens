import { useEffect, useState } from 'react';
import type { ValidatedAnalysisResult } from '../shared/queueLensDomain.js';
import { fetchValidatedAnalysis } from './api.js';
import { ContextSnapshotPanel } from './components/ContextSnapshotPanel.js';
import { DecisionCard } from './components/DecisionCard.js';
import { SignalList } from './components/SignalList.js';
import { RawContextDrawer } from './components/RawContextDrawer.js';
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
          QueueLens sends bounded public thread text and rules to OpenAI when configured. The API key is server-side only
          (Devvit secret).
        </p>
      </>
    );
  }

  const phase: 'success' | 'partial' | 'error' =
    result.status === 'success' ? 'success' : result.status === 'partial' ? 'partial' : 'error';

  return (
    <main className="app">
      <header className="top">
        <h1>QueueLens</h1>
      </header>

      <StatePanel
        phase={phase}
        message={
          result.validationWarnings.length
            ? result.validationWarnings.join(' ')
            : result.safeFallbackMessage
        }
      />

      <DecisionCard result={result} />

      <ContextSnapshotPanel result={result} />

      <SignalList signals={result.deterministicSignals} />

      <RawContextDrawer result={result} />

      <footer className="footer muted small">
        <p>
          Final moderation decisions remain with you. QueueLens does not remove, ban, message users, or change Reddit
          state.
        </p>
        <p className="privacy">
          Privacy: only bounded text you see in the raw context drawer is eligible to be sent to OpenAI for this tool.
        </p>
      </footer>
    </main>
  );
}
