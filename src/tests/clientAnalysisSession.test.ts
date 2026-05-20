import { describe, expect, it } from 'vitest';
import {
  getAnalysisSessionIdFromLocation,
  getAnalysisSessionIdFromReviewDeskPostData,
} from '../shared/analysisSession.js';

describe('analysis session URL parsing', () => {
  it('reads analysisSessionId from the Review Desk postData bridge for the current user', () => {
    expect(
      getAnalysisSessionIdFromReviewDeskPostData(
        {
          t2_moderator: {
            analysisSessionId: 'session-bridge',
            createdAt: '2026-05-19T00:00:00.000Z',
          },
        },
        't2_moderator',
      ),
    ).toBe('session-bridge');
  });

  it('reads analysisSessionId from the query string', () => {
    expect(
      getAnalysisSessionIdFromLocation({
        search: '?analysisSessionId=session-query',
        hash: '',
      }),
    ).toBe('session-query');
  });

  it('reads analysisSessionId from the hash as a fallback', () => {
    expect(
      getAnalysisSessionIdFromLocation({
        search: '',
        hash: '#analysisSessionId=session-hash',
      }),
    ).toBe('session-hash');
  });

  it('returns null when no session id is present', () => {
    expect(
      getAnalysisSessionIdFromLocation({
        search: '',
        hash: '',
      }),
    ).toBeNull();
  });
});
