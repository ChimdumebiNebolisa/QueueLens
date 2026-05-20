import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContextBundle } from '../shared/queueLensDomain.js';
import { containsTypographicDash } from '../shared/moderationGuidance.js';
import {
  deriveBriefHeadline,
  deriveConcerns,
  deriveShortModeratorNote,
  groupEvidenceByConcern,
  REVIEW_BRIEF_UI,
  translateValidationWarning,
} from '../shared/reviewBrief.js';
import { executeQueueLensOnBundle } from '../server/analysis/quickValidate.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): ContextBundle {
  return JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8')) as ContextBundle;
}

describe('reviewBrief', () => {
  it('derives promo and PII concerns from spam and fake PII fixtures', () => {
    const spamBundle = loadFixture('spam-bare-domain.json');
    const spamResult = executeQueueLensOnBundle(spamBundle, {
      summary: 'Repeated promo domain in comment.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [
        {
          snippet: 'cheap-free-coins.example',
          source: 'reported_content',
          reason: 'Repeated domain in comment body.',
        },
      ],
    });

    const spamConcerns = deriveConcerns(spamResult);
    expect(spamConcerns.some((c) => c.id === 'repeated_promo')).toBe(true);

    const piiBundle = loadFixture('fake-personal-info.json');
    const piiResult = executeQueueLensOnBundle(piiBundle, {
      summary: 'Possible personal info in post.',
      possibleRuleMatches: ['No personal information'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'medium',
      evidence: [
        {
          snippet: '[redacted-email]',
          source: 'reported_content',
          reason: 'Redacted email token in body.',
        },
      ],
    });

    const piiConcerns = deriveConcerns(piiResult);
    expect(piiConcerns.some((c) => c.id === 'private_contact')).toBe(true);

    const grouped = groupEvidenceByConcern(piiResult);
    const privateGroup = grouped.find((g) => g.concernId === 'private_contact');
    expect(privateGroup?.items.some((e) => e.snippet.includes('[redacted-email]'))).toBe(true);
  });

  it('builds a plain headline from concerns', () => {
    const bundle = loadFixture('fake-personal-info.json');
    const result = executeQueueLensOnBundle(bundle, {
      summary: 'Post may include personal info.',
      possibleRuleMatches: ['No personal information'],
      reviewPriority: 'medium',
      suggestedAction: 'needs_manual_review',
      confidence: 'medium',
      evidence: [],
    });
    const headline = deriveBriefHeadline(result);
    expect(headline.toLowerCase()).toContain('looks like');
    expect(headline).not.toContain('deterministic');
  });

  it('translates technical validation warnings', () => {
    expect(translateValidationWarning('Removed unsupported evidence snippet for source "reported_content".')).toBe(
      'Some AI evidence could not be verified and was left out.',
    );
  });

  it('keeps short moderator notes readable', () => {
    const bundle = loadFixture('spam-bare-domain.json');
    const result = executeQueueLensOnBundle(bundle, {
      summary: 'Spam links in comment.',
      possibleRuleMatches: ['No spam'],
      reviewPriority: 'high',
      suggestedAction: 'remove',
      confidence: 'high',
      evidence: [{ snippet: 'cheap-free-coins.example', source: 'reported_content', reason: 'Promo domain.' }],
    });
    const note = deriveShortModeratorNote(result);
    expect(note.length).toBeLessThan(400);
    expect(note.toLowerCase()).not.toContain('validated evidence');
  });

  it('keeps review brief UI strings free of typographic dashes', () => {
    for (const text of Object.values(REVIEW_BRIEF_UI)) {
      expect(containsTypographicDash(text)).toBe(false);
    }
  });
});
