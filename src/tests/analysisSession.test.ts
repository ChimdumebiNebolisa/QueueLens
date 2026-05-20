import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({
  redis: mocks.redis,
}));

import {
  analysisSessionKey,
  createAnalysisSession,
  generateAnalysisSessionId,
  readAnalysisSession,
  validateAnalysisSessionPayload,
} from '../server/analysisSession.js';

describe('analysisSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redis.set.mockResolvedValue(undefined);
    mocks.redis.expire.mockResolvedValue(undefined);
    mocks.redis.get.mockResolvedValue(undefined);
  });

  it('builds stable Redis keys', () => {
    expect(analysisSessionKey('abc-123')).toBe('queuelens:analysis:abc-123');
  });

  it('generates unique session ids', () => {
    const a = generateAnalysisSessionId();
    const b = generateAnalysisSessionId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it('validates a complete session payload', () => {
    expect(
      validateAnalysisSessionPayload({
        targetType: 'post',
        targetId: 't3_target',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    ).toEqual({
      targetType: 'post',
      targetId: 't3_target',
      subredditName: 'queuelens_dev',
      deskPostId: 't3_desk',
      createdAt: '2026-05-19T00:00:00.000Z',
    });
  });

  it('rejects malformed session payloads', () => {
    expect(validateAnalysisSessionPayload(null)).toBeNull();
    expect(
      validateAnalysisSessionPayload({
        targetType: 'post',
        targetId: 't3_target',
        subredditName: 'queuelens_dev',
        deskPostId: 'bad',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    ).toBeNull();
    expect(
      validateAnalysisSessionPayload({
        targetType: 'comment',
        targetId: 't3_not_comment',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    ).toBeNull();
  });

  it('stores sessions with TTL', async () => {
    const sessionId = await createAnalysisSession({
      targetType: 'comment',
      targetId: 't1_comment',
      subredditName: 'queuelens_dev',
      deskPostId: 't3_desk',
    });

    expect(sessionId).toBeTruthy();
    expect(mocks.redis.set).toHaveBeenCalledWith(
      `queuelens:analysis:${sessionId}`,
      expect.stringContaining('"targetId":"t1_comment"'),
    );
    expect(mocks.redis.expire).toHaveBeenCalledWith(`queuelens:analysis:${sessionId}`, 3600);
  });

  it('reads and validates stored sessions', async () => {
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'post',
        targetId: 't3_target',
        subredditName: 'queuelens_dev',
        deskPostId: 't3_desk',
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    );

    await expect(readAnalysisSession('session-1')).resolves.toEqual({
      targetType: 'post',
      targetId: 't3_target',
      subredditName: 'queuelens_dev',
      deskPostId: 't3_desk',
      createdAt: '2026-05-19T00:00:00.000Z',
    });
  });

  it('returns null for missing or invalid stored sessions', async () => {
    await expect(readAnalysisSession('missing')).resolves.toBeNull();

    mocks.redis.get.mockResolvedValue('not-json');
    await expect(readAnalysisSession('bad-json')).resolves.toBeNull();

    mocks.redis.get.mockResolvedValue(JSON.stringify({ targetType: 'post' }));
    await expect(readAnalysisSession('bad-payload')).resolves.toBeNull();
  });
});
