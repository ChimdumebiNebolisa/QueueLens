import type { DeterministicSignal } from '../../shared/queueLensDomain.js';

type Props = { signals: DeterministicSignal[] };

export function SignalList({ signals }: Props) {
  if (!signals.length) {
    return (
      <section className="panel">
        <h3>Deterministic signals</h3>
        <p className="muted">No deterministic signals were produced.</p>
      </section>
    );
  }
  return (
    <section className="panel">
      <h3>Deterministic signals</h3>
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
    </section>
  );
}
