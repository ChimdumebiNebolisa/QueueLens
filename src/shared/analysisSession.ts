export const ANALYSIS_SESSION_QUERY_PARAM = 'analysisSessionId';

export type ReviewDeskSessionBridgeEntry = {
  analysisSessionId: string;
  createdAt: string;
};

function isReviewDeskSessionBridgeEntry(raw: unknown): raw is ReviewDeskSessionBridgeEntry {
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  const record = raw as Record<string, unknown>;
  return (
    typeof record.analysisSessionId === 'string' &&
    record.analysisSessionId.trim().length > 0 &&
    typeof record.createdAt === 'string' &&
    record.createdAt.trim().length > 0
  );
}

export function getAnalysisSessionIdFromReviewDeskPostData(
  postData: unknown,
  userKey: string | null | undefined,
): string | null {
  if (!userKey || !postData || typeof postData !== 'object') {
    return null;
  }

  const record = postData as Record<string, unknown>;
  const bridgeEntry = record[userKey];
  if (!isReviewDeskSessionBridgeEntry(bridgeEntry)) {
    return null;
  }

  return bridgeEntry.analysisSessionId.trim();
}

export function getAnalysisSessionIdFromLocation(location: {
  search: string;
  hash: string;
}): string | null {
  const fromQuery = new URLSearchParams(location.search).get(ANALYSIS_SESSION_QUERY_PARAM);
  if (fromQuery?.trim()) {
    return fromQuery.trim();
  }

  const hashBody = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  if (hashBody) {
    const fromHash = new URLSearchParams(hashBody).get(ANALYSIS_SESSION_QUERY_PARAM);
    if (fromHash?.trim()) {
      return fromHash.trim();
    }
  }

  return null;
}
