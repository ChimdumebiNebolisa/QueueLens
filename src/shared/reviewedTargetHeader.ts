import type { ContextBundle, ModerationTarget } from './queueLensDomain.js';

export type ReviewedTargetHeaderView = {
  kindLabel: string;
  headline: string;
  metaLine: string;
  permalink: string | null;
};

function formatAuthor(authorName: string | null): string | null {
  if (!authorName?.trim()) {
    return null;
  }
  const name = authorName.trim();
  return name.startsWith('u/') ? name : `u/${name}`;
}

function formatMetaLine(target: ModerationTarget): string {
  const parts: string[] = [];
  const author = formatAuthor(target.authorName);
  if (author) {
    parts.push(author);
  }
  parts.push(`r/${target.subredditName}`);
  parts.push(target.id);
  return parts.join(' · ');
}

function postHeadline(target: ModerationTarget): string {
  if (target.title?.trim()) {
    return target.title.trim();
  }
  const body = target.bodyText.trim();
  if (!body) {
    return 'Post (no title or body text loaded)';
  }
  const firstLine = body.split('\n')[0]?.trim() ?? body;
  if (firstLine.length <= 120) {
    return firstLine;
  }
  return `${firstLine.slice(0, 117)}...`;
}

function parentPostTitleFromContext(bundle: ContextBundle): string | null {
  const parentPost = bundle.parentContext.find((item) => item.sourceLabel === 'parent_post');
  if (!parentPost?.text?.trim()) {
    return null;
  }
  const firstLine = parentPost.text.split('\n')[0]?.trim();
  return firstLine || null;
}

function commentHeadline(bundle: ContextBundle): string {
  const parentTitle = parentPostTitleFromContext(bundle);
  if (parentTitle) {
    return `Comment on: ${parentTitle}`;
  }

  const parentComment = bundle.parentContext.find((item) => item.sourceLabel === 'parent_comment');
  if (parentComment?.text?.trim()) {
    const snippet = parentComment.text.trim().split('\n')[0]?.trim() ?? parentComment.text.trim();
    const clipped = snippet.length <= 80 ? snippet : `${snippet.slice(0, 77)}...`;
    return `Comment on: ${clipped}`;
  }

  const fallbackParent = bundle.parentContext[0]?.text?.trim();
  if (fallbackParent) {
    const firstLine = fallbackParent.split('\n')[0]?.trim() ?? fallbackParent;
    const clipped = firstLine.length <= 80 ? firstLine : `${firstLine.slice(0, 77)}...`;
    return `Comment on: ${clipped}`;
  }

  return 'Comment on: Parent thread (title unavailable)';
}

export function toAbsoluteRedditPermalink(permalink: string | undefined): string | null {
  if (!permalink?.trim()) {
    return null;
  }
  const trimmed = permalink.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://www.reddit.com${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

export function buildReviewedTargetHeaderView(bundle: ContextBundle): ReviewedTargetHeaderView {
  const { target } = bundle;

  if (target.type === 'post') {
    return {
      kindLabel: 'Reviewing post',
      headline: postHeadline(target),
      metaLine: formatMetaLine(target),
      permalink: toAbsoluteRedditPermalink(target.permalink),
    };
  }

  return {
    kindLabel: 'Reviewing comment',
    headline: commentHeadline(bundle),
    metaLine: formatMetaLine(target),
    permalink: toAbsoluteRedditPermalink(target.permalink),
  };
}
