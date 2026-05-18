import { describe, expect, it } from 'vitest';
import { aiAnalysisSchema, parseAIAnalysisJson } from '../server/analysis/aiSchema.js';

describe('aiSchema', () => {
  const valid = {
    summary: 'User posted promotional link.',
    possibleRuleMatches: ['No spam'],
    reviewPriority: 'high' as const,
    suggestedAction: 'remove' as const,
    confidence: 'medium' as const,
    evidence: [
      {
        snippet: 'http://spam.example',
        source: 'reported_content' as const,
        reason: 'URL appears in reported content.',
      },
    ],
  };

  it('valid AI JSON passes', () => {
    expect(aiAnalysisSchema.safeParse(valid).success).toBe(true);
    expect(parseAIAnalysisJson(valid).ok).toBe(true);
  });

  it('missing required field fails', () => {
    const { summary: _s, ...rest } = valid;
    const r = parseAIAnalysisJson(rest);
    expect(r.ok).toBe(false);
  });

  it('invalid enum fails', () => {
    const r = parseAIAnalysisJson({ ...valid, reviewPriority: 'critical' });
    expect(r.ok).toBe(false);
  });

  it('malformed input fails safely', () => {
    expect(parseAIAnalysisJson(null).ok).toBe(false);
    expect(parseAIAnalysisJson('not-json').ok).toBe(false);
  });
});
