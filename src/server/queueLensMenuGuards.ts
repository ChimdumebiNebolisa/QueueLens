import { reddit, redis } from '@devvit/web/server';

export const QUEUE_LENS_ANALYSIS_POST_TITLE = 'QueueLens analysis';

/** Shown when a moderator invokes Analyze on a QueueLens-generated analysis post. */
export const QUEUE_LENS_RECURSIVE_ANALYSIS_TOAST =
  'QueueLens analysis posts cannot be analyzed.';

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

/**
 * Returns true when the post is a QueueLens analysis custom post (recursive analyze target).
 * Checks the session key first (set when the analysis post is created), then post metadata.
 */
export async function isQueueLensAnalysisPostTarget(targetId: string): Promise<boolean> {
  const sessionKey = `queuelens:${targetId}`;
  const existingSession = await redis.get(sessionKey);
  if (existingSession) {
    return true;
  }

  const targetPost = await reddit.getPostById(targetId as `t3_${string}`);
  return isQueueLensAnalysisPostShape(targetPost);
}
