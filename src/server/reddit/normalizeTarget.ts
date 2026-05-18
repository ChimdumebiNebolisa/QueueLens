import type { ModerationTarget } from '../types/context.js';

function joinReportReasons(user?: string[], mod?: string[]): string | null {
  const parts = [...(user ?? []), ...(mod ?? [])].filter(Boolean);
  return parts.length ? parts.slice(0, 5).join('; ') : null;
}

/** Normalize Devvit Reddit models into ModerationTarget fields (best-effort). */
export function normalizePostTarget(
  post: {
    id: string;
    title?: string;
    body?: string;
    authorName?: string;
    permalink?: string;
    createdAt?: Date | string | number;
    userReportReasons?: string[];
    modReportReasons?: string[];
  },
  subredditName: string,
  reportReason?: string | null,
): ModerationTarget {
  const bodyText = post.body ?? '';
  const created =
    post.createdAt instanceof Date
      ? post.createdAt.toISOString()
      : post.createdAt != null
        ? String(post.createdAt)
        : undefined;
  return {
    id: post.id,
    type: 'post',
    subredditName,
    authorName: post.authorName ?? null,
    title: post.title,
    bodyText,
    permalink: post.permalink,
    createdAt: created,
    reportReason: reportReason ?? joinReportReasons(post.userReportReasons, post.modReportReasons),
  };
}

export function normalizeCommentTarget(
  comment: {
    id: string;
    body?: string;
    text?: string;
    permalink?: string;
    createdAt?: Date | string | number;
    authorName?: string;
    userReportReasons?: string[];
    modReportReasons?: string[];
  },
  subredditName: string,
  reportReason?: string | null,
): ModerationTarget {
  const bodyText = comment.body ?? comment.text ?? '';
  const created =
    comment.createdAt instanceof Date
      ? comment.createdAt.toISOString()
      : comment.createdAt != null
        ? String(comment.createdAt)
        : undefined;
  return {
    id: comment.id,
    type: 'comment',
    subredditName,
    authorName: comment.authorName ?? null,
    bodyText,
    permalink: comment.permalink,
    createdAt: created,
    reportReason: reportReason ?? joinReportReasons(comment.userReportReasons, comment.modReportReasons),
  };
}
