import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(here, '..', 'client', 'components');

function readComponent(name: string): string {
  return readFileSync(join(componentsDir, name), 'utf8');
}

describe('reviewDeskUI', () => {
  it('groups rules and analysis quality under Review details', () => {
    const source = readComponent('DecisionCard.tsx');
    expect(source).toContain('Review details');
    expect(source).toMatch(/CollapsibleSection title="Review details"/);
    expect(source).toContain('Rules considered');
    expect(source).toContain('Analysis quality');
  });

  it('collapses investigation trace by default with subtitle', () => {
    const decisionCard = readComponent('DecisionCard.tsx');
    expect(decisionCard).toContain('What QueueLens checked before producing this brief.');
    expect(decisionCard).toMatch(/CollapsibleSection title="Investigation trace" subtitle=/);
    expect(decisionCard).not.toMatch(/title="Investigation trace"[^>]*defaultOpen=\{true\}/);

    const collapsible = readComponent('CollapsibleSection.tsx');
    expect(collapsible).toContain('<details');
    expect(collapsible).toMatch(/defaultOpen = false/);
  });

  it('collapses context snapshot by default and removes duplicate header metadata', () => {
    const source = readComponent('ContextSnapshotPanel.tsx');
    expect(source).toContain('CollapsibleSection');
    expect(source).not.toContain('context-snapshot-meta');
    expect(source).not.toContain('Open target on Reddit');
  });

  it('collapses deterministic signals by default', () => {
    const source = readComponent('SignalList.tsx');
    expect(source).toContain('CollapsibleSection');
    expect(source).toContain('Deterministic signals');
  });

  it('caps caution reasons at three by default with show more toggle', () => {
    const source = readComponent('ModerationGuidance.tsx');
    expect(source).toContain('CAUTION_VISIBLE_DEFAULT = 3');
    expect(source).toContain('Show more');
    expect(source).toContain('Show less');
    expect(source).toMatch(/slice\(0,\s*CAUTION_VISIBLE_DEFAULT\)/);
  });

  it('uses subsection styling for evidence instead of nested panel cards', () => {
    const source = readComponent('EvidencePanel.tsx');
    expect(source).toContain('subsection evidence-panel');
    expect(source).not.toMatch(/className="panel evidence-panel"/);
  });
});
