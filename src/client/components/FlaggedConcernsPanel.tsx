import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { deriveConcerns, REVIEW_BRIEF_UI } from '../../shared/reviewBrief.js';

type Props = { result: ValidatedAnalysisResult };

export function FlaggedConcernsPanel({ result }: Props) {
  const concerns = deriveConcerns(result);
  if (!concerns.length) {
    return null;
  }

  return (
    <section className="subsection flagged-concerns">
      <h3>{REVIEW_BRIEF_UI.whyFlaggedHeading}</h3>
      <ul className="concern-card-list">
        {concerns.map((concern) => (
          <li key={concern.id} className="concern-card">
            <strong>{concern.label}</strong>
            <p className="muted small">{concern.shortWhy}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
