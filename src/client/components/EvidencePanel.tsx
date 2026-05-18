import type { EvidenceItem } from '../../shared/queueLensDomain.js';

type Props = {
  items: EvidenceItem[];
  fallbackUsed?: boolean;
};

function sourceLabel(source: EvidenceItem['source']): string {
  const labels: Record<EvidenceItem['source'], string> = {
    reported_content: 'Reported content',
    parent_context: 'Parent context',
    user_history: 'User activity',
    subreddit_rule: 'Subreddit rule',
    deterministic_signal: 'Deterministic signal',
  };

  return labels[source];
}

export function EvidencePanel({ items, fallbackUsed = false }: Props) {
  if (!items.length) {
    return (
      <section className="panel evidence-panel">
        <div className="section-head">
          <h3>Evidence</h3>
          {fallbackUsed && <span className="badge">fallback used</span>}
        </div>
        <p className="muted">No validated exact-match evidence snippets for this run.</p>
      </section>
    );
  }
  return (
    <section className="panel evidence-panel">
      <div className="section-head">
        <h3>Evidence (exact snippets)</h3>
        {fallbackUsed && <span className="badge">fallback used</span>}
      </div>
      <ul className="evidence-list">
        {items.map((e, i) => (
          <li key={`${e.snippet}-${i}`}>
            <code className="snippet">{e.snippet}</code>
            <div className="meta">
              <span className="badge">{sourceLabel(e.source)}</span>
              <span className="why">{e.reason}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
