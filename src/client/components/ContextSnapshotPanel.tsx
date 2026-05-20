import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';
import {
  buildContextSnapshot,
  formatTargetTypeLine,
  formatUnavailableContextDomain,
} from '../../shared/contextSnapshot.js';
import { CollapsibleSection } from './CollapsibleSection.js';
import './contextSnapshot.css';

type Props = {
  result: ValidatedAnalysisResult;
};

function countLabel(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

function buildSummaryHint(snapshot: ReturnType<typeof buildContextSnapshot>): string {
  const parts = [
    `r/${snapshot.subredditName}`,
    countLabel(snapshot.subredditRulesCount, 'rule'),
    countLabel(snapshot.parentContextCount, 'parent item', 'parent items'),
    countLabel(snapshot.recentUserActivityCount, 'history item', 'history items'),
  ];
  return parts.join(' · ');
}

export function ContextSnapshotPanel({ result }: Props) {
  const snapshot = buildContextSnapshot(result.contextBundle);

  return (
    <CollapsibleSection
      className="context-snapshot-outer"
      title="Context snapshot"
      summaryHint={buildSummaryHint(snapshot)}
    >
      <section className="context-snapshot subsection" aria-label="Context snapshot">
        <dl className="context-snapshot-facts">
          <div>
            <dt>Target</dt>
            <dd>{formatTargetTypeLine(snapshot)}</dd>
          </div>
          <div>
            <dt>Subreddit</dt>
            <dd>r/{snapshot.subredditName}</dd>
          </div>
          <div>
            <dt>Rules</dt>
            <dd>
              {snapshot.ruleSourceLabel} ({countLabel(snapshot.subredditRulesCount, 'rule')})
            </dd>
          </div>
          <div>
            <dt>Parent context</dt>
            <dd>{countLabel(snapshot.parentContextCount, 'item')}</dd>
          </div>
          <div>
            <dt>User history</dt>
            <dd>{countLabel(snapshot.recentUserActivityCount, 'item')}</dd>
          </div>
        </dl>

        {snapshot.unavailableNotes.length > 0 ? (
          <div className="context-snapshot-unavailable">
            <p className="label">Unavailable context</p>
            <ul className="context-snapshot-note-list">
              {snapshot.unavailableNotes.map((note) => (
                <li key={`${note.domain}-${note.reason}`}>
                  <span className="context-snapshot-domain">{formatUnavailableContextDomain(note.domain)}</span>
                  <span className="context-snapshot-reason">{note.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {snapshot.redactionNotice ? (
          <p className="context-snapshot-redaction small">{snapshot.redactionNotice}</p>
        ) : null}
      </section>
    </CollapsibleSection>
  );
}
