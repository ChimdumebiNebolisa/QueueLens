import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { REVIEW_BRIEF_UI, translateValidationWarning } from '../../shared/reviewBrief.js';
import { CollapsibleSection } from './CollapsibleSection.js';
import { ContextSnapshotPanel } from './ContextSnapshotPanel.js';
import { InvestigationTracePanel } from './InvestigationTracePanel.js';
import { RawContextDrawer } from './RawContextDrawer.js';
import { SignalList } from './SignalList.js';

type Props = { result: ValidatedAnalysisResult };

function AnalysisChecks({ result }: Props) {
  return (
    <div className="technical-subsection">
      <h4>Analysis checks</h4>
      <ul className="quality-list">
        <li className="quality-pass">Output matched expected format</li>
        <li className="quality-pass">Evidence snippets were verified</li>
        <li className="quality-pass">No automatic action taken</li>
        <li className="quality-pass">Raw context available</li>
        {result.evidenceFallbackUsed ? (
          <li className="quality-note">Backup evidence was used when AI evidence was empty</li>
        ) : null}
      </ul>
    </div>
  );
}

function ValidationNotes({ result }: Props) {
  if (!result.validationWarnings.length) {
    return null;
  }
  return (
    <div className="technical-subsection">
      <h4>Validation notes</h4>
      <ul className="plain-list technical-warning-list">
        {result.validationWarnings.map((warning) => (
          <li key={warning}>
            <span>{translateValidationWarning(warning)}</span>
            <span className="muted small technical-warning-raw">{warning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TechnicalDetailsPanel({ result }: Props) {
  return (
    <CollapsibleSection title={REVIEW_BRIEF_UI.technicalDetailsHeading} className="technical-details-outer">
      <div className="technical-details-body">
        <div className="technical-subsection">
          <h4>What QueueLens checked</h4>
          <p className="muted small">Step-by-step record of how this brief was built.</p>
          <InvestigationTracePanel trace={result.investigationTrace} />
        </div>

        <ContextSnapshotPanel result={result} embedded />

        <div className="technical-subsection">
          <h4>Extra checks</h4>
          <SignalList signals={result.deterministicSignals} embedded />
        </div>

        <AnalysisChecks result={result} />
        <ValidationNotes result={result} />

        <div className="technical-subsection">
          <h4>Raw context</h4>
          <RawContextDrawer result={result} embedded />
        </div>
      </div>
    </CollapsibleSection>
  );
}
