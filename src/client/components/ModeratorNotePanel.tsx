import { useState } from 'react';
import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import {
  deriveDetailedModeratorNote,
  deriveShortModeratorNote,
  REVIEW_BRIEF_UI,
} from '../../shared/reviewBrief.js';

type Props = { result: ValidatedAnalysisResult };

export function ModeratorNotePanel({ result }: Props) {
  const [copied, setCopied] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const shortNote = deriveShortModeratorNote(result);
  const detailedNote = deriveDetailedModeratorNote(result);
  const note = detailed ? detailedNote : shortNote;

  async function copyNote() {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="subsection moderator-note-panel">
      <div className="section-head">
        <h3>{REVIEW_BRIEF_UI.moderatorNoteHeading}</h3>
        <div className="note-actions">
          <button type="button" className="buttonish secondary" onClick={() => setDetailed((v) => !v)}>
            {detailed ? REVIEW_BRIEF_UI.shortNoteToggle : REVIEW_BRIEF_UI.detailedNoteToggle}
          </button>
          <button type="button" className="buttonish secondary" onClick={() => void copyNote()}>
            {copied ? REVIEW_BRIEF_UI.copiedButton : REVIEW_BRIEF_UI.copyButton}
          </button>
        </div>
      </div>
      <p className="muted small">{REVIEW_BRIEF_UI.noteHelper}</p>
      <pre className="moderator-note-text">{note}</pre>
    </section>
  );
}
