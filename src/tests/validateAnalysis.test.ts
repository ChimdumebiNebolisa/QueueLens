import { describe, expect, it } from 'vitest';
import type { ContextBundle, DeterministicSignal } from '../shared/queueLensDomain.js';
import { validateAnalysis } from '../server/analysis/validateAnalysis.js';

function baseContext(overrides: Partial<ContextBundle> = {}): ContextBundle {
  return {
    target: {
      id: 't3_abc',
      type: 'post',
      subredditName: 'test',
      authorName: 'alice',
      title: 'Check this deal',
      bodyText: 'Visit http://spam.example for free stuff.',
      permalink: '/r/test/comments/abc',
    },
    parentContext: [{ text: 'Parent says hello.', sourceLabel: 'parent' }],
    recentUserActivity: [{ text: 'Older post: another line', sourceLabel: 'history' }],
    subredditRules: [{ id: '1', title: 'No spam', description: 'Do not post spam links.' }],
    unavailableContext: [],
    ...overrides,
  };
}

const signals: DeterministicSignal[] = [
  {
    id: 'link',
    label: 'Contains URL',
    severity: 'medium',
    matchedText: 'http://spam.example',
    reason: 'Body contains a URL.',
  },
];

describe('validateAnalysis', () => {
  it('exact snippet from reported content passes', () => {
    const raw = {
      summary: 'Spam link.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'http://spam.example',
          source: 'reported_content',
          reason: 'URL in body.',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), signals, raw);
    expect(r.status).toBe('success');
    expect(r.aiAnalysis?.evidence).toHaveLength(1);
  });

  it('exact snippet from parent context passes', () => {
    const raw = {
      summary: 'References parent.',
      possibleRuleMatches: [],
      reviewPriority: 'low',
      suggestedAction: 'approve',
      confidence: 'low',
      evidence: [
        {
          snippet: 'Parent says hello.',
          source: 'parent_context',
          reason: 'Quoted parent.',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), [], raw);
    expect(r.status).toBe('success');
  });

  it('exact snippet from subreddit rule passes', () => {
    const raw = {
      summary: 'Rule match.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'medium',
      suggestedAction: 'escalate',
      confidence: 'medium',
      evidence: [
        {
          snippet: 'Do not post spam links.',
          source: 'subreddit_rule',
          reason: 'Rule text.',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), [], raw);
    expect(r.status).toBe('success');
  });

  it('invented snippet fails as evidence', () => {
    const raw = {
      summary: 'Guess.',
      possibleRuleMatches: [],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'This text never appeared in the bundle.',
          source: 'reported_content',
          reason: 'bad',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), signals, raw);
    expect(r.aiAnalysis?.evidence).toHaveLength(0);
    expect(r.validationWarnings.some((w) => w.includes('unsupported evidence'))).toBe(true);
  });

  it('paraphrased evidence fails as evidence', () => {
    const raw = {
      summary: 'Spam paraphrase.',
      possibleRuleMatches: [],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'free stuff at spam example',
          source: 'reported_content',
          reason: 'paraphrase',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), [], raw);
    expect(r.aiAnalysis?.evidence).toHaveLength(0);
  });

  it('exact matchedText from deterministic signal passes', () => {
    const raw = {
      summary: 'Repeated domain detected.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'medium',
      suggestedAction: 'remove',
      confidence: 'medium',
      evidence: [
        {
          snippet: 'http://spam.example',
          source: 'deterministic_signal',
          reason: 'Signal matched the repeated link text.',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), signals, raw);
    expect(r.status).toBe('success');
    expect(r.aiAnalysis?.evidence).toHaveLength(1);
  });

  it('high priority without valid evidence is downgraded and needs manual review', () => {
    const raw = {
      summary: 'No proof.',
      possibleRuleMatches: [],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'nope not in corpus',
          source: 'reported_content',
          reason: 'x',
        },
      ],
    };
    const r = validateAnalysis(baseContext(), [], raw);
    expect(r.aiAnalysis?.reviewPriority).toBe('medium');
    expect(r.aiAnalysis?.suggestedAction).toBe('needs_manual_review');
    expect(r.validationWarnings.some((w) => w.includes('High review priority'))).toBe(true);
  });
});
