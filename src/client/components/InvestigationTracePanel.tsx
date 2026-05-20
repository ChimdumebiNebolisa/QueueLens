import type { InvestigationTrace, InvestigationTraceStepStatus } from '../../shared/queueLensDomain.js';
import { INVESTIGATION_TRACE_ADVISORY } from '../../shared/investigationTrace.js';
import '../investigationTrace.css';

type Props = {
  trace: InvestigationTrace | undefined;
};

function statusLabel(status: InvestigationTraceStepStatus): string {
  const labels: Record<InvestigationTraceStepStatus, string> = {
    ok: 'OK',
    partial: 'Partial',
    error: 'Error',
  };
  return labels[status];
}

export function InvestigationTracePanel({ trace }: Props) {
  if (!trace) {
    return <p className="muted small">No investigation trace recorded for this run.</p>;
  }

  return (
    <div className="investigation-trace" aria-label="Investigation trace">
      <div className="section-head investigation-trace-head">
        <span className="badge investigation-trace-badge">advisory</span>
      </div>
      <p className="investigation-trace-advisory muted small">{INVESTIGATION_TRACE_ADVISORY}</p>
      <ol className="investigation-trace-steps">
        {trace.steps.map((step) => (
          <li key={step.id} className={`investigation-trace-step status-${step.status}`}>
            <div className="investigation-trace-step-head">
              <span className="investigation-trace-step-label">{step.label}</span>
              <span className={`investigation-trace-status pill status-${step.status}`}>
                {statusLabel(step.status)}
              </span>
            </div>
            <p className="investigation-trace-summary">{step.summary}</p>
            {step.details && step.details.length > 0 && (
              <ul className="investigation-trace-details plain-list">
                {step.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
