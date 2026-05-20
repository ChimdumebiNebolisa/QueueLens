import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { groupEvidenceByConcern, REVIEW_BRIEF_UI } from '../../shared/reviewBrief.js';

type Props = { result: ValidatedAnalysisResult; fallbackUsed?: boolean };

export function GroupedEvidencePanel({ result, fallbackUsed = false }: Props) {
  const groups = groupEvidenceByConcern(result);
  const hasEvidence = groups.some((g) => g.items.length > 0);

  return (
    <section className="subsection grouped-evidence">
      <div className="section-head">
        <h3>{REVIEW_BRIEF_UI.evidenceHeading}</h3>
        {fallbackUsed ? <span className="badge quality-note">{REVIEW_BRIEF_UI.evidenceFallbackNote}</span> : null}
      </div>
      {!hasEvidence ? (
        <p className="muted">{REVIEW_BRIEF_UI.noEvidence}</p>
      ) : (
        <div className="evidence-groups">
          {groups.map((group) => (
            <div key={group.concernId} className="evidence-group">
              <h4 className="evidence-group-title">{group.label}</h4>
              {group.items.length === 0 ? (
                <p className="muted small">
                  {group.concernId === 'rude_language'
                    ? REVIEW_BRIEF_UI.rudeLanguageNoSnippet
                    : REVIEW_BRIEF_UI.noVerifiedSnippet}
                </p>
              ) : (
                <ul className="evidence-list">
                  {group.items.map((item, index) => (
                    <li key={`${group.concernId}-${item.snippet}-${index}`}>
                      <code className="snippet">{item.snippet}</code>
                      <p className="why small">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
