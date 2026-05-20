import type {
  AIAnalysisResponse,
  ContextBundle,
  DeterministicSignal,
  InvestigationTrace,
  InvestigationTraceStep,
  InvestigationTraceStepStatus,
  ValidatedAnalysisResult,
} from './queueLensDomain.js';

export const INVESTIGATION_TRACE_ADVISORY = 'Advisory trace only. Does not change moderation outcomes.';

export function createInvestigationTrace(steps: InvestigationTraceStep[]): InvestigationTrace {
  return { advisory: true, steps };
}

function step(
  id: InvestigationTraceStep['id'],
  label: string,
  status: InvestigationTraceStepStatus,
  summary: string,
  details?: string[],
): InvestigationTraceStep {
  return details?.length ? { id, label, status, summary, details } : { id, label, status, summary };
}

export function buildContextGatheredStep(contextBundle: ContextBundle): InvestigationTraceStep {
  const { target, parentContext, recentUserActivity, subredditRules, ruleSource, unavailableContext } =
    contextBundle;
  const details = [
    `Target: ${target.type} (${target.id}) in r/${target.subredditName}`,
    `Parent context items: ${parentContext.length}`,
    `Recent user activity items: ${recentUserActivity.length}`,
    `Subreddit rules: ${subredditRules.length} (${ruleSource})`,
  ];
  if (unavailableContext.length > 0) {
    details.push(
      `Unavailable context: ${unavailableContext.map((n) => `${n.domain} (${n.reason})`).join('; ')}`,
    );
  }
  const status: InvestigationTraceStepStatus =
    unavailableContext.length > 0 ? 'partial' : 'ok';
  return step(
    'context_gathered',
    'Context gathered',
    status,
    `Bounded Reddit context assembled for ${target.type} in r/${target.subredditName}.`,
    details,
  );
}

export function buildDeterministicSignalsStep(signals: DeterministicSignal[]): InvestigationTraceStep {
  if (signals.length === 0) {
    return step(
      'deterministic_signals',
      'Deterministic signals',
      'ok',
      'No deterministic signals matched this target.',
    );
  }
  const maxSeverity = signals.some((s) => s.severity === 'high')
    ? 'high'
    : signals.some((s) => s.severity === 'medium')
      ? 'medium'
      : signals.some((s) => s.severity === 'low')
        ? 'low'
        : 'info';
  const status: InvestigationTraceStepStatus =
    maxSeverity === 'high' ? 'partial' : 'ok';
  return step(
    'deterministic_signals',
    'Deterministic signals',
    status,
    `${signals.length} deterministic signal(s) extracted before AI analysis.`,
    signals.map((s) => `${s.severity}: ${s.label} (${s.id})`),
  );
}

export function buildAiCallOutcomeStep(ai: AIAnalysisResponse): InvestigationTraceStep {
  if (ai.parsed) {
    return step(
      'ai_call_outcome',
      'AI call outcome',
      'ok',
      'OpenAI returned JSON matching the QueueLens analysis contract.',
      [
        `Review priority: ${ai.parsed.reviewPriority}`,
        `Suggested action: ${ai.parsed.suggestedAction}`,
        `Confidence: ${ai.parsed.confidence}`,
        `Evidence items in model output: ${ai.parsed.evidence.length}`,
      ],
    );
  }
  const status: InvestigationTraceStepStatus = ai.raw != null ? 'partial' : 'error';
  return step(
    'ai_call_outcome',
    'AI call outcome',
    status,
    ai.error ?? 'AI analysis did not produce a usable structured result.',
    ai.raw != null ? ['Raw provider response retained server-side; not shown in UI.'] : undefined,
  );
}

export function buildValidationWarningsStep(
  warnings: string[],
  status: ValidatedAnalysisResult['status'],
): InvestigationTraceStep {
  const stepStatus: InvestigationTraceStepStatus =
    status === 'error' ? 'error' : warnings.length > 0 ? 'partial' : 'ok';
  return step(
    'validation_warnings',
    'Validation warnings',
    stepStatus,
    warnings.length > 0
      ? `${warnings.length} validation warning(s) recorded for this run.`
      : 'Validation completed with no warnings.',
    warnings.length > 0 ? warnings : undefined,
  );
}

export function attachInvestigationTrace(
  result: ValidatedAnalysisResult,
  steps: InvestigationTraceStep[],
): ValidatedAnalysisResult {
  return { ...result, investigationTrace: createInvestigationTrace(steps) };
}
