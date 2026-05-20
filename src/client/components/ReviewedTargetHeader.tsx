import type { ContextBundle } from '../../shared/queueLensDomain.js';
import { buildReviewedTargetHeaderView } from '../../shared/reviewedTargetHeader.js';

type Props = {
  contextBundle: ContextBundle;
};

export function ReviewedTargetHeader({ contextBundle }: Props) {
  const view = buildReviewedTargetHeaderView(contextBundle);

  return (
    <section className="reviewed-target" aria-label="Reviewed target">
      <p className="reviewed-target-kind">{view.kindLabel}</p>
      <p className="reviewed-target-headline">{view.headline}</p>
      <p className="reviewed-target-meta muted small">{view.metaLine}</p>
      {view.permalink ? (
        <p className="reviewed-target-link small">
          <a href={view.permalink} target="_blank" rel="noopener noreferrer">
            Open target on Reddit
          </a>
        </p>
      ) : null}
    </section>
  );
}
