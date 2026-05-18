import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextBundle, DeterministicSignal } from '../shared/queueLensDomain.js';

const mocks = vi.hoisted(() => ({
  gatherRedditContext: vi.fn(),
  extractDeterministicSignals: vi.fn(),
  runOpenAIAnalysis: vi.fn(),
}));

vi.mock('../server/reddit/redditContext.js', () => ({
  gatherRedditContext: mocks.gatherRedditContext,
}));

vi.mock('../server/analysis/deterministicSignals.js', () => ({
  extractDeterministicSignals: mocks.extractDeterministicSignals,
}));

vi.mock('../server/analysis/aiAnalysis.js', () => ({
  runOpenAIAnalysis: mocks.runOpenAIAnalysis,
}));

let executeQueueLensPipeline: typeof import('../server/analysis/pipeline.js').executeQueueLensPipeline;

beforeAll(async () => {
  ({ executeQueueLensPipeline } = await import('../server/analysis/pipeline.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

const bundle: ContextBundle = {
  target: {
    id: 't3_demo',
    type: 'post',
    subredditName: 'demo',
    authorName: 'alice',
    title: 'Check this deal',
    bodyText: 'Visit cheap-free-coins.example for free stuff.',
  },
  parentContext: [],
  recentUserActivity: [],
  subredditRules: [{ id: '1', title: 'No spam', description: 'Do not post spam links.' }],
  ruleSource: 'demo_fallback',
  unavailableContext: [],
};

const deterministicSignals: DeterministicSignal[] = [
  {
    id: 'repeated_domain',
    label: 'Same domain repeated in reported content',
    severity: 'high',
    matchedText: 'cheap-free-coins.example',
    reason: 'Same link/domain appears multiple times in the reported content.',
  },
];

describe('executeQueueLensPipeline', () => {
  it('uses deterministic fallback evidence when AI analysis has no evidence', async () => {
    mocks.gatherRedditContext.mockResolvedValue(bundle);
    mocks.extractDeterministicSignals.mockReturnValue(deterministicSignals);
    mocks.runOpenAIAnalysis.mockResolvedValue({
      raw: {},
      parsed: {
        summary: 'Likely spam.',
        possibleRuleMatches: ['No spam'],
        reviewPriority: 'medium',
        suggestedAction: 'needs_manual_review',
        confidence: 'medium',
        evidence: [],
      },
    });

    const result = await executeQueueLensPipeline({
      targetType: 'post',
      targetId: 't3_demo',
      subredditName: 'demo',
    });

    expect(result.evidenceFallbackUsed).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.aiAnalysis?.evidence).toEqual([
      {
        snippet: 'cheap-free-coins.example',
        source: 'deterministic_signal',
        reason: 'Same link/domain appears multiple times in the reported content.',
      },
    ]);
  });

  it('preserves validated AI evidence without fallback when evidence already exists', async () => {
    mocks.gatherRedditContext.mockResolvedValue(bundle);
    mocks.extractDeterministicSignals.mockReturnValue(deterministicSignals);
    mocks.runOpenAIAnalysis.mockResolvedValue({
      raw: {},
      parsed: {
        summary: 'Likely spam.',
        possibleRuleMatches: ['No spam'],
        reviewPriority: 'medium',
        suggestedAction: 'remove',
        confidence: 'medium',
        evidence: [
          {
            snippet: 'cheap-free-coins.example',
            source: 'reported_content',
            reason: 'Domain appears in the reported content.',
          },
        ],
      },
    });

    const result = await executeQueueLensPipeline({
      targetType: 'post',
      targetId: 't3_demo',
      subredditName: 'demo',
    });

    expect(result.evidenceFallbackUsed).toBe(false);
    expect(result.aiAnalysis?.evidence[0]?.source).toBe('reported_content');
  });
});
