import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reddit: {
    getPostById: vi.fn(),
    submitCustomPost: vi.fn(),
  },
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({
  reddit: mocks.reddit,
  redis: mocks.redis,
}));

import {
  appendAnalysisSessionToReviewDeskUrl,
  deskPointerKey,
  getOrCreateReviewDeskPost,
  toAbsoluteRedditUrl,
} from '../server/reviewDesk.js';

describe('reviewDesk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redis.get.mockResolvedValue(undefined);
    mocks.redis.set.mockResolvedValue(undefined);
    mocks.reddit.submitCustomPost.mockResolvedValue({
      id: 't3_desk_new',
      permalink: '/r/queuelens_dev/comments/desk_new/queuelens_review_desk/',
      url: '/r/queuelens_dev/comments/desk_new/queuelens_review_desk/',
    });
  });

  it('formats relative permalinks as absolute Reddit URLs', () => {
    expect(toAbsoluteRedditUrl('/r/queuelens_dev/comments/desk123/queuelens_review_desk/')).toBe(
      'https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
    );
  });

  it('passes through absolute permalinks', () => {
    expect(
      toAbsoluteRedditUrl('https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/'),
    ).toBe('https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/');
  });

  it('appends analysisSessionId to Review Desk navigation URLs', () => {
    expect(
      appendAnalysisSessionToReviewDeskUrl(
        'https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
        'session-abc',
      ),
    ).toBe(
      'https://www.reddit.com/r/queuelens_dev/comments/desk123/queuelens_review_desk/?analysisSessionId=session-abc',
    );
  });

  it('creates a Review Desk post when no pointer exists', async () => {
    const desk = await getOrCreateReviewDeskPost('queuelens_dev');

    expect(desk.id).toBe('t3_desk_new');
    expect(mocks.reddit.submitCustomPost).toHaveBeenCalledWith({
      subredditName: 'queuelens_dev',
      title: 'QueueLens Review Desk',
      entry: 'default',
    });
    expect(mocks.redis.set).toHaveBeenCalledWith(deskPointerKey('queuelens_dev'), 't3_desk_new');
  });

  it('reuses the Review Desk when the pointer resolves', async () => {
    mocks.redis.get.mockResolvedValue('t3_desk');
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_desk',
      title: 'QueueLens Review Desk',
      authorName: 'queuelens',
      permalink: '/r/queuelens_dev/comments/desk123/queuelens_review_desk/',
    });

    const desk = await getOrCreateReviewDeskPost('queuelens_dev');

    expect(desk.id).toBe('t3_desk');
    expect(mocks.reddit.submitCustomPost).not.toHaveBeenCalled();
    expect(mocks.redis.set).not.toHaveBeenCalled();
  });

  it('recreates the Review Desk when the pointer is stale', async () => {
    mocks.redis.get.mockResolvedValue('t3_desk_deleted');
    mocks.reddit.getPostById.mockRejectedValue(new Error('not found'));

    const desk = await getOrCreateReviewDeskPost('queuelens_dev');

    expect(desk.id).toBe('t3_desk_new');
    expect(mocks.reddit.submitCustomPost).toHaveBeenCalledTimes(1);
    expect(mocks.redis.set).toHaveBeenCalledWith(deskPointerKey('queuelens_dev'), 't3_desk_new');
  });

  it('recreates the Review Desk when the stored post is not a Review Desk shape', async () => {
    mocks.redis.get.mockResolvedValue('t3_wrong');
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_wrong',
      title: 'ordinary post',
      authorName: 'alice',
      permalink: '/r/queuelens_dev/comments/wrong/ordinary_post/',
    });

    const desk = await getOrCreateReviewDeskPost('queuelens_dev');

    expect(desk.id).toBe('t3_desk_new');
    expect(mocks.reddit.submitCustomPost).toHaveBeenCalledTimes(1);
    expect(mocks.redis.set).toHaveBeenCalledWith(deskPointerKey('queuelens_dev'), 't3_desk_new');
  });
});
