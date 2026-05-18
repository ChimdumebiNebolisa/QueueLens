import type { EvidenceItem } from '../../shared/queueLensDomain.js';

type Props = { items: EvidenceItem[] };

export function EvidencePanel({ items }: Props) {
  if (!items.length) {
    return (
      <section className="panel">
        <h3>Evidence</h3>
        <p className="muted">No validated exact-match evidence snippets for this run.</p>
      </section>
    );
  }
  return (
    <section className="panel">
      <h3>Evidence (exact snippets)</h3>
      <ul className="evidence-list">
        {items.map((e, i) => (
          <li key={`${e.snippet}-${i}`}>
            <code className="snippet">{e.snippet}</code>
            <div className="meta">
              <span className="badge">{e.source}</span>
              <span>{e.reason}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
