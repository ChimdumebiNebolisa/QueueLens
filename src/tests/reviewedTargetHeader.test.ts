import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContextBundle } from '../shared/queueLensDomain.js';
import {
  buildReviewedTargetHeaderView,
  toAbsoluteRedditPermalink,
} from '../shared/reviewedTargetHeader.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): ContextBundle {
  const p = join(here, 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8')) as ContextBundle;
}

describe('reviewedTargetHeader', () => {
  it('formats a post target with title, author, subreddit, and id', () => {
    const view = buildReviewedTargetHeaderView(loadFixture('ambiguous-report.json'));

    expect(view.kindLabel).toBe('Reviewing post');
    expect(view.headline).toBe('Is this allowed?');
    expect(view.metaLine).toBe('u/newbie · r/demo · t3_amb');
    expect(view.permalink).toBeNull();
  });

  it('formats a comment target with parent context headline', () => {
    const bundle = loadFixture('spam-bare-domain.json');
    const view = buildReviewedTargetHeaderView(bundle);

    expect(view.kindLabel).toBe('Reviewing comment');
    expect(view.headline).toBe('Comment on: Please avoid promotions in this thread.');
    expect(view.metaLine).toBe('u/spammer · r/demo · t1_demo_bare');
  });

  it('uses the first line of parent_post context as the comment parent title', () => {
    const bundle = loadFixture('spam-bare-domain.json');
    bundle.parentContext = [
      {
        id: 't3_parent',
        text: '[QueueLens E2E] Ambiguous civility fixture\nBody line two',
        sourceLabel: 'parent_post',
      },
    ];

    const view = buildReviewedTargetHeaderView(bundle);

    expect(view.headline).toBe('Comment on: [QueueLens E2E] Ambiguous civility fixture');
  });

  it('normalizes relative permalinks to absolute Reddit URLs', () => {
    expect(toAbsoluteRedditPermalink('/r/queuelens_dev/comments/1ti3shk/test/')).toBe(
      'https://www.reddit.com/r/queuelens_dev/comments/1ti3shk/test/',
    );
  });
});
