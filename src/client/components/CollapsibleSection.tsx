import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string | undefined;
  summaryHint?: string | undefined;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  subtitle,
  summaryHint,
  defaultOpen = false,
  className,
  children,
}: Props) {
  return (
    <details className={['disclosure', className].filter(Boolean).join(' ')} open={defaultOpen || undefined}>
      <summary className="disclosure-summary">
        <span className="disclosure-summary-main">
          <span className="disclosure-title">{title}</span>
          {summaryHint ? <span className="disclosure-hint muted small">{summaryHint}</span> : null}
        </span>
        {subtitle ? <span className="disclosure-subtitle muted small">{subtitle}</span> : null}
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
