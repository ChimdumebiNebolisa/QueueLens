import { reddit, redis } from '@devvit/web/server';

/** Legacy per-analyze custom post title (still blocked from recursive analyze). */
export const QUEUE_LENS_ANALYSIS_POST_TITLE = 'QueueLens analysis';

/** Reusable Review Desk custom post title (one per subreddit). */
export const QUEUE_LENS_REVIEW_DESK_TITLE = 'QueueLens Review Desk';

/** Shown when a moderator invokes Analyze on a QueueLens Review Desk or legacy analysis post. */
export const QUEUE_LENS_RECURSIVE_ANALYSIS_TOAST =
  'QueueLens cannot analyze QueueLens Review Desk posts.';

export function isQueueLensReviewDeskPostShape(post: {
  title?: string | null;
  authorName?: string | null;
  permalink?: string | null;
}): boolean {
  return (
    post.title === QUEUE_LENS_REVIEW_DESK_TITLE &&
    (post.authorName === 'queuelens' || post.permalink?.includes('/queuelens_review_desk/') === true)
  );
}

export function isQueueLensAnalysisPostShape(post: {
  title?: string | null;
  authorName?: string | null;
  permalink?: string | null;
}): boolean {
  return (
    post.title === QUEUE_LENS_ANALYSIS_POST_TITLE &&
    (post.authorName === 'queuelens' || post.permalink?.includes('/queuelens_analysis/') === true)
  );
}

export function isQueueLensBlockedPostShape(post: {
  title?: string | null;
  authorName?: string | null;
  permalink?: string | null;
}): boolean {
  return isQueueLensReviewDeskPostShape(post) || isQueueLensAnalysisPostShape(post);
}

/**
 * Returns true when the post is a QueueLens Review Desk or legacy analysis custom post.
 * Checks the session key first (active handoff), then post metadata.
 */
export async function isQueueLensAnalysisPostTarget(targetId: string): Promise<boolean> {
  const sessionKey = `queuelens:${targetId}`;
  const existingSession = await redis.get(sessionKey);
  if (existingSession) {
    return true;
  }

  const targetPost = await reddit.getPostById(targetId as `t3_${string}`);
  return isQueueLensBlockedPostShape(targetPost);
}
