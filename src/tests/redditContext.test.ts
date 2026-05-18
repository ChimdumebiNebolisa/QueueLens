import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reddit: {
    getSubredditByName: vi.fn(),
    getUserByUsername: vi.fn(),
    getCommentById: vi.fn(),
    getPostById: vi.fn(),
  },
}));

vi.mock('@devvit/web/server', () => ({
  reddit: mocks.reddit,
}));

function emptyUser() {
  return {
    async *getComments() {},
    async *getPosts() {},
  };
}

let gatherRedditContext: typeof import('../server/reddit/redditContext.js').gatherRedditContext;

beforeAll(async () => {
  ({ gatherRedditContext } = await import('../server/reddit/redditContext.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reddit.getUserByUsername.mockResolvedValue(emptyUser());
});

describe('gatherRedditContext', () => {
  it('loads comment target with parent post context and live rules', async () => {
    mocks.reddit.getCommentById
      .mockResolvedValueOnce({
        id: 't1_comment',
        body: 'reported comment',
        parentId: 't3_parent',
        authorName: 'alice',
      })
      .mockResolvedValueOnce({
        id: 't1_comment',
        body: 'reported comment',
        parentId: 't3_parent',
        authorName: 'alice',
      });
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_parent',
      title: 'Parent title',
      body: 'Parent body',
    });
    mocks.reddit.getSubredditByName.mockResolvedValue({
      getRules: vi.fn().mockResolvedValue([{ shortName: 'Rule one', description: 'No spam.' }]),
    });

    const result = await gatherRedditContext({
      targetType: 'comment',
      targetId: 't1_comment',
      subredditName: 'demo',
    });

    expect(result.target.type).toBe('comment');
    expect(result.parentContext).toHaveLength(1);
    expect(result.parentContext[0]?.sourceLabel).toBe('parent_post');
    expect(result.ruleSource).toBe('live');
  });

  it('adds unavailable note when parent comment cannot be loaded', async () => {
    mocks.reddit.getCommentById
      .mockResolvedValueOnce({
        id: 't1_comment',
        body: 'reported comment',
        parentId: 't1_missing',
        authorName: 'alice',
      })
      .mockRejectedValueOnce(new Error('missing parent'));
    mocks.reddit.getSubredditByName.mockResolvedValue({
      getRules: vi.fn().mockResolvedValue([{ shortName: 'Rule one', description: 'No spam.' }]),
    });

    const result = await gatherRedditContext({
      targetType: 'comment',
      targetId: 't1_comment',
      subredditName: 'demo',
    });

    expect(result.parentContext).toHaveLength(0);
    expect(result.unavailableContext.some((note) => note.domain === 'parent_context')).toBe(true);
  });

  it('uses demo fallback rules when live rules are unavailable', async () => {
    mocks.reddit.getPostById.mockResolvedValue({
      id: 't3_post',
      title: 'Post title',
      body: 'Post body',
      authorName: 'alice',
    });
    mocks.reddit.getSubredditByName.mockResolvedValue({
      getRules: vi.fn().mockResolvedValue([]),
    });

    const result = await gatherRedditContext({
      targetType: 'post',
      targetId: 't3_post',
      subredditName: 'demo',
    });

    expect(result.ruleSource).toBe('demo_fallback');
    expect(result.subredditRules.length).toBeGreaterThan(0);
  });
});
