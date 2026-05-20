import type { ValidatedAnalysisResult } from './queueLensDomain.js';
import { deriveDetailedModeratorNote } from './reviewBrief.js';

/** User-facing strings must not contain U+2013 en dashes or U+2014 em dashes. */
export const EN_DASH = '\u2013';
export const EM_DASH = '\u2014';

export function containsTypographicDash(text: string): boolean {
  return text.includes(EN_DASH) || text.includes(EM_DASH);
}

/** @deprecated Prefer containsTypographicDash; kept for existing tests. */
export function containsEmDash(text: string): boolean {
  return containsTypographicDash(text);
}

function reportedText(result: ValidatedAnalysisResult): string {
  const t = result.contextBundle.target;
  return [t.title, t.bodyText].filter(Boolean).join(' ').toLowerCase();
}

export function looksLikeSyntheticOrTestContent(result: ValidatedAnalysisResult): boolean {
  const text = reportedText(result);
  return (
    text.includes('[queuelens e2e]') ||
    text.includes('fake test data') ||
    text.includes('[redacted-email]') ||
    text.includes('[redacted-phone]') ||
    result.contextBundle.target.authorName?.toLowerCase() === 'tester'
  );
}

export function looksLikeAmbiguousCivility(result: ValidatedAnalysisResult): boolean {
  const ai = result.aiAnalysis;
  if (!ai) return false;
  const body = result.contextBundle.target.bodyText.toLowerCase();
  const report = result.contextBundle.target.reportReason?.toLowerCase() ?? '';
  return (
    ai.suggestedAction === 'needs_manual_review' &&
    (ai.confidence !== 'high' ||
      report.includes('custom') ||
      body.includes('not sure') ||
      body.includes('annoying') ||
      body.includes('unhelpful'))
  );
}

/**
 * Advisory caution factors for moderators. Always includes the no-auto-action note.
 */
export function deriveCautionReasons(result: ValidatedAnalysisResult): string[] {
  const reasons: string[] = [
    'No automatic moderation action was taken; confirm on Reddit before removing, approving, or messaging.',
  ];
  const ai = result.aiAnalysis;

  if (result.status === 'partial' || result.validationWarnings.length > 0) {
    reasons.push('This run is partial or had validation warnings; treat the summary as advisory only.');
  }

  if (result.evidenceFallbackUsed || !ai?.evidence.length) {
    reasons.push('Evidence is limited or used a deterministic fallback; verify snippets in raw context.');
  } else if (ai.evidence.length === 1) {
    reasons.push('Only one validated evidence snippet is available.');
  }

  if (!ai || ai.confidence !== 'high') {
    reasons.push('Confidence is not high; a human should confirm before acting.');
  }

  if (
    ai &&
    (ai.suggestedAction === 'needs_manual_review' || ai.suggestedAction === 'escalate')
  ) {
    reasons.push('Suggested action is manual review or escalation, not a quick approve or remove.');
  }

  if (looksLikeAmbiguousCivility(result)) {
    reasons.push('Civility or rule fit looks ambiguous; weigh community norms and prior warnings.');
  }

  if (result.contextBundle.unavailableContext.length > 0) {
    reasons.push('Some thread or history context was unavailable; conclusions may be incomplete.');
  }

  if (result.contextBundle.ruleSource === 'demo_fallback') {
    reasons.push('Subreddit rules came from demo fallback rules, not live subreddit rules.');
  }

  if (looksLikeSyntheticOrTestContent(result)) {
    reasons.push('Content looks like synthetic or test data; validate in a real moderation context.');
  }

  return reasons;
}

/**
 * Plain-English moderator note for display or copy. Never triggers Reddit APIs.
 */
export function deriveSuggestedModeratorNote(result: ValidatedAnalysisResult): string {
  return deriveDetailedModeratorNote(result);
}

/** Key UI copy used in the review card (guarded against em dashes in tests). */
export const MODERATION_GUIDANCE_UI_LABELS = {
  cautionHeading: 'Before you act',
  moderatorNoteHeading: 'Suggested moderator note',
  copyButton: 'Copy note',
  copiedButton: 'Copied',
} as const;
