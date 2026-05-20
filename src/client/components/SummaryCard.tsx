import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { ConfidenceBadge } from './ConfidenceBadge.js';
import {
  deriveBriefHeadline,
  humanizeConfidence,
  humanizePriority,
  humanizeSuggestedAction,
  humanizeSummaryParagraph,
  REVIEW_BRIEF_UI,
} from '../../shared/reviewBrief.js';

type Props = { result: ValidatedAnalysisResult };

export function SummaryCard({ result }: Props) {
  const ai = result.aiAnalysis;
  const headline = deriveBriefHeadline(result);
  const paragraph = ai?.summary ? humanizeSummaryParagraph(ai.summary) : null;

  return (
    <section className="summary-card">
      <h2 className="summary-headline">{headline}</h2>
      {ai ? (
        <div className="summary-row summary-pills">
          <div className="summary-item">
            <span className="label">Priority</span>
            <span className={`pill priority-${ai.reviewPriority}`}>{humanizePriority(ai.reviewPriority)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Suggested action</span>
            <span className="pill action-pill">{humanizeSuggestedAction(ai.suggestedAction)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Confidence</span>
            <ConfidenceBadge level={ai.confidence} label={humanizeConfidence(ai.confidence)} />
          </div>
        </div>
      ) : null}
      {paragraph ? <p className="summary-paragraph">{paragraph}</p> : null}
      <p className="summary-advisory muted small">{REVIEW_BRIEF_UI.advisoryLine}</p>
    </section>
  );
}
