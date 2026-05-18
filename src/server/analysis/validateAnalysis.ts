import type { AIAnalysis, DeterministicSignal, EvidenceItem, ValidatedAnalysisResult } from '../types/analysis.js';
import type { ContextBundle } from '../types/context.js';
import { parseAIAnalysisJson } from './aiSchema.js';
import { extractExactLinkSnippets } from './linkFragments.js';

export type AllowedEvidenceSnippet = {
  source: EvidenceItem['source'];
  snippet: string;
};

function reportedContentText(target: ContextBundle['target']): string {
  const parts = [target.title, target.bodyText].filter(Boolean);
  return parts.join('\n');
}

function addAllowedSnippet(
  snippets: AllowedEvidenceSnippet[],
  seen: Set<string>,
  source: AllowedEvidenceSnippet['source'],
  snippet: string | undefined,
): void {
  const trimmed = snippet?.trim();
  if (!trimmed) return;
  const key = `${source}\u0000${trimmed}`;
  if (seen.has(key)) return;
  seen.add(key);
  snippets.push({ source, snippet: trimmed });
}

/**
 * Exact snippet candidates the model is allowed to copy into evidence.
 * Validation remains a separate exact-substring check against the source bundle.
 */
export function buildAllowedEvidenceSnippets(
  contextBundle: ContextBundle,
  deterministicSignals: DeterministicSignal[],
): AllowedEvidenceSnippet[] {
  const snippets: AllowedEvidenceSnippet[] = [];
  const seen = new Set<string>();

  addAllowedSnippet(snippets, seen, 'reported_content', contextBundle.target.title);
  addAllowedSnippet(snippets, seen, 'reported_content', contextBundle.target.bodyText);
  for (const snippet of extractExactLinkSnippets(reportedContentText(contextBundle.target))) {
    addAllowedSnippet(snippets, seen, 'reported_content', snippet);
  }

  for (const item of contextBundle.parentContext) {
    addAllowedSnippet(snippets, seen, 'parent_context', item.text);
    for (const snippet of extractExactLinkSnippets(item.text)) {
      addAllowedSnippet(snippets, seen, 'parent_context', snippet);
    }
  }

  for (const item of contextBundle.recentUserActivity) {
    addAllowedSnippet(snippets, seen, 'user_history', item.text);
    for (const snippet of extractExactLinkSnippets(item.text)) {
      addAllowedSnippet(snippets, seen, 'user_history', snippet);
    }
  }

  for (const rule of contextBundle.subredditRules) {
    addAllowedSnippet(snippets, seen, 'subreddit_rule', rule.title);
    addAllowedSnippet(snippets, seen, 'subreddit_rule', rule.description);
  }

  for (const sig of deterministicSignals) {
    addAllowedSnippet(snippets, seen, 'deterministic_signal', sig.matchedText);
  }

  return snippets;
}

/** Strings AI evidence may quote verbatim from. */
export function buildEvidenceHaystacks(contextBundle: ContextBundle, deterministicSignals: DeterministicSignal[]): string[] {
  const hay: string[] = [];
  hay.push(reportedContentText(contextBundle.target));
  for (const item of contextBundle.parentContext) {
    hay.push(item.text);
  }
  for (const item of contextBundle.recentUserActivity) {
    hay.push(item.text);
  }
  for (const rule of contextBundle.subredditRules) {
    hay.push(rule.title, rule.description);
  }
  for (const sig of deterministicSignals) {
    hay.push([sig.id, sig.label, sig.matchedText, sig.reason].filter(Boolean).join('\n'));
  }
  return hay;
}

function snippetMatchesHaystacks(snippet: string, haystacks: string[]): boolean {
  const t = snippet.trim();
  if (!t) return false;
  return haystacks.some((h) => h.includes(t));
}

export function isSupportedEvidenceItem(
  item: EvidenceItem,
  haystacks: string[],
  contextBundle: ContextBundle,
  deterministicSignals: DeterministicSignal[],
): boolean {
  if (!snippetMatchesHaystacks(item.snippet, haystacks)) return false;
  if (item.source === 'reported_content') {
    return snippetMatchesHaystacks(item.snippet, [reportedContentText(contextBundle.target)]);
  }
  if (item.source === 'parent_context') {
    return contextBundle.parentContext.some((p) => p.text.includes(item.snippet.trim()));
  }
  if (item.source === 'user_history') {
    return contextBundle.recentUserActivity.some((p) => p.text.includes(item.snippet.trim()));
  }
  if (item.source === 'subreddit_rule') {
    return contextBundle.subredditRules.some((r) => r.title.includes(item.snippet.trim()) || r.description.includes(item.snippet.trim()));
  }
  if (item.source === 'deterministic_signal') {
    return deterministicSignals.some((s) => [s.id, s.label, s.matchedText, s.reason].filter(Boolean).join('\n').includes(item.snippet.trim()));
  }
  return false;
}

export function buildDeterministicFallbackEvidence(
  contextBundle: ContextBundle,
  deterministicSignals: DeterministicSignal[],
): EvidenceItem[] {
  const haystacks = buildEvidenceHaystacks(contextBundle, deterministicSignals);
  const seen = new Set<string>();
  const fallback: EvidenceItem[] = [];

  for (const signal of deterministicSignals) {
    const snippet = signal.matchedText?.trim();
    if (!snippet) continue;
    if (seen.has(snippet)) continue;

    const item: EvidenceItem = {
      snippet,
      source: 'deterministic_signal',
      reason: signal.reason,
    };

    if (!isSupportedEvidenceItem(item, haystacks, contextBundle, deterministicSignals)) {
      continue;
    }

    seen.add(snippet);
    fallback.push(item);
  }

  return fallback;
}

/**
 * Validates parsed AI analysis: enum + schema already applied via Zod before calling.
 * Strips hallucinated evidence; downgrades high priority without valid evidence per guardrails.
 */
export function validateAnalysis(
  contextBundle: ContextBundle,
  deterministicSignals: DeterministicSignal[],
  rawModelOutput: unknown,
): ValidatedAnalysisResult {
  const parsed = parseAIAnalysisJson(rawModelOutput);
  if (!parsed.ok) {
    return {
      status: 'error',
      contextBundle,
      deterministicSignals,
      evidenceFallbackUsed: false,
      validationWarnings: [parsed.error],
      safeFallbackMessage: 'AI output did not match the expected schema.',
    };
  }

  const haystacks = buildEvidenceHaystacks(contextBundle, deterministicSignals);
  const warnings: string[] = [];
  const kept: EvidenceItem[] = [];

  for (const ev of parsed.value.evidence) {
    if (isSupportedEvidenceItem(ev, haystacks, contextBundle, deterministicSignals)) {
      kept.push(ev);
    } else {
      warnings.push(`Removed unsupported evidence snippet for source "${ev.source}".`);
    }
  }

  let ai: AIAnalysis = { ...parsed.value, evidence: kept };

  const hadHigh = ai.reviewPriority === 'high';
  const hasValidEvidence = ai.evidence.length > 0;
  if (hadHigh && !hasValidEvidence) {
    ai = {
      ...ai,
      reviewPriority: 'medium',
      suggestedAction: 'needs_manual_review',
    };
    warnings.push('High review priority requires at least one valid evidence snippet; downgraded to medium and marked needs manual review.');
  }

  const status: ValidatedAnalysisResult['status'] =
    warnings.length > 0 ? 'partial' : 'success';

  return {
    status,
    contextBundle,
    deterministicSignals,
    aiAnalysis: ai,
    evidenceFallbackUsed: false,
    validationWarnings: warnings,
  };
}
