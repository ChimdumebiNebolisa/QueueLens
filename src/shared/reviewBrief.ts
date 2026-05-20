import type {
  AIAnalysis,
  DeterministicSignal,
  EvidenceItem,
  SubredditRule,
  ValidatedAnalysisResult,
} from './queueLensDomain.js';
import {
  looksLikeAmbiguousCivility,
  looksLikeSyntheticOrTestContent,
} from './moderationGuidance.js';

export const REVIEW_BRIEF_UI = {
  whyFlaggedHeading: 'Why QueueLens flagged this',
  evidenceHeading: 'Evidence',
  rulesHeading: 'Rules that may apply',
  otherRulesHeading: 'Other rules QueueLens checked',
  moderatorNoteHeading: 'Suggested moderator note',
  detailedNoteToggle: 'Detailed note',
  shortNoteToggle: 'Short note',
  beforeYouActHeading: 'Before you act',
  technicalDetailsHeading: 'Technical details',
  advisoryLine:
    'You make the final call. QueueLens did not remove, ban, message, or change anything on Reddit.',
  noVerifiedSnippet:
    'QueueLens flagged this based on checks, but no exact snippet was verified. See Technical details.',
  ungroupedEvidenceLabel: 'Other snippets from the post',
  partialPhaseTitle: 'QueueLens found a partial result.',
  partialBanner:
    'The summary is still usable, but some technical checks had warnings. More detail is in Before you act and Technical details.',
  rudeLanguageNoSnippet:
    'QueueLens flagged this for review, but no exact snippet was verified.',
  noAiHeadline: 'QueueLens could not produce a full summary',
  copyButton: 'Copy note',
  copiedButton: 'Copied',
  noteHelper: 'Advisory text only. Copying this note does not change Reddit.',
  evidenceFallbackNote: 'Some evidence came from backup checks, not the AI.',
  noEvidence: 'No exact-match evidence snippets were verified for this run.',
} as const;

export type ReviewConcernId =
  | 'repeated_promo'
  | 'private_contact'
  | 'rude_language'
  | 'spam_links'
  | 'reported'
  | 'other';

export type ReviewConcern = {
  id: ReviewConcernId;
  label: string;
  shortWhy: string;
  certainty?: 'typical' | 'needs_review';
};

export type GroupedEvidence = {
  concernId: ReviewConcernId | 'ungrouped';
  label: string;
  items: EvidenceItem[];
};

const SIGNAL_CONCERN_MAP: Record<string, ReviewConcernId> = {
  repeated_url: 'repeated_promo',
  repeated_domain: 'repeated_promo',
  possible_pii_email: 'private_contact',
  possible_pii_phone: 'private_contact',
  report_reason: 'reported',
  multi_links: 'spam_links',
};

const CONCERN_DEFAULTS: Record<ReviewConcernId, { label: string; shortWhy: string }> = {
  repeated_promo: {
    label: 'Repeated promotional link',
    shortWhy: 'The same promo link or domain shows up more than once.',
  },
  private_contact: {
    label: 'Possible private contact info',
    shortWhy: 'Contact details may have been shared and were redacted before analysis.',
  },
  rude_language: {
    label: 'Possible rude language',
    shortWhy: 'Some wording may be rude or insulting.',
  },
  spam_links: {
    label: 'Multiple outbound links',
    shortWhy: 'The post or comment includes several links.',
  },
  reported: {
    label: 'User report on this item',
    shortWhy: 'Reddit report info was available for this target.',
  },
  other: {
    label: 'Other concern',
    shortWhy: 'QueueLens saw another pattern worth checking.',
  },
};

const RUDE_PATTERNS = [
  /\byou are an idiot\b/i,
  /\bidiot\b/i,
  /\bshut up\b/i,
  /\bstupid\b/i,
  /\bdumb\b/i,
];

const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;

function reportedText(result: ValidatedAnalysisResult): string {
  const t = result.contextBundle.target;
  return [t.title, t.bodyText].filter(Boolean).join('\n');
}

function concernFromRuleTitle(title: string): ReviewConcernId | null {
  const lower = title.toLowerCase();
  if (/spam|promo|advert|link|self.?promo/.test(lower)) return 'repeated_promo';
  if (/personal|private|info|pii|contact|dox/.test(lower)) return 'private_contact';
  if (/civil|harass|respect|be nice|attack/.test(lower)) return 'rude_language';
  return null;
}

function buildConcern(id: ReviewConcernId, overrides?: Partial<Pick<ReviewConcern, 'label' | 'shortWhy'>>): ReviewConcern {
  const base = CONCERN_DEFAULTS[id];
  return {
    id,
    label: overrides?.label ?? base.label,
    shortWhy: overrides?.shortWhy ?? base.shortWhy,
  };
}

export function humanizePriority(priority: AIAnalysis['reviewPriority']): string {
  const map: Record<AIAnalysis['reviewPriority'], string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return map[priority];
}

export function humanizeConfidence(confidence: AIAnalysis['confidence']): string {
  const map: Record<AIAnalysis['confidence'], string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return map[confidence];
}

export function humanizeSuggestedAction(action: AIAnalysis['suggestedAction']): string {
  const map: Record<AIAnalysis['suggestedAction'], string> = {
    approve: 'Looks okay to approve',
    remove: 'Review for removal',
    escalate: 'Escalate to another mod',
    needs_manual_review: 'Needs a closer look',
  };
  return map[action];
}

export function humanizeSummaryParagraph(summary: string): string {
  let text = summary.trim();
  if (!text) return text;
  text = text.replace(/^The (post|comment) contains/i, 'This $1 may include');
  text = text.replace(/^The (post|comment) includes/i, 'This $1 may include');
  text = text.replace(/^This (post|comment) contains/i, 'This $1 may include');
  if (!/^this /i.test(text)) {
    text = `This item may involve the following: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }
  return text;
}

/** Evidence rows safe to show under the main brief (no subreddit rule quotes). */
export function filterEvidenceForBrief(
  items: EvidenceItem[],
  result: ValidatedAnalysisResult,
): EvidenceItem[] {
  const titles = new Set(
    result.contextBundle.subredditRules.map((r) => r.title.trim().toLowerCase()).filter(Boolean),
  );
  return items.filter((item) => {
    if (item.source === 'subreddit_rule') return false;
    const sn = item.snippet.trim();
    if (sn && titles.has(sn.toLowerCase())) return false;
    if (/rule\s+against/i.test(item.reason)) return false;
    return true;
  });
}

function getBriefEvidenceItemsFromConcerns(
  result: ValidatedAnalysisResult,
  _concerns: ReviewConcern[],
): EvidenceItem[] {
  return filterEvidenceForBrief(result.aiAnalysis?.evidence ?? [], result);
}

export function deriveConcerns(result: ValidatedAnalysisResult): ReviewConcern[] {
  const byId = new Map<ReviewConcernId, ReviewConcern>();
  const ai = result.aiAnalysis;

  for (const signal of result.deterministicSignals) {
    const mapped = SIGNAL_CONCERN_MAP[signal.id];
    if (mapped) {
      const overrides = mapped === 'private_contact' ? {} : { label: plainSignalLabel(signal) };
      byId.set(mapped, buildConcern(mapped, overrides));
    }
  }

  if (ai) {
    for (const ruleTitle of ai.possibleRuleMatches) {
      const fromRule = concernFromRuleTitle(ruleTitle);
      const id = fromRule ?? 'other';
      if (!byId.has(id)) {
        byId.set(id, buildConcern(id, { label: ruleTitle, shortWhy: `May relate to rule: ${ruleTitle}.` }));
      }
    }
  }

  const body = reportedText(result).toLowerCase();
  if (RUDE_PATTERNS.some((p) => p.test(body)) && !byId.has('rude_language')) {
    byId.set('rude_language', buildConcern('rude_language'));
  }

  const urls = reportedText(result).match(URL_RE) ?? [];
  if (urls.length >= 2 && !byId.has('spam_links') && !byId.has('repeated_promo')) {
    byId.set('spam_links', buildConcern('spam_links'));
  }

  if (result.contextBundle.target.reportReason && !byId.has('reported')) {
    byId.set('reported', buildConcern('reported'));
  }

  const ordered: ReviewConcernId[] = [
    'repeated_promo',
    'private_contact',
    'rude_language',
    'spam_links',
    'reported',
    'other',
  ];
  let list = ordered.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  list = list.slice(0, 4);

  const briefItems = getBriefEvidenceItemsFromConcerns(result, list);
  const rudeConcernIndex = list.findIndex((c) => c.id === 'rude_language');
  if (rudeConcernIndex >= 0) {
    const hasRudeEvidence = briefItems.some(
      (item) => evidenceConcernId(item, result, list) === 'rude_language',
    );
    if (!hasRudeEvidence) {
      const prev = list[rudeConcernIndex]!;
      list[rudeConcernIndex] = {
        ...prev,
        shortWhy: REVIEW_BRIEF_UI.rudeLanguageNoSnippet,
        certainty: 'needs_review',
      };
    }
  }

  return list;
}

function plainSignalLabel(signal: DeterministicSignal): string {
  if (signal.id === 'repeated_url' || signal.id === 'repeated_domain') {
    return 'Repeated promotional link';
  }
  if (signal.id === 'possible_pii_email') return 'Possible email address';
  if (signal.id === 'possible_pii_phone') return 'Possible phone number';
  if (signal.id === 'report_reason') return 'User report on this item';
  if (signal.id === 'multi_links') return 'Multiple outbound links';
  return signal.label.replace(/deterministic/gi, '').replace(/reported content/gi, 'this item').trim();
}

function signalConcernForEvidence(
  item: EvidenceItem,
  signals: DeterministicSignal[],
): ReviewConcernId | null {
  if (item.source !== 'deterministic_signal') return null;
  for (const signal of signals) {
    if (signal.matchedText && item.snippet.includes(signal.matchedText)) {
      return SIGNAL_CONCERN_MAP[signal.id] ?? null;
    }
  }
  return null;
}

function evidenceConcernId(
  item: EvidenceItem,
  result: ValidatedAnalysisResult,
  concerns: ReviewConcern[],
): ReviewConcernId | 'ungrouped' {
  if (item.snippet.includes('[redacted-email]') || item.snippet.includes('[redacted-phone]')) {
    return 'private_contact';
  }

  const fromSignal = signalConcernForEvidence(item, result.deterministicSignals);
  if (fromSignal) return fromSignal;

  const ai = result.aiAnalysis;
  if (ai) {
    for (const ruleTitle of ai.possibleRuleMatches) {
      if (item.reason.toLowerCase().includes(ruleTitle.toLowerCase()) || item.snippet.includes(ruleTitle)) {
        return concernFromRuleTitle(ruleTitle) ?? 'other';
      }
    }
  }

  const lowerSnippet = item.snippet.toLowerCase();
  for (const concern of concerns) {
    if (concern.id === 'repeated_promo' && /\.[a-z]{2,}/i.test(item.snippet)) {
      const domains = reportedText(result).toLowerCase();
      if (domains.includes(lowerSnippet.replace(/^https?:\/\//, ''))) {
        return 'repeated_promo';
      }
    }
  }

  if (RUDE_PATTERNS.some((p) => p.test(item.snippet))) {
    return 'rude_language';
  }

  return 'ungrouped';
}

export function groupEvidenceByConcern(result: ValidatedAnalysisResult): GroupedEvidence[] {
  const concerns = deriveConcerns(result);
  const ai = result.aiAnalysis;
  const items = filterEvidenceForBrief(ai?.evidence ?? [], result);
  const buckets = new Map<ReviewConcernId | 'ungrouped', EvidenceItem[]>();

  for (const item of items) {
    const id = evidenceConcernId(item, result, concerns);
    const list = buckets.get(id) ?? [];
    list.push(item);
    buckets.set(id, list);
  }

  const groups: GroupedEvidence[] = [];
  for (const concern of concerns) {
    groups.push({
      concernId: concern.id,
      label: concern.label,
      items: buckets.get(concern.id) ?? [],
    });
  }

  const ungrouped = buckets.get('ungrouped') ?? [];
  if (ungrouped.length > 0) {
    groups.push({
      concernId: 'ungrouped',
      label: REVIEW_BRIEF_UI.ungroupedEvidenceLabel,
      items: ungrouped,
    });
  }

  return groups;
}

function joinMayFragments(fragments: string[]): string {
  if (fragments.length === 1) return fragments[0]!;
  if (fragments.length === 2) return `${fragments[0]} and ${fragments[1]}`;
  const last = fragments[fragments.length - 1]!;
  return `${fragments.slice(0, -1).join(', ')}, and ${last}`;
}

export function deriveBriefHeadline(result: ValidatedAnalysisResult): string {
  const concerns = deriveConcerns(result);
  if (concerns.length === 0) {
    const ai = result.aiAnalysis;
    if (ai?.summary) {
      const short = humanizeSummaryParagraph(ai.summary);
      if (short.length <= 80) return short.endsWith('.') ? short : `${short}.`;
      return 'QueueLens found something worth a closer look.';
    }
    return REVIEW_BRIEF_UI.noAiHeadline;
  }

  const ids = new Set(concerns.map((c) => c.id));
  const hasSpam = ids.has('repeated_promo') || ids.has('spam_links');
  const hasPrivate = ids.has('private_contact');
  const hasRude = ids.has('rude_language');
  const hasReported = ids.has('reported');
  const hasOther = ids.has('other');

  const mayParts: string[] = [];
  if (hasSpam) mayParts.push('may be spam');
  if (hasPrivate) mayParts.push('may include private contact info');
  if (hasRude) mayParts.push('may include rude language');

  if (mayParts.length > 0) {
    let headline = `This ${joinMayFragments(mayParts)}`;
    if (!headline.endsWith('.')) headline += '.';
    if (hasReported) {
      headline = headline.replace(/\.$/, '') + '. This item was also reported.';
    }
    return headline;
  }

  if (hasReported && !hasOther) {
    return 'This item was reported.';
  }

  if (hasOther && !hasReported) {
    return 'QueueLens found something worth a closer look.';
  }

  if (hasReported && hasOther) {
    return 'This item was reported and needs a closer look.';
  }

  return 'QueueLens found something worth a closer look.';
}

export function translateValidationWarning(warning: string): string {
  const lower = warning.toLowerCase();
  if (lower.includes('unsupported evidence')) {
    return 'Some AI evidence could not be verified and was left out.';
  }
  if (lower.includes('high review priority') && lower.includes('manual review')) {
    return 'QueueLens lowered the urgency because verified evidence was thin.';
  }
  if (lower.includes('schema')) {
    return 'QueueLens could not read the AI response. Use raw context and your judgment.';
  }
  if (lower.includes('ai analysis unavailable') || lower.includes('ai is unavailable')) {
    return 'AI summary was unavailable for this run.';
  }
  return warning;
}

function moderatorNoteFragmentsForRemove(ids: ReviewConcernId[]): string[] {
  const fragments: string[] = [];
  const idSet = new Set(ids);
  if (idSet.has('repeated_promo') || idSet.has('spam_links')) {
    fragments.push('repeat a promotional link');
  }
  if (idSet.has('private_contact')) {
    fragments.push('include private contact info');
  }
  if (idSet.has('rude_language')) {
    fragments.push('include rude language');
  }
  return fragments;
}

function moderatorNoteFragmentsForAdvisory(ids: ReviewConcernId[]): string[] {
  const fragments: string[] = [];
  const idSet = new Set(ids);
  if (idSet.has('repeated_promo') || idSet.has('spam_links')) {
    fragments.push('repeats a promotional link');
  }
  if (idSet.has('private_contact')) {
    fragments.push('includes private contact info');
  }
  if (idSet.has('rude_language')) {
    fragments.push('includes rude language');
  }
  return fragments;
}

function joinWithAnd(fragments: string[]): string {
  if (fragments.length === 1) return fragments[0]!;
  if (fragments.length === 2) return `${fragments[0]} and ${fragments[1]}`;
  const last = fragments[fragments.length - 1]!;
  return `${fragments.slice(0, -1).join(', ')}, and ${last}`;
}

export function deriveShortModeratorNote(result: ValidatedAnalysisResult): string {
  const ai = result.aiAnalysis;
  if (ai?.moderatorNoteDraft?.trim() && ai.moderatorNoteDraft.trim().length <= 280) {
    return ai.moderatorNoteDraft.trim();
  }

  if (!ai) {
    return 'QueueLens could not build a mod note. Check the post on Reddit before acting.';
  }

  const concerns = deriveConcerns(result);
  const action = humanizeSuggestedAction(ai.suggestedAction);
  const kind = result.contextBundle.target.type === 'post' ? 'post' : 'comment';
  const removeBits = moderatorNoteFragmentsForRemove(concerns.map((c) => c.id));
  const advisoryBits = moderatorNoteFragmentsForAdvisory(concerns.map((c) => c.id));

  if (ai.suggestedAction === 'remove') {
    if (removeBits.length === 0) {
      return `Removed because this ${kind} may break subreddit rules. Please follow subreddit rules.`;
    }
    return `Removed because this ${kind} appears to ${joinWithAnd(removeBits)}. Please follow subreddit rules.`;
  }
  if (ai.suggestedAction === 'approve') {
    return `Reviewed with QueueLens (${action.toLowerCase()}). No clear rule break stood out after checking evidence.`;
  }
  if (advisoryBits.length > 0) {
    return `This ${kind} may break subreddit rules because it ${joinWithAnd(advisoryBits)}. Please avoid spam and private contact details.`;
  }
  return `${action}: QueueLens flagged this for review. Please confirm on Reddit before acting.`;
}

export function deriveDetailedModeratorNote(result: ValidatedAnalysisResult): string {
  const ai = result.aiAnalysis;
  if (ai?.moderatorNoteDraft?.trim()) {
    return ai.moderatorNoteDraft.trim();
  }

  if (!ai) {
    const base = result.safeFallbackMessage ?? 'AI summary is unavailable for this run.';
    return `${base} Open Technical details for full context before acting on Reddit.`;
  }

  const rules =
    ai.possibleRuleMatches.length > 0
      ? `Rules that may apply: ${ai.possibleRuleMatches.join(', ')}.`
      : 'No specific rule match was listed.';

  const snippets =
    ai.evidence.length > 0
      ? `Supporting snippets: ${ai.evidence.map((e) => `"${e.snippet}"`).join('; ')}.`
      : 'Verified snippets were limited in this run.';

  return [
    humanizeSummaryParagraph(ai.summary),
  `${humanizeSuggestedAction(ai.suggestedAction)} (${humanizeConfidence(ai.confidence).toLowerCase()} confidence, ${humanizePriority(ai.reviewPriority).toLowerCase()} priority).`,
    rules,
    snippets,
  ].join(' ');
}

export function deriveBeforeYouActNotes(result: ValidatedAnalysisResult): string[] {
  const notes: string[] = [
    'Check the post or comment on Reddit before you remove, approve, or message anyone.',
    'QueueLens did not remove, ban, message, or change anything on Reddit.',
  ];
  const ai = result.aiAnalysis;

  if (result.status === 'partial' || result.validationWarnings.length > 0) {
    notes.push('Some checks had warnings. Open Technical details if you want the full story.');
  }

  if (result.contextBundle.unavailableContext.length > 0) {
    notes.push('Some context was missing, so QueueLens may not have the full thread or history.');
  }

  if (result.evidenceFallbackUsed || !ai?.evidence.length) {
    notes.push('Evidence was limited. Read the snippets carefully or open Technical details for full text.');
  } else if (ai.evidence.length === 1) {
    notes.push('Only one verified snippet was available.');
  }

  if (ai && ai.confidence !== 'high') {
    notes.push('Confidence is not high. A second look is a good idea.');
  }

  if (ai && (ai.suggestedAction === 'needs_manual_review' || ai.suggestedAction === 'escalate')) {
    notes.push('QueueLens suggests a manual review or escalation, not a quick one-click action.');
  }

  if (looksLikeAmbiguousCivility(result)) {
    notes.push('Civility or rule fit looks unclear. Use your subreddit norms.');
  }

  if (result.contextBundle.ruleSource === 'demo_fallback') {
    notes.push('Live subreddit rules were not loaded. Demo rules were used instead.');
  }

  if (looksLikeSyntheticOrTestContent(result)) {
    notes.push('This looks like test content. Validate in a real moderation setting.');
  }

  return notes.slice(0, 6);
}

export type MatchedRuleView = {
  title: string;
  description: string;
};

export function getMatchedRules(result: ValidatedAnalysisResult): MatchedRuleView[] {
  const ai = result.aiAnalysis;
  if (!ai?.possibleRuleMatches.length) return [];

  const rules = result.contextBundle.subredditRules;
  return ai.possibleRuleMatches.map((title) => {
    const match = rules.find((r) => r.title.toLowerCase() === title.toLowerCase());
    return {
      title,
      description: match?.description ?? 'No description loaded for this rule.',
    };
  });
}

export function getOtherRulesChecked(result: ValidatedAnalysisResult): SubredditRule[] {
  const ai = result.aiAnalysis;
  const matched = new Set((ai?.possibleRuleMatches ?? []).map((t) => t.toLowerCase()));
  return result.contextBundle.subredditRules.filter((r) => !matched.has(r.title.toLowerCase()));
}
