import { useState } from 'react';
import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import {
  deriveCautionReasons,
  deriveSuggestedModeratorNote,
  MODERATION_GUIDANCE_UI_LABELS,
} from '../../shared/moderationGuidance.js';

const CAUTION_VISIBLE_DEFAULT = 3;

type Props = { result: ValidatedAnalysisResult };

export function ModerationGuidance({ result }: Props) {
  const cautionReasons = deriveCautionReasons(result);
  const moderatorNote = deriveSuggestedModeratorNote(result);
  const [copied, setCopied] = useState(false);
  const [showAllCaution, setShowAllCaution] = useState(false);

  const visibleCautionReasons = showAllCaution
    ? cautionReasons
    : cautionReasons.slice(0, CAUTION_VISIBLE_DEFAULT);
  const hasMoreCaution = cautionReasons.length > CAUTION_VISIBLE_DEFAULT;

  async function copyNote(note: string) {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      {cautionReasons.length > 0 && (
        <div className="caution">
          <span className="label">{MODERATION_GUIDANCE_UI_LABELS.cautionHeading}</span>
          <ul className="caution-list">
            {visibleCautionReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {hasMoreCaution ? (
            <button
              type="button"
              className="buttonish secondary caution-toggle"
              onClick={() => setShowAllCaution((open) => !open)}
            >
              {showAllCaution ? 'Show less' : 'Show more'}
            </button>
          ) : null}
        </div>
      )}

      <div className="draft">
        <div className="section-head">
          <span className="label">{MODERATION_GUIDANCE_UI_LABELS.moderatorNoteHeading}</span>
          <button type="button" className="buttonish secondary" onClick={() => void copyNote(moderatorNote)}>
            {copied ? MODERATION_GUIDANCE_UI_LABELS.copiedButton : MODERATION_GUIDANCE_UI_LABELS.copyButton}
          </button>
        </div>
        <p className="muted small">Advisory text only. Copying or reading this note does not change Reddit.</p>
        <pre>{moderatorNote}</pre>
      </div>
    </>
  );
}
