import {
  ANALYSIS_SESSION_QUERY_PARAM,
  getAnalysisSessionIdFromReviewDeskPostData,
  getAnalysisSessionIdFromLocation,
} from '../shared/analysisSession.js';

export { ANALYSIS_SESSION_QUERY_PARAM, getAnalysisSessionIdFromLocation };

type DevvitClientContext = {
  userId?: string;
  username?: string;
  postData?: unknown;
};

function getDevvitClientContext(): DevvitClientContext | null {
  const devvit = (globalThis as { devvit?: { context?: DevvitClientContext } }).devvit;
  return devvit?.context ?? null;
}

export function getAnalysisSessionIdFromWindow(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const context = getDevvitClientContext();
  const bridgeSessionId = getAnalysisSessionIdFromReviewDeskPostData(
    context?.postData,
    context?.userId ?? context?.username,
  );
  if (bridgeSessionId) {
    return bridgeSessionId;
  }

  return getAnalysisSessionIdFromLocation(window.location);
}
