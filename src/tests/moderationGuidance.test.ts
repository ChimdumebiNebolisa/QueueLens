import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContextBundle, ValidatedAnalysisResult } from '../shared/queueLensDomain.js';
import {
  containsEmDash,
  containsTypographicDash,
  deriveCautionReasons,
  deriveSuggestedModeratorNote,
  looksLikeSyntheticOrTestContent,
  MODERATION_GUIDANCE_UI_LABELS,
} from '../shared/moderationGuidance.js';
import { executeQueueLensOnBundle } from '../server/analysis/quickValidate.js';
const here = dirname(fileURLToPath(import.meta.url));

const FIXTURE_NAMES = [
  'ambiguous-report.json',
  'clear-rule-violation.json',
  'clean-post.json',
  'fake-personal-info.json',
  'spam-bare-domain.json',
  'spam-comment.json',
] as const;

const KEY_USER_FACING_STRINGS = [
  ...Object.values(MODERATION_GUIDANCE_UI_LABELS),
  'QueueLens finished with warnings.',
  'Heuristic flags only, not proof of a violation.',
  'Advisory text only. Copying or reading this note does not change Reddit.',
  'Review assistance only. Final decision stays with the moderator.',
  'No validated exact-match evidence snippets for this run.',
  'Evidence (exact snippets)',
  'Gathering context and running analysis…',
  'Final moderation decisions remain with you. QueueLens does not remove, ban, message users, or change Reddit state.',
  'Before you act',
  'Technical details',
  'Why QueueLens flagged this',
  'Show more',
  'Show less',
];

function loadFixture(name: string): ContextBundle {
  const p = join(here, 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8')) as ContextBundle;
}

function partialAmbiguousResult(): ValidatedAnalysisResult {
  const bundle = loadFixture('ambiguous-report.json');
  return executeQueueLensOnBundle(bundle, {
    summary: 'Unclear civility concern; needs human judgment.',
    possibleRuleMatches: ['Be civil'],
    reviewPriority: 'medium',
    suggestedAction: 'needs_manual_review',
    confidence: 'medium',
    evidence: [
      {
        snippet: 'not sure why it was reported',
        source: 'reported_content',
        reason: 'Author expresses uncertainty about the report.',
      },
    ],
  });
}

describe('moderationGuidance', () => {
  it('shows caution reasons for ambiguous civility with partial context', () => {
    const result = partialAmbiguousResult();
    const reasons = deriveCautionReasons(result);

    expect(reasons.some((r) => r.includes('No automatic moderation action'))).toBe(true);
    expect(reasons.some((r) => r.includes('Confidence is not high'))).toBe(true);
    expect(reasons.some((r) => r.includes('manual review'))).toBe(true);
    expect(reasons.some((r) => r.includes('context was unavailable'))).toBe(true);
    expect(reasons.some((r) => r.includes('ambiguous'))).toBe(true);
  });

  it('shows caution reasons for bare-domain spam with demo rules', () => {
    const bundle = loadFixture('spam-bare-domain.json');
    const result = executeQueueLensOnBundle(bundle, {
      summary: 'Repeated bare domain promotion.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'cheap-free-coins.example',
          source: 'reported_content',
          reason: 'Domain repeated in reported content.',
        },
      ],
    });
    const reasons = deriveCautionReasons(result);

    expect(reasons.some((r) => r.includes('No automatic moderation action'))).toBe(true);
    expect(reasons.some((r) => r.includes('demo fallback'))).toBe(true);
    expect(reasons.some((r) => r.includes('Confidence is not high'))).toBe(false);
  });

  it('shows caution reasons for personal-info fixture with synthetic markers', () => {
    const bundle = loadFixture('fake-personal-info.json');
    const result = executeQueueLensOnBundle(bundle, {
      summary: 'Possible personal information in test content.',
      possibleRuleMatches: ['No personal information'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: '[redacted-email]',
          source: 'reported_content',
          reason: 'Redacted email token in body.',
        },
      ],
    });

    expect(looksLikeSyntheticOrTestContent(result)).toBe(true);
    const reasons = deriveCautionReasons(result);
    expect(reasons.some((r) => r.includes('synthetic or test data'))).toBe(true);
    expect(reasons.some((r) => r.includes('context was unavailable'))).toBe(true);
  });

  it('adds partial-run caution when validation warnings exist', () => {
    const bundle = loadFixture('fake-personal-info.json');
    const result = executeQueueLensOnBundle(bundle, {
      summary: 'PII concern.',
      possibleRuleMatches: ['No personal information'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'not in bundle',
          source: 'reported_content',
          reason: 'Hallucinated snippet should be stripped.',
        },
      ],
    });

    expect(result.status).toBe('partial');
    const reasons = deriveCautionReasons(result);
    expect(reasons.some((r) => r.includes('partial or had validation warnings'))).toBe(true);
    expect(reasons.some((r) => r.includes('Evidence is limited'))).toBe(true);
  });

  it('renders a suggested moderator note in plain English', () => {
    const result = partialAmbiguousResult();
    const note = deriveSuggestedModeratorNote(result);

    expect(note.toLowerCase()).toContain('closer look');
    expect(note).toContain('Rules that may apply');
    expect(containsEmDash(note)).toBe(false);
  });

  it('prefers AI moderatorNoteDraft when present', () => {
    const result = partialAmbiguousResult();
    result.aiAnalysis = {
      ...result.aiAnalysis!,
      moderatorNoteDraft: 'Please review thread tone before acting.',
    };
    expect(deriveSuggestedModeratorNote(result)).toBe('Please review thread tone before acting.');
  });

  it('does not import Reddit or server action modules', async () => {
    const guidanceSource = readFileSync(join(here, '..', 'shared', 'moderationGuidance.ts'), 'utf8');
    const componentSource = readFileSync(
      join(here, '..', 'client', 'components', 'ModeratorNotePanel.tsx'),
      'utf8',
    );

    expect(guidanceSource).not.toMatch(/from ['"]@?devvit|from ['"].*reddit|submitCustomPost|removePost|banUser/i);
    expect(componentSource).not.toMatch(/from ['"]@?devvit|from ['"].*reddit|submitCustomPost|removePost|banUser/i);
  });

  it('keeps key user-facing strings free of typographic dashes', () => {
    for (const text of KEY_USER_FACING_STRINGS) {
      expect(containsTypographicDash(text)).toBe(false);
    }
  });

  it('keeps test fixtures free of typographic dashes', () => {
    for (const name of FIXTURE_NAMES) {
      const raw = readFileSync(join(here, 'fixtures', name), 'utf8');
      expect(containsTypographicDash(raw), name).toBe(false);
    }
  });

  it('keeps derived moderator notes free of typographic dashes across fixtures', () => {
    const cases: Array<{ fixture: string; result: ValidatedAnalysisResult }> = [
      {
        fixture: 'clear-rule-violation.json',
        result: executeQueueLensOnBundle(loadFixture('clear-rule-violation.json'), {
          summary: 'Personal attack language in reported comment.',
          possibleRuleMatches: ['Be civil'],
          reviewPriority: 'high',
          suggestedAction: 'remove',
          confidence: 'high',
          evidence: [
            {
              snippet: 'You are an idiot',
              source: 'reported_content',
              reason: 'Direct insult in reported content.',
            },
          ],
        }),
      },
      {
        fixture: 'clean-post.json',
        result: executeQueueLensOnBundle(loadFixture('clean-post.json'), {
          summary: 'No clear rule breach in benign test post.',
          possibleRuleMatches: [],
          reviewPriority: 'low',
          suggestedAction: 'approve',
          confidence: 'medium',
          evidence: [],
        }),
      },
    ];

    for (const { fixture, result } of cases) {
      const note = deriveSuggestedModeratorNote(result);
      expect(containsTypographicDash(note), fixture).toBe(false);
      for (const reason of deriveCautionReasons(result)) {
        expect(containsTypographicDash(reason), `${fixture} caution`).toBe(false);
      }
    }
  });

  it('scans client review UI sources for typographic dashes in string literals', () => {
    const clientComponents = [
      join(here, '..', 'client', 'components', 'StatePanel.tsx'),
      join(here, '..', 'client', 'components', 'DecisionCard.tsx'),
      join(here, '..', 'client', 'components', 'SummaryCard.tsx'),
      join(here, '..', 'client', 'components', 'GroupedEvidencePanel.tsx'),
      join(here, '..', 'client', 'components', 'TechnicalDetailsPanel.tsx'),
      join(here, '..', 'shared', 'moderationGuidance.ts'),
      join(here, '..', 'shared', 'reviewBrief.ts'),
    ];

    const literalPattern = /(['"`])(?:(?!\1).)*[\u2013\u2014](?:(?!\1).)*\1/g;
    for (const filePath of clientComponents) {
      const source = readFileSync(filePath, 'utf8');
      const matches = source.match(literalPattern) ?? [];
      expect(matches, filePath).toEqual([]);
    }
  });
});
