import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import { humanizeSummaryParagraph } from '../../shared/reviewBrief.js';
import { BeforeYouActPanel } from './BeforeYouActPanel.js';
import { FlaggedConcernsPanel } from './FlaggedConcernsPanel.js';
import { GroupedEvidencePanel } from './GroupedEvidencePanel.js';
import { ModeratorNotePanel } from './ModeratorNotePanel.js';
import { ReviewedTargetHeader } from './ReviewedTargetHeader.js';
import { RulesPanel } from './RulesPanel.js';
import { SummaryCard } from './SummaryCard.js';
import { TechnicalDetailsPanel } from './TechnicalDetailsPanel.js';

type Props = { result: ValidatedAnalysisResult };

export function DecisionCard({ result }: Props) {
  const ai = result.aiAnalysis;

  if (!ai) {
    return (
      <section className="card">
        <ReviewedTargetHeader contextBundle={result.contextBundle} />
        <SummaryCard result={result} />
        {result.safeFallbackMessage ? (
          <p className="muted summary-paragraph">{humanizeSummaryParagraph(result.safeFallbackMessage)}</p>
        ) : null}
        <FlaggedConcernsPanel result={result} />
        <GroupedEvidencePanel result={result} fallbackUsed={result.evidenceFallbackUsed} />
        <ModeratorNotePanel result={result} />
        <BeforeYouActPanel result={result} />
        <TechnicalDetailsPanel result={result} />
      </section>
    );
  }

  return (
    <section className="card">
      <ReviewedTargetHeader contextBundle={result.contextBundle} />
      <SummaryCard result={result} />
      <FlaggedConcernsPanel result={result} />
      <GroupedEvidencePanel result={result} fallbackUsed={result.evidenceFallbackUsed} />
      <RulesPanel result={result} />
      <ModeratorNotePanel result={result} />
      <BeforeYouActPanel result={result} />
      <TechnicalDetailsPanel result={result} />
    </section>
  );
}
