import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContextBundle } from '../../shared/queueLensDomain.js';
import { executeQueueLensOnBundle } from '../../server/analysis/quickValidate.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): ContextBundle {
  const p = join(here, '..', 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8')) as ContextBundle;
}

describe('analysisFlow integration', () => {
  it('runs deterministic + validation on fixture AI output', () => {
    const bundle = loadFixture('spam-comment.json');
    const rawAi = {
      summary: 'Multiple spam links.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'https://spam.example',
          source: 'reported_content',
          reason: 'URL appears verbatim.',
        },
      ],
    };
    const result = executeQueueLensOnBundle(bundle, rawAi);
    expect(result.deterministicSignals.length).toBeGreaterThan(0);
    expect(result.aiAnalysis?.evidence.length).toBeGreaterThan(0);
    expect(result.status === 'success' || result.status === 'partial').toBe(true);
  });
});
