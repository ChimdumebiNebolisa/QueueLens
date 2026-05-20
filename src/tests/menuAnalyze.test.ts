import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  context: {
    subredditName: 'queuelens_dev',
  },
  reddit: {
    getPostById: vi.fn(),
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

describe('menuAnalyze', () => {
  it('navigates to the Review Desk after storing handoff on the desk post', async () => {
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
    await expect(response.json()).resolves.toEqual({
      navigateTo: 'https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
      showToast: {
        appearance: 'success',
        text: 'Opening QueueLens...',
      },
    });
    expect(mocks.reddit.submitCustomPost).toHaveBeenCalledTimes(1);
    expect(mocks.reddit.submitCustomPost).toHaveBeenCalledWith({
      subredditName: 'queuelens_dev',
      title: 'QueueLens Review Desk',
      entry: 'default',
    });
    expect(mocks.redis.set).toHaveBeenCalledTimes(2);
    expect(mocks.redis.set).toHaveBeenCalledWith('queuelens:desk:queuelens_dev', 't3_desk');
    const handoffCall = mocks.redis.set.mock.calls.find((call) => call[0] === 'queuelens:t3_desk');
    expect(handoffCall).toBeDefined();
    expect(JSON.parse(String(handoffCall?.[1]))).toEqual({
      subredditName: 'queuelens_dev',
      targetId: 't3_target',
      targetType: 'post',
    });
    expect(mocks.redis.expire).toHaveBeenCalledWith('queuelens:t3_desk', 3600);
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
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
    expect(mocks.redis.set).toHaveBeenCalledTimes(1);
    const handoffCall = mocks.redis.set.mock.calls.find((call) => call[0] === 'queuelens:t3_desk');
    expect(handoffCall).toBeDefined();
    expect(JSON.parse(String(handoffCall?.[1]))).toEqual({
      subredditName: 'queuelens_dev',
      targetId: 't3_target',
      targetType: 'post',
    });
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
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:t3_desk');
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

  it('blocks recursive analysis when the target post already has a QueueLens session key', async () => {
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
