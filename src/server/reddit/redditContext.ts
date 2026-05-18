import type { ContextBundle, ContextItem, ModerationTarget, SubredditRule, UnavailableContextNote } from '../types/context.js';
import { reddit } from '@devvit/web/server';
import { asRedditCommentId, asRedditPostId } from './redditIds.js';
import { DEMO_SUBREDDIT_RULES } from './demoRules.js';
import { normalizeCommentTarget, normalizePostTarget } from './normalizeTarget.js';
import { CONTEXT_LIMITS, truncateString } from '../security/contextLimits.js';
import { redactFreeText } from '../security/redact.js';

export type GatherSession = {
  targetType: 'post' | 'comment';
  targetId: string;
  subredditName: string;
};

function note(unavailable: UnavailableContextNote[], domain: string, reason: string) {
  unavailable.push({ domain, reason });
}

async function loadRules(subredditName: string, unavailable: UnavailableContextNote[]): Promise<SubredditRule[]> {
  try {
    const sub = await reddit.getSubredditByName(subredditName);
    const rules = await sub.getRules();
    if (!rules?.length) {
      note(unavailable, 'subreddit_rules', 'Subreddit returned no rules; using demo rules.');
      return DEMO_SUBREDDIT_RULES;
    }
    return rules.map((r: { shortName?: string; description?: string }, i: number) => ({
      id: String(i),
      title: truncateString(redactFreeText(r.shortName ?? `Rule ${i + 1}`), 500),
      description: truncateString(redactFreeText(r.description ?? ''), CONTEXT_LIMITS.maxRuleDescriptionChars),
    }));
  } catch (e) {
    note(
      unavailable,
      'subreddit_rules',
      e instanceof Error ? e.message : 'Unable to load subreddit rules; using demo rules.',
    );
    return DEMO_SUBREDDIT_RULES;
  }
}

async function recentActivityForAuthor(username: string | null, unavailable: UnavailableContextNote[]): Promise<ContextItem[]> {
  if (!username) {
    note(unavailable, 'user_history', 'No author username; skipping recent activity.');
    return [];
  }
  try {
    const user = await reddit.getUserByUsername(username);
    if (!user) {
      note(unavailable, 'user_history', 'Author username not found.');
      return [];
    }
    const items: ContextItem[] = [];
    let n = 0;
    const max = CONTEXT_LIMITS.maxUserActivityItems;

    const comments = user.getComments({ sort: 'new', limit: max });
    for await (const c of comments) {
      if (n >= max) break;
      const text = c.body ?? '';
      if (!text) continue;
      items.push({
        id: c.id,
        text: truncateString(redactFreeText(text), CONTEXT_LIMITS.maxUserActivityItemChars),
        sourceLabel: 'author_comments',
      });
      n++;
    }

    if (n < max) {
      const posts = user.getPosts({ sort: 'new', limit: max - n });
      for await (const p of posts) {
        if (n >= max) break;
        const text = [p.title, p.body ?? ''].filter(Boolean).join('\n');
        if (!text) continue;
        items.push({
          id: p.id,
          text: truncateString(redactFreeText(text), CONTEXT_LIMITS.maxUserActivityItemChars),
          sourceLabel: 'author_posts',
        });
        n++;
      }
    }

    return items;
  } catch (e) {
    note(unavailable, 'user_history', e instanceof Error ? e.message : 'Unable to load author activity.');
    return [];
  }
}

async function loadParentContext(
  session: GatherSession,
  unavailable: UnavailableContextNote[],
): Promise<ContextItem[]> {
  if (session.targetType !== 'comment') {
    note(
      unavailable,
      'thread_replies',
      'V1 loads immediate parent context for comment targets only; post targets do not load sibling/top replies here.',
    );
    return [];
  }

  try {
    const comment = await reddit.getCommentById(asRedditCommentId(session.targetId));
    const parentId = String(comment.parentId);

    if (parentId.startsWith('t3_')) {
      const post = await reddit.getPostById(asRedditPostId(parentId));
      const body = post.body ?? '';
      const text = [post.title, body].filter(Boolean).join('\n');
      if (!text) return [];
      return [
        {
          id: post.id,
          text: truncateString(redactFreeText(text), CONTEXT_LIMITS.maxParentItemChars),
          sourceLabel: 'parent_post',
        },
      ];
    }

    if (parentId.startsWith('t1_')) {
      const parentComment = await reddit.getCommentById(asRedditCommentId(parentId));
      if (!parentComment.body) return [];
      return [
        {
          id: parentComment.id,
          text: truncateString(redactFreeText(parentComment.body), CONTEXT_LIMITS.maxParentItemChars),
          sourceLabel: 'parent_comment',
        },
      ];
    }

    note(unavailable, 'parent_context', `Unexpected parent id shape: ${parentId}`);
    return [];
  } catch (e) {
    note(unavailable, 'parent_context', e instanceof Error ? e.message : 'Unable to load parent context.');
    return [];
  }
}

/**
 * Builds a bounded ContextBundle for a moderation target.
 * Missing or private data surfaces as unavailableContext entries — never invented.
 */
export async function gatherRedditContext(session: GatherSession): Promise<ContextBundle> {
  const unavailable: UnavailableContextNote[] = [];
  let target: ModerationTarget;

  try {
    if (session.targetType === 'post') {
      const post = await reddit.getPostById(asRedditPostId(session.targetId));
      target = normalizePostTarget(post, session.subredditName, null);
    } else {
      const comment = await reddit.getCommentById(asRedditCommentId(session.targetId));
      target = normalizeCommentTarget(comment, session.subredditName, null);
    }
  } catch (e) {
    note(unavailable, 'target', e instanceof Error ? e.message : 'Failed to load target.');
    target = {
      id: session.targetId,
      type: session.targetType,
      subredditName: session.subredditName,
      authorName: null,
      title: undefined,
      bodyText: '',
      reportReason: null,
    };
  }

  target = {
    ...target,
    bodyText: truncateString(redactFreeText(target.bodyText), CONTEXT_LIMITS.maxTargetChars),
    title: target.title ? truncateString(redactFreeText(target.title), 500) : undefined,
  };

  const parentContext = (await loadParentContext(session, unavailable)).slice(0, CONTEXT_LIMITS.maxParentItems);

  const subredditRules = await loadRules(session.subredditName, unavailable);
  const recentUserActivity = await recentActivityForAuthor(target.authorName, unavailable);

  return {
    target,
    parentContext,
    recentUserActivity,
    subredditRules,
    unavailableContext: unavailable,
  };
}
