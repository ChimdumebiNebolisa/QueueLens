import { z } from 'zod';

const evidenceSourceSchema = z.enum([
  'reported_content',
  'parent_context',
  'user_history',
  'subreddit_rule',
  'deterministic_signal',
]);

export const evidenceItemSchema = z.object({
  snippet: z.string().describe('Must be copied exactly from the allowed evidence snippets list.'),
  source: evidenceSourceSchema,
  reason: z.string().describe('Short explanation of why the exact snippet supports the claim.'),
});

export const aiAnalysisSchema = z.object({
  summary: z.string().min(1),
  possibleRuleMatches: z.array(z.string()),
  reviewPriority: z.enum(['low', 'medium', 'high']),
  suggestedAction: z.enum(['approve', 'remove', 'escalate', 'needs_manual_review']),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.array(evidenceItemSchema),
  moderatorNoteDraft: z.string().optional(),
});

export type ParsedAIAnalysis = z.infer<typeof aiAnalysisSchema>;

/** Parse raw model JSON; returns Zod-safe object or error message (no throw). */
export function parseAIAnalysisJson(raw: unknown): { ok: true; value: ParsedAIAnalysis } | { ok: false; error: string } {
  const parsed = aiAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  return { ok: true, value: parsed.data };
}
