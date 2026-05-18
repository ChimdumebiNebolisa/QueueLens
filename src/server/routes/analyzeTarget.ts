import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type { GatherSession } from '../reddit/redditContext.js';
import { executeQueueLensPipeline } from '../analysis/pipeline.js';

export const analyzeTarget = new Hono();

analyzeTarget.get('/analyze', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json({ error: 'Missing post context.' }, 400);
  }

  const rawSession = await redis.get(`queuelens:${postId}`);
  if (!rawSession) {
    return c.json(
      {
        error: 'No QueueLens session for this post. Use “Analyze with QueueLens” from a post or comment menu.',
      },
      404,
    );
  }

  let session: GatherSession;
  try {
    session = JSON.parse(rawSession) as GatherSession;
  } catch {
    return c.json({ error: 'Invalid session payload.' }, 400);
  }

  try {
    const result = await executeQueueLensPipeline(session);
    return c.json(result);
  } catch (e) {
    console.error('QueueLens analyze error', e instanceof Error ? e.message : e);
    return c.json({ error: 'Analysis failed.' }, 500);
  }
});
