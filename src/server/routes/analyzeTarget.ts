import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import { getAnalysisSessionIdFromReviewDeskPostData } from '../../shared/analysisSession.js';
import { readAnalysisSession, toGatherSession } from '../analysisSession.js';
import { executeQueueLensPipeline } from '../analysis/pipeline.js';

export const analyzeTarget = new Hono();

export const MISSING_ANALYSIS_SESSION_ERROR =
  'No active QueueLens review session. Use Analyze with QueueLens from a post or comment.';

export const MISSING_REVIEW_DESK_CONTEXT_ERROR =
  'QueueLens could not verify the Review Desk context. Re-open from Analyze with QueueLens.';

analyzeTarget.get('/analyze', async (c) => {
  const contextRecord = context as Record<string, unknown>;
  const analysisSessionId =
    getAnalysisSessionIdFromReviewDeskPostData(
      contextRecord.postData,
      typeof contextRecord.userId === 'string'
        ? contextRecord.userId
        : typeof contextRecord.username === 'string'
          ? contextRecord.username
          : null,
    ) ?? c.req.query('analysisSessionId')?.trim();
  if (!analysisSessionId) {
    return c.json({ error: MISSING_ANALYSIS_SESSION_ERROR }, 400);
  }

  const { postId, subredditName } = context;
  if (!postId || !subredditName) {
    console.error(
      'QueueLens analyze missing devvit context',
      JSON.stringify({ postId: postId ?? null, subredditName: subredditName ?? null }),
    );
    return c.json({ error: MISSING_REVIEW_DESK_CONTEXT_ERROR }, 400);
  }

  const session = await readAnalysisSession(analysisSessionId);
  if (!session) {
    return c.json({ error: MISSING_ANALYSIS_SESSION_ERROR }, 404);
  }

  if (session.deskPostId !== postId) {
    return c.json({ error: 'Analysis session does not match this Review Desk post.' }, 400);
  }
  if (session.subredditName !== subredditName) {
    return c.json({ error: 'Analysis session does not match this subreddit.' }, 400);
  }

  try {
    const result = await executeQueueLensPipeline(toGatherSession(session));
    return c.json(result);
  } catch (e) {
    console.error('QueueLens analyze error', e instanceof Error ? e.message : e);
    return c.json({ error: 'Analysis failed.' }, 500);
  }
});
