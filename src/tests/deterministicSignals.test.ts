import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContextBundle } from '../shared/queueLensDomain.js';
import { extractDeterministicSignals } from '../server/analysis/deterministicSignals.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): ContextBundle {
  const p = join(here, 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8')) as ContextBundle;
}

describe('extractDeterministicSignals', () => {
  it('keyword/rule match produces expected signal', () => {
    const bundle = loadFixture('clear-rule-violation.json');
    const sigs = extractDeterministicSignals(bundle);
    expect(sigs.some((s) => s.id.startsWith('rule_title'))).toBe(true);
  });

  it('repeated link signal works with fixture', () => {
    const bundle = loadFixture('spam-comment.json');
    const sigs = extractDeterministicSignals(bundle);
    const repeated = sigs.find((s) => s.id === 'repeated_domain');
    expect(repeated).toBeDefined();
    expect(repeated?.matchedText).toBe('spam.example');
    expect(repeated?.reason).toContain('Same link/domain appears multiple times');
  });

  it('unavailable context creates unavailable note signal', () => {
    const bundle = loadFixture('ambiguous-report.json');
    const sigs = extractDeterministicSignals(bundle);
    expect(sigs.some((s) => s.id === 'missing_context')).toBe(true);
  });
});
