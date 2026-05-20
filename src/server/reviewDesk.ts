import { reddit, redis } from '@devvit/web/server';
import { ANALYSIS_SESSION_QUERY_PARAM } from './analysisSession.js';
import {
  isQueueLensReviewDeskPostShape,
  QUEUE_LENS_REVIEW_DESK_TITLE,
} from './queueLensMenuGuards.js';

export type ReviewDeskPost = {
  id: string;
  permalink: string;
  url?: string;
};

export type ReviewDeskSessionBridgeEntry = {
  analysisSessionId: string;
  createdAt: string;
};

export function deskPointerKey(subredditName: string): string {
  return `queuelens:desk:${subredditName}`;
}

export function toAbsoluteRedditUrl(permalink: string): string {
  if (permalink.startsWith('http://') || permalink.startsWith('https://')) {
    return permalink;
  }
  return `https://www.reddit.com${permalink.startsWith('/') ? permalink : `/${permalink}`}`;
}

/** Appends the per-analysis session id to the Review Desk navigation URL. */
export function appendAnalysisSessionToReviewDeskUrl(
  reviewDeskUrl: string,
  analysisSessionId: string,
): string {
  const url = new URL(reviewDeskUrl);
  url.searchParams.set(ANALYSIS_SESSION_QUERY_PARAM, analysisSessionId);
  return url.toString();
}

export async function storeAnalysisSessionBridgeOnReviewDeskPost(
  reviewDeskPostId: string,
  bridgeKey: string,
  bridgeEntry: ReviewDeskSessionBridgeEntry,
): Promise<void> {
  await reddit.mergePostData(reviewDeskPostId as `t3_${string}`, {
    [bridgeKey]: bridgeEntry,
  });
}

async function createReviewDeskPost(subredditName: string): Promise<ReviewDeskPost> {
  const post = await reddit.submitCustomPost({
    subredditName,
    title: QUEUE_LENS_REVIEW_DESK_TITLE,
    entry: 'default',
  });

  await redis.set(deskPointerKey(subredditName), post.id);

  return {
    id: post.id,
    permalink: post.permalink ?? '',
    url: post.url,
  };
}

/**
 * Returns the reusable QueueLens Review Desk custom post for a subreddit.
 * Creates one on first use and overwrites the Redis pointer if the stored post is missing.
 */
export async function getOrCreateReviewDeskPost(subredditName: string): Promise<ReviewDeskPost> {
  const pointerKey = deskPointerKey(subredditName);
  const storedId = await redis.get(pointerKey);

  if (storedId) {
    try {
      const post = await reddit.getPostById(storedId as `t3_${string}`);
      if (post && isQueueLensReviewDeskPostShape(post)) {
        return {
          id: post.id,
          permalink: post.permalink ?? '',
          url: post.url,
        };
      }
    } catch (e) {
      console.error(
        'QueueLens review desk stale pointer',
        JSON.stringify({
          subredditName,
          storedId,
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  return createReviewDeskPost(subredditName);
}
