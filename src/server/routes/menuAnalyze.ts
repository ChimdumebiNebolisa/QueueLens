import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { createAnalysisSession } from '../analysisSession.js';
import {
  isQueueLensAnalysisPostTarget,
  QUEUE_LENS_RECURSIVE_ANALYSIS_TOAST,
} from '../queueLensMenuGuards.js';
import {
  appendAnalysisSessionToReviewDeskUrl,
  getOrCreateReviewDeskPost,
  storeAnalysisSessionBridgeOnReviewDeskPost,
  toAbsoluteRedditUrl,
} from '../reviewDesk.js';

export const menuAnalyze = new Hono();

function toast(text: string, appearance: 'neutral' | 'success' = 'neutral'): UiResponse {
  return {
    showToast: {
      text,
      appearance,
    },
  };
}

function blockedRecursiveAnalysisToast(): UiResponse {
  return {
    showToast: {
      text: QUEUE_LENS_RECURSIVE_ANALYSIS_TOAST,
      appearance: 'neutral',
    },
  };
}

menuAnalyze.post('/analyze-with-queuelens', async (c) => {
  let input: MenuItemRequest;
  try {
    input = await c.req.json<MenuItemRequest>();
  } catch {
    console.error('QueueLens menu invalid request: body was not valid JSON');
    return c.json<UiResponse>(toast('QueueLens: invalid menu request.'));
  }

  const { subredditName } = context;
  const contextRecord = context as Record<string, unknown>;
  const currentUserId =
    typeof contextRecord.userId === 'string'
      ? contextRecord.userId
      : typeof contextRecord.username === 'string'
        ? contextRecord.username
        : null;
  const currentUsername =
    typeof contextRecord.username === 'string'
      ? contextRecord.username
      : typeof contextRecord.userName === 'string'
        ? contextRecord.userName
        : null;
  const modStatus =
    typeof contextRecord.isModerator === 'boolean'
      ? contextRecord.isModerator
      : typeof contextRecord.isMod === 'boolean'
        ? contextRecord.isMod
        : null;

  console.log(
    'QueueLens menu start',
    JSON.stringify({
      location: input.location,
      targetId: input.targetId,
      subredditName,
        currentUserId,
      currentUsername,
      modStatus,
    }),
  );

  if (input.location === 'subreddit') {
    console.error('QueueLens menu unsupported location', input.location);
    return c.json<UiResponse>(
      toast('QueueLens: subreddit menu location is not supported. Use the action on a post or comment.'),
    );
  }

  if (!subredditName) {
    console.error('QueueLens menu missing subreddit context');
    return c.json<UiResponse>(toast('QueueLens: missing subreddit context.'));
  }

  const targetId = input.targetId;
  const targetType = input.location === 'comment' ? 'comment' : 'post';

  if (!targetId || typeof targetId !== 'string') {
    console.error(
      'QueueLens menu missing target id',
      JSON.stringify({
        location: input.location,
        subredditName,
        rawInput: input,
      }),
    );
    return c.json<UiResponse>(toast('QueueLens could not open because the selected target was missing.'));
  }

  if (targetType === 'comment' && !targetId.startsWith('t1_')) {
    console.error('QueueLens menu invalid comment target', targetId);
    return c.json<UiResponse>(toast('QueueLens: comment target id was not a comment thing id (t1_...).'));
  }

  if (targetType === 'post' && !targetId.startsWith('t3_')) {
    console.error('QueueLens menu invalid post target', targetId);
    return c.json<UiResponse>(toast('QueueLens: post target id was not a post thing id (t3_...).'));
  }

  if (targetType === 'post') {
    if (await isQueueLensAnalysisPostTarget(targetId)) {
      console.error('QueueLens menu blocked analysis post target', targetId);
      return c.json<UiResponse>(blockedRecursiveAnalysisToast());
    }
  }

  try {
    console.log(
      'QueueLens menu review desk resolve start',
      JSON.stringify({ subredditName, targetId, targetType }),
    );

    const desk = await getOrCreateReviewDeskPost(subredditName);
    const reviewDeskUrl = toAbsoluteRedditUrl(desk.permalink);
    const bridgeKey = currentUserId ?? currentUsername;
    if (!bridgeKey) {
      throw new Error('QueueLens missing current user context for Review Desk bridge.');
    }

    const createdAt = new Date().toISOString();

    const analysisSessionId = await createAnalysisSession({
      targetType,
      targetId,
      subredditName,
      deskPostId: desk.id,
      createdAt,
    });

    await storeAnalysisSessionBridgeOnReviewDeskPost(desk.id, bridgeKey, {
      analysisSessionId,
      createdAt,
    });

    const navigateTo = appendAnalysisSessionToReviewDeskUrl(reviewDeskUrl, analysisSessionId);

    console.log(
      'QueueLens menu analysis session stored',
      JSON.stringify({
        analysisSessionId,
        deskPostId: desk.id,
        reviewDeskUrl: navigateTo,
        targetId,
        targetType,
        subredditName,
      }),
    );

    return c.json<UiResponse>({
      showToast: {
        text: 'Opening QueueLens...',
        appearance: 'success',
      },
      navigateTo,
    });
  } catch (e) {
    console.error(
      'QueueLens menu error',
      JSON.stringify({
        targetId,
        targetType,
        subredditName,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return c.json<UiResponse>(toast('QueueLens could not start. Try again later.'));
  }
});
