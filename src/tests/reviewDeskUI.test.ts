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
  it('uses moderator brief sections in DecisionCard', () => {
    const source = readComponent('DecisionCard.tsx');
    expect(source).toContain('SummaryCard');
    expect(source).toContain('FlaggedConcernsPanel');
    expect(source).toContain('GroupedEvidencePanel');
    expect(source).toContain('RulesPanel');
    expect(source).toContain('ModeratorNotePanel');
    expect(source).toContain('BeforeYouActPanel');
    expect(source).toContain('TechnicalDetailsPanel');
    expect(source).not.toContain('Review brief');
    expect(source).not.toContain('Investigation trace');
  });

  it('collapses technical details by default', () => {
    const source = readComponent('TechnicalDetailsPanel.tsx');
    expect(source).toContain('technicalDetailsHeading');
    expect(source).toMatch(/CollapsibleSection title=\{REVIEW_BRIEF_UI\.technicalDetailsHeading\}/);
    expect(source).toContain('RawContextDrawer');
    expect(source).toContain('InvestigationTracePanel');
  });

  it('groups evidence by concern', () => {
    const source = readComponent('GroupedEvidencePanel.tsx');
    expect(source).toContain('groupEvidenceByConcern');
    expect(source).toContain('evidence-group');
  });

  it('shows matched rules first with other rules collapsed', () => {
    const source = readComponent('RulesPanel.tsx');
    expect(source).toContain('getMatchedRules');
    expect(source).toContain('otherRulesHeading');
  });

  it('provides short and detailed moderator notes', () => {
    const source = readComponent('ModeratorNotePanel.tsx');
    expect(source).toContain('deriveShortModeratorNote');
    expect(source).toContain('deriveDetailedModeratorNote');
    expect(source).toContain('detailedNoteToggle');
  });

  it('uses before you act instead of reasons to be cautious in the panel', () => {
    const source = readComponent('BeforeYouActPanel.tsx');
    expect(source).toContain('deriveBeforeYouActNotes');
    expect(source).toContain('beforeYouActHeading');
  });

  it('keeps App shell focused on DecisionCard without separate signal panels', () => {
    const app = readFileSync(join(here, '..', 'client', 'App.tsx'), 'utf8');
    expect(app).not.toContain('ContextSnapshotPanel');
    expect(app).not.toContain('SignalList');
    expect(app).not.toContain('RawContextDrawer');
  });
});
