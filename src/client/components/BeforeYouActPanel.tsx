import { useState } from 'react';
import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { deriveBeforeYouActNotes, REVIEW_BRIEF_UI } from '../../shared/reviewBrief.js';

const VISIBLE_DEFAULT = 3;

type Props = { result: ValidatedAnalysisResult };

export function BeforeYouActPanel({ result }: Props) {
  const notes = deriveBeforeYouActNotes(result);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? notes : notes.slice(0, VISIBLE_DEFAULT);
  const hasMore = notes.length > VISIBLE_DEFAULT;

  if (!notes.length) {
    return null;
  }

  return (
    <section className="subsection before-you-act">
      <h3>{REVIEW_BRIEF_UI.beforeYouActHeading}</h3>
      <ul className="before-you-act-list">
        {visible.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {hasMore ? (
        <button type="button" className="buttonish secondary caution-toggle" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </section>
  );
}
