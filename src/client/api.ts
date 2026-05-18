import type { ValidatedAnalysisResult } from '../shared/queueLensDomain.js';

export async function fetchValidatedAnalysis(): Promise<ValidatedAnalysisResult> {
  const res = await fetch('/api/analyze');
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as ValidatedAnalysisResult;
}
