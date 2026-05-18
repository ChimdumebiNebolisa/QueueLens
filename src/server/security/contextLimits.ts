/** Hard caps for Reddit-derived text before AI or storage. */

export const CONTEXT_LIMITS = {
  maxTargetChars: 8000,
  maxParentItems: 12,
  maxParentItemChars: 2000,
  maxUserActivityItems: 8,
  maxUserActivityItemChars: 1200,
  maxRuleDescriptionChars: 2000,
} as const;

export function truncateString(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…[truncated]`;
}
