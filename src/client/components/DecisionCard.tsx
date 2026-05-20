import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { ConfidenceBadge } from './ConfidenceBadge.js';
import { EvidencePanel } from './EvidencePanel.js';
import { InvestigationTracePanel } from './InvestigationTracePanel.js';
import { ModerationGuidance } from './ModerationGuidance.js';
import { ReviewedTargetHeader } from './ReviewedTargetHeader.js';

type Props = { result: ValidatedAnalysisResult };

export function DecisionCard({ result }: Props) {
  const ai = result.aiAnalysis;

  if (!ai) {
    return (
      <section className="card">
        <ReviewedTargetHeader contextBundle={result.contextBundle} />
        <h2>QueueLens</h2>
        <p className="muted">{result.safeFallbackMessage ?? 'No AI summary available for this run.'}</p>
        <ModerationGuidance result={result} />
        <InvestigationTracePanel trace={result.investigationTrace} />
      </section>
    );
  }

  return (
    <section className="card">
      <ReviewedTargetHeader contextBundle={result.contextBundle} />
      <header className="card-header">
        <h2>Review brief</h2>
        <p className="disclaimer">
          Review assistance only. Final decision stays with the moderator.
        </p>
      </header>
      <p className="summary">{ai.summary}</p>
      <div className="summary-row">
        <div className="summary-item">
          <span className="label">Review priority</span>
          <span className={`pill priority-${ai.reviewPriority}`}>{ai.reviewPriority}</span>
        </div>
        <div className="summary-item">
          <span className="label">Confidence</span>
          <ConfidenceBadge level={ai.confidence} />
        </div>
        <div className="summary-item">
          <span className="label">Suggested action</span>
          <span className="pill">{ai.suggestedAction}</span>
        </div>
      </div>

      <EvidencePanel items={ai.evidence} fallbackUsed={result.evidenceFallbackUsed} />

      <ModerationGuidance result={result} />

      <div className="rules">
        <div className="section-head">
          <span className="label">Rule coverage</span>
          <span className="badge">{result.contextBundle.ruleSource === 'live' ? 'live rules' : 'demo fallback rules'}</span>
        </div>
        <div className="rule-columns">
          <div>
            <span className="label">Rules considered</span>
            <ul className="plain-list">
              {result.contextBundle.subredditRules.map((rule) => (
                <li key={rule.id}>
                  <span className="rule-chip">{rule.title}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="label">Possible matched rules</span>
            {ai.possibleRuleMatches.length > 0 ? (
              <ul className="plain-list">
                {ai.possibleRuleMatches.map((rule) => (
                  <li key={rule}>
                    <span className="rule-chip matched">{rule}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No specific rule match surfaced for this run.</p>
            )}
          </div>
        </div>
      </div>

      <div className="quality-checks">
        <span className="label">Analysis quality</span>
        <ul className="quality-list">
          <li className="quality-pass">Schema valid</li>
          <li className="quality-pass">Evidence validated</li>
          <li className="quality-pass">No automatic action taken</li>
          <li className="quality-pass">Raw context available</li>
          {result.evidenceFallbackUsed && <li className="quality-note">Deterministic evidence fallback used</li>}
        </ul>
      </div>

      <InvestigationTracePanel trace={result.investigationTrace} />
    </section>
  );
}
