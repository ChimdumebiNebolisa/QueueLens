import type { DeterministicSignal } from '../../shared/queueLensDomain.js';
import { CollapsibleSection } from './CollapsibleSection.js';

type Props = { signals: DeterministicSignal[] };

function signalSummaryHint(signals: DeterministicSignal[]): string {
  if (!signals.length) {
    return 'none';
  }
  return `${signals.length} signal${signals.length === 1 ? '' : 's'}`;
}

export function SignalList({ signals }: Props) {
  return (
    <CollapsibleSection
      className="signal-list-outer"
      title="Deterministic signals"
      summaryHint={signalSummaryHint(signals)}
    >
      <section className="subsection signal-list-section" aria-label="Deterministic signals">
        {!signals.length ? (
          <p className="muted">No deterministic signals were produced.</p>
        ) : (
          <>
            <p className="muted small">Heuristic flags only, not proof of a violation.</p>
            <ul className="signal-list">
              {signals.map((s) => (
                <li key={s.id}>
                  <div className="signal-head">
                    <span className={`sev sev-${s.severity}`}>{s.severity}</span>
                    <strong>{s.label}</strong>
                  </div>
                  <p>{s.reason}</p>
                  {s.matchedText && <code className="snippet small">{s.matchedText}</code>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </CollapsibleSection>
  );
}
