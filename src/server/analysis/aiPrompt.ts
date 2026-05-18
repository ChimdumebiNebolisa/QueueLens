import type { AIAnalysisInput } from '../types/analysis.js';
import { redactFreeText } from '../security/redact.js';
import { buildAllowedEvidenceSnippets } from './validateAnalysis.js';

function bundleDigest(input: AIAnalysisInput): string {
  const { contextBundle: b, deterministicSignals: sigs } = input;
  const lines: string[] = [];
  lines.push(`TARGET_TYPE: ${b.target.type}`);
  lines.push(`SUBREDDIT: ${b.target.subredditName}`);
  lines.push(`AUTHOR: ${b.target.authorName ?? 'unknown'}`);
  if (b.target.title) lines.push(`TITLE: ${redactFreeText(b.target.title)}`);
  lines.push(`BODY:\n${redactFreeText(b.target.bodyText)}`);
  lines.push('PARENT_CONTEXT:');
  for (const p of b.parentContext) {
    lines.push(`- (${p.sourceLabel ?? 'item'}) ${redactFreeText(p.text)}`);
  }
  lines.push('USER_ACTIVITY:');
  for (const u of b.recentUserActivity) {
    lines.push(`- (${u.sourceLabel ?? 'item'}) ${redactFreeText(u.text)}`);
  }
  lines.push('RULES:');
  for (const r of b.subredditRules) {
    lines.push(`- ${r.title}: ${redactFreeText(r.description)}`);
  }
  lines.push('UNAVAILABLE_CONTEXT:');
  for (const u of b.unavailableContext) {
    lines.push(`- ${u.domain}: ${u.reason}`);
  }
  lines.push('DETERMINISTIC_SIGNALS:');
  for (const s of sigs) {
    lines.push(`- [${s.severity}] ${s.label}: ${s.reason}${s.matchedText ? ` | match: ${s.matchedText}` : ''}`);
  }
  return lines.join('\n');
}

function allowedEvidenceDigest(input: AIAnalysisInput): string {
  const entries = buildAllowedEvidenceSnippets(input.contextBundle, input.deterministicSignals);
  const lines = ['ALLOWED_EVIDENCE_SNIPPETS:'];

  if (!entries.length) {
    lines.push('SNIPPETS_NONE');
    return lines.join('\n');
  }

  for (const [index, entry] of entries.entries()) {
    lines.push(`ITEM ${index + 1}`);
    lines.push(`SOURCE: ${entry.source}`);
    lines.push('SNIPPET_START');
    lines.push(redactFreeText(entry.snippet));
    lines.push('SNIPPET_END');
  }

  return lines.join('\n');
}

export function buildAnalysisMessages(input: AIAnalysisInput): { system: string; user: string } {
  const system = [
    'You are QueueLens, an assistant for Reddit moderators.',
    'You must output JSON only, matching the provided schema.',
    'You advise only: never claim enforcement, bans, removals, or mod actions were taken.',
    'Evidence snippets MUST be copied exactly from the ALLOWED_EVIDENCE_SNIPPETS section.',
    'Do not paraphrase, normalize, summarize, or combine evidence snippets.',
    'If no exact snippet supports a claim, return an empty evidence array.',
    'Rule evidence must copy the exact rule title or rule description from ALLOWED_EVIDENCE_SNIPPETS.',
    'Reported content evidence must copy the exact target title/body text or listed exact substring candidate from ALLOWED_EVIDENCE_SNIPPETS.',
    'Deterministic signal evidence must copy the exact deterministic matchedText from ALLOWED_EVIDENCE_SNIPPETS.',
    'If unsure, lower confidence and prefer suggestedAction "needs_manual_review".',
    'Never invent report reasons, mod actions, private messages, or data not in the bundle.',
  ].join('\n');

  const user = [
    `Output contract: ${input.outputContract}`,
    'Return a moderation brief with summary, possibleRuleMatches, reviewPriority, suggestedAction, confidence, and evidence array.',
    'Each evidence item: snippet (copied exactly from ALLOWED_EVIDENCE_SNIPPETS), source enum matching where it came from, reason (short).',
    '',
    bundleDigest(input),
    '',
    allowedEvidenceDigest(input),
  ].join('\n');

  return { system, user };
}
