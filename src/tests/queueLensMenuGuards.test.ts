import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redis: {
    get: vi.fn(),
  },
  reddit: {
    getPostById: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({
  redis: mocks.redis,
  reddit: mocks.reddit,
}));

import {
  isQueueLensAnalysisPostShape,
  isQueueLensAnalysisPostTarget,
  isQueueLensReviewDeskPostShape,
  QUEUE_LENS_RECURSIVE_ANALYSIS_TOAST,
} from '../server/queueLensMenuGuards.js';

describe('queueLensMenuGuards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redis.get.mockResolvedValue(undefined);
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_target',
      title: 'ordinary post',
      authorName: 'alice',
      permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
    });
  });

  it('detects QueueLens Review Desk posts by title and permalink', () => {
    expect(
      isQueueLensReviewDeskPostShape({
        title: 'QueueLens Review Desk',
        authorName: 'other-bot',
        permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
      }),
    ).toBe(true);
  });

  it('detects QueueLens analysis posts by title and permalink', () => {
    expect(
      isQueueLensAnalysisPostShape({
        title: 'QueueLens analysis',
        authorName: 'other-bot',
        permalink: '/r/queuelens_dev/comments/queue123/queuelens_analysis/',
      }),
    ).toBe(true);
  });

  it('does not treat ordinary posts as QueueLens blocked posts', () => {
    expect(
      isQueueLensAnalysisPostShape({
        title: 'ordinary post',
        authorName: 'queuelens',
        permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
      }),
    ).toBe(false);
    expect(
      isQueueLensReviewDeskPostShape({
        title: 'ordinary post',
        authorName: 'queuelens',
        permalink: '/r/queuelens_dev/comments/target123/ordinary_post/',
      }),
    ).toBe(false);
  });

  it('blocks targets with an active QueueLens session key without loading post metadata', async () => {
    mocks.redis.get.mockResolvedValue(
      JSON.stringify({
        targetType: 'post',
        targetId: 't3_fixture',
        subredditName: 'queuelens_dev',
      }),
    );

    await expect(isQueueLensAnalysisPostTarget('t3_analysis')).resolves.toBe(true);
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:t3_analysis');
    expect(mocks.reddit.getPostById).not.toHaveBeenCalled();
  });

  it('falls back to post metadata when no session key is present', async () => {
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_analysis',
      title: 'QueueLens analysis',
      authorName: 'queuelens',
      permalink: '/r/queuelens_dev/comments/queue123/queuelens_analysis/',
    });

    await expect(isQueueLensAnalysisPostTarget('t3_analysis')).resolves.toBe(true);
    expect(mocks.redis.get).toHaveBeenCalledWith('queuelens:t3_analysis');
    expect(mocks.reddit.getPostById).toHaveBeenCalledWith('t3_analysis');
  });

  it('blocks Review Desk posts by metadata', async () => {
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_desk',
      title: 'QueueLens Review Desk',
      authorName: 'queuelens',
      permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
    });

    await expect(isQueueLensAnalysisPostTarget('t3_desk')).resolves.toBe(true);
  });

  it('exports the recursive-analysis toast message', () => {
    expect(QUEUE_LENS_RECURSIVE_ANALYSIS_TOAST).toBe(
      'QueueLens cannot analyze QueueLens Review Desk posts.',
    );
  });
});
