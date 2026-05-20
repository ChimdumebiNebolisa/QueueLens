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
  mocks.redis.get.mockResolvedValue(undefined);
  mocks.reddit.getPostById.mockResolvedValue({
    id: 't3_target',
    title: 'ordinary post',
    authorName: 'alice',
    permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
  });
  mocks.reddit.submitCustomPost.mockResolvedValue({
    id: 't3_queue',
    permalink: '/r/queuelens_dev/comments/queue123/queuelens_analysis/',
    url: '/r/queuelens_dev/comments/queue123/queuelens_analysis/',
  });
  mocks.redis.set.mockResolvedValue(undefined);
  mocks.redis.expire.mockResolvedValue(undefined);
});

describe('menuAnalyze', () => {
  it('returns an absolute Reddit URL after creating a QueueLens post', async () => {
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
      navigateTo: 'https://www.reddit.com/r/queuelens_dev/comments/queue123/queuelens_analysis/',
      showToast: {
        appearance: 'success',
        text: 'Opening QueueLens...',
      },
    });
    expect(mocks.redis.set).toHaveBeenCalledTimes(1);
    expect(mocks.redis.set.mock.calls[0]?.[0]).toBe('queuelens:t3_queue');
    expect(JSON.parse(String(mocks.redis.set.mock.calls[0]?.[1]))).toEqual({
      subredditName: 'queuelens_dev',
      targetId: 't3_target',
      targetType: 'post',
    });
    expect(mocks.redis.expire).toHaveBeenCalledWith('queuelens:t3_queue', 3600);
  });

  it('shows a visible error for QueueLens analysis posts instead of re-analyzing them', async () => {
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
        text: 'QueueLens analysis posts cannot be analyzed.',
      },
    });
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:t3_analysis');
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
    expect(mocks.redis.set).not.toHaveBeenCalled();
    expect(mocks.redis.expire).not.toHaveBeenCalled();
  });

  it('blocks recursive analysis when the target post already has a QueueLens session key', async () => {
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'post',
        targetId: 't3_fixture',
        subredditName: 'queuelens_dev',
      }),
    );

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
        text: 'QueueLens analysis posts cannot be analyzed.',
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
