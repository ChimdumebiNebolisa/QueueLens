import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContextBundle } from '../shared/queueLensDomain.js';
import {
  buildContextSnapshot,
  formatTargetTypeLine,
  formatUnavailableContextDomain,
} from '../shared/contextSnapshot.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): ContextBundle {
  const p = join(here, 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8')) as ContextBundle;
}

describe('contextSnapshot', () => {
  it('summarizes a post target with demo rules and unavailable thread context', () => {
    const snapshot = buildContextSnapshot(loadFixture('ambiguous-report.json'));

    expect(snapshot.targetType).toBe('post');
    expect(snapshot.targetId).toBe('t3_amb');
    expect(snapshot.subredditName).toBe('demo');
    expect(snapshot.ruleSource).toBe('demo_fallback');
    expect(snapshot.ruleSourceLabel).toBe('Demo fallback rules');
    expect(snapshot.parentContextCount).toBe(0);
    expect(snapshot.recentUserActivityCount).toBe(0);
    expect(snapshot.subredditRulesCount).toBe(1);
    expect(snapshot.unavailableNotes).toHaveLength(1);
    expect(snapshot.unavailableNotes[0]?.domain).toBe('thread_replies');
    expect(snapshot.redactionNotice).toBeNull();
    expect(snapshot.header.kindLabel).toBe('Reviewing post');
    expect(snapshot.header.headline).toBe('Is this allowed?');
    expect(formatTargetTypeLine(snapshot)).toBe('Post (t3_amb)');
  });

  it('summarizes a comment target with parent and history counts', () => {
    const snapshot = buildContextSnapshot(loadFixture('spam-bare-domain.json'));

    expect(snapshot.targetType).toBe('comment');
    expect(snapshot.targetId).toBe('t1_demo_bare');
    expect(snapshot.subredditName).toBe('demo');
    expect(snapshot.parentContextCount).toBe(1);
    expect(snapshot.recentUserActivityCount).toBe(1);
    expect(snapshot.unavailableNotes).toHaveLength(0);
    expect(snapshot.redactionNotice).toBeNull();
    expect(snapshot.header.kindLabel).toBe('Reviewing comment');
    expect(snapshot.header.metaLine).toBe('u/spammer · r/demo · t1_demo_bare');
  });

  it('surfaces a redaction notice when redacted placeholders are present', () => {
    const snapshot = buildContextSnapshot(loadFixture('fake-personal-info.json'));

    expect(snapshot.redactionNotice).toContain('[redacted-email]');
    expect(snapshot.redactionNotice).toContain('[redacted-phone]');
  });

  it('labels live rule source when present', () => {
    const bundle = loadFixture('ambiguous-report.json');
    bundle.ruleSource = 'live';

    const snapshot = buildContextSnapshot(bundle);

    expect(snapshot.ruleSource).toBe('live');
    expect(snapshot.ruleSourceLabel).toBe('Live subreddit rules');
  });

  it('formats unavailable context domains for display', () => {
    expect(formatUnavailableContextDomain('thread_replies')).toBe('Thread replies');
    expect(formatUnavailableContextDomain('custom_domain')).toBe('custom domain');
  });
});
