import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { getMatchedRules, getOtherRulesChecked, REVIEW_BRIEF_UI } from '../../shared/reviewBrief.js';
import { CollapsibleSection } from './CollapsibleSection.js';

type Props = { result: ValidatedAnalysisResult };

export function RulesPanel({ result }: Props) {
  const matched = getMatchedRules(result);
  const other = getOtherRulesChecked(result);

  if (!matched.length && !other.length) {
    return null;
  }

  return (
    <section className="subsection rules-panel">
      <h3>{REVIEW_BRIEF_UI.rulesHeading}</h3>
      {matched.length > 0 ? (
        <ul className="matched-rules-list">
          {matched.map((rule) => (
            <li key={rule.title} className="matched-rule">
              <details className="rule-details">
                <summary className="rule-details-summary">{rule.title}</summary>
                <p className="muted small rule-description">{rule.description}</p>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">No specific rules were matched for this run.</p>
      )}

      {other.length > 0 ? (
        <CollapsibleSection title={REVIEW_BRIEF_UI.otherRulesHeading} className="other-rules-disclosure">
          <ul className="plain-list">
            {other.map((rule) => (
              <li key={rule.id}>
                <span className="rule-chip">{rule.title}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}
    </section>
  );
}
