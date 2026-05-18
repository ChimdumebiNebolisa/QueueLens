import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';

export const menuAnalyze = new Hono();

menuAnalyze.post('/analyze-with-queuelens', async (c) => {
  let input: MenuItemRequest;
  try {
    input = await c.req.json<MenuItemRequest>();
  } catch {
    return c.json<UiResponse>({
      showToast: {
        text: 'QueueLens: invalid menu request.',
        appearance: 'neutral',
      },
    });
  }

  const { subredditName } = context;

  if (input.location === 'subreddit') {
    return c.json<UiResponse>({
      showToast: {
        text: 'QueueLens: subreddit menu location is not supported. Use the action on a post or comment.',
        appearance: 'neutral',
      },
    });
  }

  if (!subredditName) {
    return c.json<UiResponse>({
      showToast: {
        text: 'QueueLens: missing subreddit context.',
        appearance: 'neutral',
      },
    });
  }

  const targetId = input.targetId;
  const targetType = input.location === 'comment' ? 'comment' : 'post';

  if (targetType === 'comment' && !targetId.startsWith('t1_')) {
    return c.json<UiResponse>({
      showToast: {
        text: 'QueueLens: comment target id was not a comment thing id (t1_…).',
        appearance: 'neutral',
      },
    });
  }
  if (targetType === 'post' && !targetId.startsWith('t3_')) {
    return c.json<UiResponse>({
      showToast: {
        text: 'QueueLens: post target id was not a post thing id (t3_…).',
        appearance: 'neutral',
      },
    });
  }

  try {
    const post = await reddit.submitCustomPost({
      subredditName,
      title: 'QueueLens analysis',
      entry: 'default',
    });

    const payload = JSON.stringify({
      targetType,
      targetId,
      subredditName,
    } satisfies { targetType: 'post' | 'comment'; targetId: string; subredditName: string });

    const key = `queuelens:${post.id}`;
    await redis.set(key, payload);
    await redis.expire(key, 3600);

    return c.json<UiResponse>({
      showToast: {
        text: 'Opening QueueLens…',
        appearance: 'success',
      },
      navigateTo: post.url,
    });
  } catch (e) {
    console.error('QueueLens menu error', e instanceof Error ? e.message : e);
    return c.json<UiResponse>({
      showToast: {
        text: 'QueueLens could not start. Try again later.',
        appearance: 'neutral',
      },
    });
  }
});
