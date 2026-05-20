import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  context: {
    postId: 't3_desk',
    subredditName: 'queuelens_dev',
    userId: 't2_moderator',
    username: 'moderator',
    postData: undefined as unknown,
  } as {
    postId?: string;
    subredditName?: string;
    userId?: string;
    username?: string;
    postData?: unknown;
  },
  redis: {
    get: vi.fn(),
  },
  executeQueueLensPipeline: vi.fn(),
}));

vi.mock('@devvit/web/server', () => ({
  context: mocks.context,
  redis: mocks.redis,
}));

vi.mock('../server/analysis/pipeline.js', () => ({
  executeQueueLensPipeline: mocks.executeQueueLensPipeline,
}));

let analyzeTarget: typeof import('../server/routes/analyzeTarget.js').analyzeTarget;
let MISSING_ANALYSIS_SESSION_ERROR: string;
let MISSING_REVIEW_DESK_CONTEXT_ERROR: string;

beforeAll(async () => {
  const mod = await import('../server/routes/analyzeTarget.js');
  analyzeTarget = mod.analyzeTarget;
  MISSING_ANALYSIS_SESSION_ERROR = mod.MISSING_ANALYSIS_SESSION_ERROR;
  MISSING_REVIEW_DESK_CONTEXT_ERROR = mod.MISSING_REVIEW_DESK_CONTEXT_ERROR;
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.postId = 't3_desk';
  mocks.context.subredditName = 'queuelens_dev';
  mocks.context.userId = 't2_moderator';
  mocks.context.username = 'moderator';
  mocks.context.postData = undefined;
  mocks.redis.get.mockResolvedValue(undefined);
  mocks.executeQueueLensPipeline.mockResolvedValue({ status: 'success' });
});

describe('analyzeTarget', () => {
  it('rejects requests without analysisSessionId', async () => {
    const response = await analyzeTarget.request('http://localhost/analyze');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: MISSING_ANALYSIS_SESSION_ERROR,
    });
    expect(mocks.redis.get).not.toHaveBeenCalled();
    expect(mocks.executeQueueLensPipeline).not.toHaveBeenCalled();
  });

  it('resolves the session from Review Desk postData when the query string is absent', async () => {
    mocks.context.postData = {
      t2_moderator: {
        analysisSessionId: 'session-bridge',
        createdAt: '2026-05-19T00:00:00.000Z',
      },
    };
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'post',
        targetId: 't3_target',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    );

    const response = await analyzeTarget.request('http://localhost/analyze');

    expect(response.status).toBe(200);
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:analysis:session-bridge');
    expect(mocks.executeQueueLensPipeline).toHaveBeenCalledWith({
      targetType: 'post',
      targetId: 't3_target',
      subredditName: 'queuelens_dev',
    });
  });

  it('rejects requests when Review Desk context is missing', async () => {
    mocks.context.postId = undefined as unknown as string;
    mocks.context.subredditName = undefined as unknown as string;

    const response = await analyzeTarget.request(
      'http://localhost/analyze?analysisSessionId=session-a',
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: MISSING_REVIEW_DESK_CONTEXT_ERROR,
    });
    expect(mocks.redis.get).not.toHaveBeenCalled();
    expect(mocks.executeQueueLensPipeline).not.toHaveBeenCalled();
  });

  it('rejects missing or expired analysis sessions', async () => {
    const response = await analyzeTarget.request(
      'http://localhost/analyze?analysisSessionId=missing-session',
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: MISSING_ANALYSIS_SESSION_ERROR,
    });
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:analysis:missing-session');
    expect(mocks.executeQueueLensPipeline).not.toHaveBeenCalled();
  });

  it('does not read the legacy desk-level handoff key', async () => {
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'post',
        targetId: 't3_stale',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    );

    const response = await analyzeTarget.request(
      'http://localhost/analyze?analysisSessionId=session-a',
    );

    expect(response.status).toBe(200);
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:analysis:session-a');
    expect(mocks.redis.get).not.toHaveBeenCalledWith('queuelens:t3_desk');
    expect(mocks.executeQueueLensPipeline).toHaveBeenCalledWith({
      targetType: 'post',
      targetId: 't3_stale',
      subredditName: 'queuelens_dev',
    });
  });

  it('rejects sessions that do not match the current Review Desk post', async () => {
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'post',
        targetId: 't3_target',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_other_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    );

    const response = await analyzeTarget.request(
      'http://localhost/analyze?analysisSessionId=session-mismatch',
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Analysis session does not match this Review Desk post.',
    });
    expect(mocks.executeQueueLensPipeline).not.toHaveBeenCalled();
  });

  it('resolves different sessions on the same desk to different targets', async () => {
    mocks.redis.get.mockImplementation(async (key: string) => {
      if (key === 'queuelens:analysis:session-a') {
        return JSON.stringify({
          targetType: 'post',
          targetId: 't3_first',
          subredditName: 'queuelens_dev',
          deskPostId: 't3_desk',
          createdAt: '2026-05-19T00:00:00.000Z',
        });
      }
      if (key === 'queuelens:analysis:session-b') {
        return JSON.stringify({
          targetType: 'post',
          targetId: 't3_second',
          subredditName: 'queuelens_dev',
          deskPostId: 't3_desk',
          createdAt: '2026-05-19T00:00:00.000Z',
        });
      }
      return undefined;
    });

    await analyzeTarget.request('http://localhost/analyze?analysisSessionId=session-a');
    await analyzeTarget.request('http://localhost/analyze?analysisSessionId=session-b');

    expect(mocks.executeQueueLensPipeline).toHaveBeenNthCalledWith(1, {
      targetType: 'post',
      targetId: 't3_first',
      subredditName: 'queuelens_dev',
    });
    expect(mocks.executeQueueLensPipeline).toHaveBeenNthCalledWith(2, {
      targetType: 'post',
      targetId: 't3_second',
      subredditName: 'queuelens_dev',
    });
  });

  it('runs the pipeline for a valid analysis session', async () => {
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'comment',
        targetId: 't1_comment',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    );

    const response = await analyzeTarget.request(
      'http://localhost/analyze?analysisSessionId=session-comment',
    );

    expect(response.status).toBe(200);
    expect(mocks.executeQueueLensPipeline).toHaveBeenCalledWith({
      targetType: 'comment',
      targetId: 't1_comment',
      subredditName: 'queuelens_dev',
    });
  });
});
