import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  context: {
    subredditName: 'queuelens_dev',
    userId: 't2_moderator',
    username: 'moderator',
  },
  reddit: {
    getPostById: vi.fn(),
    mergePostData: vi.fn(),
    submitCustomPost: vi.fn(),
  },
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({
  context: mocks.context,
  reddit: mocks.reddit,
  redis: mocks.redis,
}));

let menuAnalyze: typeof import('../server/routes/menuAnalyze.js').menuAnalyze;

beforeAll(async () => {
  ({ menuAnalyze } = await import('../server/routes/menuAnalyze.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.subredditName = 'queuelens_dev';
  mocks.context.userId = 't2_moderator';
  mocks.context.username = 'moderator';
  mocks.reddit.getPostById.mockImplementation(async (id: string) => ({
    id,
    permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
    url: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
  }));
  mocks.reddit.mergePostData.mockResolvedValue(undefined);
  mocks.redis.get.mockImplementation(async (key: string) => {
    if (key === 'queuelens:desk:queuelens_dev') {
      return undefined;
    }
    return undefined;
  });
  mocks.reddit.getPostById.mockResolvedValue({
    id: 't3_target',
    title: 'ordinary post',
    authorName: 'alice',
    permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
  });
  mocks.reddit.submitCustomPost.mockResolvedValue({
    id: 't3_desk',
    permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
    url: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
  });
  mocks.redis.set.mockResolvedValue(undefined);
  mocks.redis.expire.mockResolvedValue(undefined);
});

function sessionPayloadFromSetCall(targetId: string, targetType: 'post' | 'comment') {
  const sessionCall = mocks.redis.set.mock.calls.find((call) =>
    String(call[0]).startsWith('queuelens:analysis:'),
  );
  expect(sessionCall).toBeDefined();
  const sessionKey = String(sessionCall?.[0]);
  const sessionId = sessionKey.replace('queuelens:analysis:', '');
  const payload = JSON.parse(String(sessionCall?.[1]));
  expect(payload).toEqual({
    subredditName: 'queuelens_dev',
    targetId,
    targetType,
    deskPostId: 't3_desk',
    createdAt: expect.any(String),
  });
  return { sessionId, sessionKey };
}

describe('menuAnalyze', () => {
  it('navigates to the Review Desk with a per-analysis session id', async () => {
    mocks.reddit.getPostById.mockImplementation(async (id: string) => {
      if (id === 't3_desk') {
        return {
          id: 't3_desk',
          permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
          url: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
        };
      }
      return {
        id: 't3_target',
        title: 'ordinary post',
        authorName: 'alice',
        permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
      };
    });

    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: 'post',
        targetId: 't3_target',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    const { sessionId } = sessionPayloadFromSetCall('t3_target', 'post');

    expect(body).toEqual({
      navigateTo: `https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/?analysisSessionId=${sessionId}`,
      showToast: {
        appearance: 'success',
        text: 'Opening QueueLens...',
      },
    });
    expect(mocks.reddit.submitCustomPost).toHaveBeenCalledTimes(1);
    expect(mocks.reddit.mergePostData).toHaveBeenCalledWith('t3_desk', {
      t2_moderator: {
        analysisSessionId: sessionId,
        createdAt: expect.any(String),
      },
    });
    expect(mocks.redis.set).toHaveBeenCalledWith('queuelens:desk:queuelens_dev', 't3_desk');
    expect(mocks.redis.set).not.toHaveBeenCalledWith('queuelens:t3_desk', expect.anything());
    expect(mocks.redis.expire).toHaveBeenCalledWith(`queuelens:analysis:${sessionId}`, 3600);
  });

  it('creates unique sessions for two analyzes on the same desk', async () => {
    const first = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ location: 'post', targetId: 't3_first' }),
    });
    const second = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ location: 'post', targetId: 't3_second' }),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstBody = (await first.json()) as { navigateTo: string };
    const secondBody = (await second.json()) as { navigateTo: string };

    const sessionCalls = mocks.redis.set.mock.calls.filter((call) =>
      String(call[0]).startsWith('queuelens:analysis:'),
    );
    expect(sessionCalls).toHaveLength(2);

    const firstPayload = JSON.parse(String(sessionCalls[0]?.[1]));
    const secondPayload = JSON.parse(String(sessionCalls[1]?.[1]));

    expect(firstPayload.targetId).toBe('t3_first');
    expect(secondPayload.targetId).toBe('t3_second');

    const firstSessionId = String(sessionCalls[0]?.[0]).replace('queuelens:analysis:', '');
    const secondSessionId = String(sessionCalls[1]?.[0]).replace('queuelens:analysis:', '');

    expect(firstSessionId).not.toBe(secondSessionId);
    expect(firstBody.navigateTo).toContain(`analysisSessionId=${firstSessionId}`);
    expect(secondBody.navigateTo).toContain(`analysisSessionId=${secondSessionId}`);
    expect(mocks.reddit.mergePostData).toHaveBeenCalledTimes(2);
    expect(mocks.redis.set).not.toHaveBeenCalledWith('queuelens:t3_desk', expect.anything());
  });

  it('reuses the existing Review Desk without creating another custom post', async () => {
    mocks.redis.get.mockImplementation(async (key: string) => {
      if (key === 'queuelens:desk:queuelens_dev') {
        return 't3_desk';
      }
      return undefined;
    });
    mocks.reddit.getPostById.mockImplementation(async (id: string) => {
      if (id === 't3_desk') {
        return {
          id: 't3_desk',
          title: 'QueueLens Review Desk',
          authorName: 'queuelens',
          permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
          mergePostData: vi.fn().mockResolvedValue(undefined),
        };
      }
      return {
        id: 't3_target',
        title: 'ordinary post',
        authorName: 'alice',
        permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
        mergePostData: vi.fn().mockResolvedValue(undefined),
      };
    });

    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: 'post',
        targetId: 't3_target',
      }),
    });

    expect(response.status).toBe(200);
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
    sessionPayloadFromSetCall('t3_target', 'post');
    expect(mocks.redis.set).not.toHaveBeenCalledWith('queuelens:t3_desk', expect.anything());
  });

  it('stores comment targets in per-analysis sessions', async () => {
    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ location: 'comment', targetId: 't1_comment' }),
    });

    expect(response.status).toBe(200);
    sessionPayloadFromSetCall('t1_comment', 'comment');
  });

  it('shows a visible error for QueueLens Review Desk posts instead of re-analyzing them', async () => {
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_desk',
      title: 'QueueLens Review Desk',
      authorName: 'queuelens',
      permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
    });

    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: 'post',
        targetId: 't3_desk',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      showToast: {
        appearance: 'neutral',
        text: 'QueueLens cannot analyze QueueLens Review Desk posts.',
      },
    });
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
    expect(mocks.redis.set).not.toHaveBeenCalled();
    expect(mocks.redis.expire).not.toHaveBeenCalled();
  });

  it('blocks legacy QueueLens analysis posts by metadata', async () => {
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_analysis',
      title: 'QueueLens analysis',
      authorName: 'queuelens',
      permalink: '/r/queuelens_dev/comments/queue123/queuelens_analysis/',
    });

    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: 'post',
        targetId: 't3_analysis',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      showToast: {
        appearance: 'neutral',
        text: 'QueueLens cannot analyze QueueLens Review Desk posts.',
      },
    });
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
  });

  it('blocks recursive analysis when the target post already has a legacy session key', async () => {
    mocks.redis.get.mockImplementation(async (key: string) => {
      if (key === 'queuelens:t3_desk') {
        return JSON.stringify({
          targetType: 'post',
          targetId: 't3_fixture',
          subredditName: 'queuelens_dev',
        });
      }
      return undefined;
    });

    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: 'post',
        targetId: 't3_desk',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      showToast: {
        appearance: 'neutral',
        text: 'QueueLens cannot analyze QueueLens Review Desk posts.',
      },
    });
    expect(mocks.reddit.getPostById).not.toHaveBeenCalled();
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
    expect(mocks.redis.set).not.toHaveBeenCalled();
    expect(mocks.redis.expire).not.toHaveBeenCalled();
  });

  it('shows a visible error when the menu target id is missing', async () => {
    const response = await menuAnalyze.request('http://localhost/analyze-with-queuelens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: 'post',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      showToast: {
        appearance: 'neutral',
        text: 'QueueLens could not open because the selected target was missing.',
      },
    });
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
  });
});
