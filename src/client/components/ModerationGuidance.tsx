import { useState } from 'react';
import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import {
  deriveCautionReasons,
  deriveSuggestedModeratorNote,
  MODERATION_GUIDANCE_UI_LABELS,
} from '../../shared/moderationGuidance.js';

type Props = { result: ValidatedAnalysisResult };

export function ModerationGuidance({ result }: Props) {
  const cautionReasons = deriveCautionReasons(result);
  const moderatorNote = deriveSuggestedModeratorNote(result);
  const [copied, setCopied] = useState(false);

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
            {cautionReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
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
