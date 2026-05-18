import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';

type Props = { result: ValidatedAnalysisResult };

export function DecisionCard({ result }: Props) {
  const ai = result.aiAnalysis;
  if (!ai) {
    return (
      <section className="card">
        <h2>QueueLens</h2>
        <p className="muted">{result.safeFallbackMessage ?? 'No AI summary available for this run.'}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2>Review brief</h2>
        <p className="disclaimer">
          The human moderator makes the final decision. QueueLens output is advisory only and is not enforcement.
        </p>
      </header>
      <p className="summary">{ai.summary}</p>
      <div className="row">
        <div>
          <span className="label">Review priority</span>
          <span className={`pill priority-${ai.reviewPriority}`}>{ai.reviewPriority}</span>
        </div>
        <div>
          <span className="label">Suggested action</span>
          <span className="pill">{ai.suggestedAction}</span>
        </div>
      </div>
      {ai.possibleRuleMatches.length > 0 && (
        <div className="rules">
          <span className="label">Possible rule matches</span>
          <ul>
            {ai.possibleRuleMatches.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {ai.moderatorNoteDraft && (
        <div className="draft">
          <span className="label">Moderator note draft (optional)</span>
          <pre>{ai.moderatorNoteDraft}</pre>
        </div>
      )}
    </section>
  );
}
