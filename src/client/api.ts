import type { ValidatedAnalysisResult } from '../shared/queueLensDomain.js';
import { getAnalysisSessionIdFromWindow } from './analysisSession.js';

export const NO_ACTIVE_REVIEW_SESSION_MESSAGE =
  'No active QueueLens review session. Use Analyze with QueueLens from a post or comment.';

export async function fetchValidatedAnalysis(): Promise<ValidatedAnalysisResult> {
  const analysisSessionId = getAnalysisSessionIdFromWindow();
  if (!analysisSessionId) {
    throw new Error(NO_ACTIVE_REVIEW_SESSION_MESSAGE);
  }

  const res = await fetch(`/api/analyze?analysisSessionId=${encodeURIComponent(analysisSessionId)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as ValidatedAnalysisResult;
}
