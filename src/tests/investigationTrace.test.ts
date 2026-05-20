import { describe, expect, it } from 'vitest';
import type { AIAnalysisResponse, ContextBundle, DeterministicSignal } from '../shared/queueLensDomain.js';
import {
  attachInvestigationTrace,
  buildAiCallOutcomeStep,
  buildContextGatheredStep,
  buildDeterministicSignalsStep,
  buildValidationWarningsStep,
  createInvestigationTrace,
  INVESTIGATION_TRACE_ADVISORY,
} from '../shared/investigationTrace.js';

const bundle: ContextBundle = {
  target: {
    id: 't3_demo',
    type: 'post',
    subredditName: 'demo',
    authorName: 'alice',
    title: 'Hello',
    bodyText: 'World',
  },
  parentContext: [{ text: 'parent', sourceLabel: 'parent' }],
  recentUserActivity: [],
  subredditRules: [{ id: '1', title: 'Be nice', description: 'No harassment.' }],
  ruleSource: 'demo_fallback',
  unavailableContext: [{ domain: 'user_history', reason: 'rate_limited' }],
};

const signals: DeterministicSignal[] = [
  {
    id: 'link',
    label: 'Contains URL',
    severity: 'medium',
    matchedText: 'http://example.com',
    reason: 'Body contains a URL.',
  },
];

describe('investigationTrace helpers', () => {
  it('builds context gathered step with counts and partial status when context is unavailable', () => {
    const step = buildContextGatheredStep(bundle);
    expect(step.id).toBe('context_gathered');
    expect(step.status).toBe('partial');
    expect(step.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining('t3_demo'),
        'Parent context items: 1',
        'Recent user activity items: 0',
        'Subreddit rules: 1 (demo_fallback)',
        expect.stringContaining('Unavailable context'),
      ]),
    );
  });

  it('builds deterministic signals step', () => {
    const step = buildDeterministicSignalsStep(signals);
    expect(step.id).toBe('deterministic_signals');
    expect(step.summary).toContain('1 deterministic');
    expect(step.details?.[0]).toContain('Contains URL');
  });

  it('builds AI outcome step for parsed and error responses', () => {
    const ok: AIAnalysisResponse = {
      raw: {},
      parsed: {
        summary: 'ok',
        possibleRuleMatches: [],
        reviewPriority: 'low',
        suggestedAction: 'approve',
        confidence: 'low',
        evidence: [],
      },
    };
    expect(buildAiCallOutcomeStep(ok).status).toBe('ok');

    const err: AIAnalysisResponse = { raw: null, error: 'missing key' };
    expect(buildAiCallOutcomeStep(err).status).toBe('error');
    expect(buildAiCallOutcomeStep(err).summary).toContain('missing key');
  });

  it('builds validation warnings step from warnings and status', () => {
    const step = buildValidationWarningsStep(['Removed snippet.'], 'partial');
    expect(step.id).toBe('validation_warnings');
    expect(step.status).toBe('partial');
    expect(step.details).toEqual(['Removed snippet.']);
  });

  it('attaches advisory trace to validated results', () => {
    const trace = createInvestigationTrace([
      buildContextGatheredStep(bundle),
      buildDeterministicSignalsStep(signals),
      buildAiCallOutcomeStep({ raw: null, error: 'offline' }),
      buildValidationWarningsStep(['offline'], 'partial'),
    ]);
    expect(trace.advisory).toBe(true);
    expect(trace.steps).toHaveLength(4);

    const attached = attachInvestigationTrace(
      {
        status: 'partial',
        contextBundle: bundle,
        deterministicSignals: signals,
        evidenceFallbackUsed: false,
        validationWarnings: ['offline'],
      },
      trace.steps,
    );
    expect(attached.investigationTrace?.advisory).toBe(true);
    expect(INVESTIGATION_TRACE_ADVISORY).toContain('Advisory');
  });
});
