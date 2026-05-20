import type { ContextBundle, UnavailableContextNote } from './queueLensDomain.js';
import { buildReviewedTargetHeaderView, type ReviewedTargetHeaderView } from './reviewedTargetHeader.js';

const REDACTION_MARKERS = ['[redacted-email]', '[redacted-phone]'] as const;

export type ContextSnapshotView = {
  header: ReviewedTargetHeaderView;
  targetType: ModerationTargetType;
  targetId: string;
  subredditName: string;
  ruleSource: ContextBundle['ruleSource'];
  ruleSourceLabel: string;
  parentContextCount: number;
  recentUserActivityCount: number;
  subredditRulesCount: number;
  unavailableNotes: UnavailableContextNote[];
  redactionNotice: string | null;
};

type ModerationTargetType = ContextBundle['target']['type'];

function collectBundleTexts(bundle: ContextBundle): string[] {
  const { target, parentContext, recentUserActivity, subredditRules } = bundle;
  return [
    target.title ?? '',
    target.bodyText,
    ...parentContext.map((item) => item.text),
    ...recentUserActivity.map((item) => item.text),
    ...subredditRules.flatMap((rule) => [rule.title, rule.description]),
  ];
}

function detectRedactionNotice(bundle: ContextBundle): string | null {
  const markers = REDACTION_MARKERS.filter((marker) =>
    collectBundleTexts(bundle).some((text) => text.includes(marker)),
  );
  if (markers.length === 0) {
    return null;
  }
  return `Contact details were redacted before analysis (${markers.join(', ')} placeholders may appear in raw context).`;
}

function ruleSourceLabel(ruleSource: ContextBundle['ruleSource']): string {
  return ruleSource === 'live' ? 'Live subreddit rules' : 'Demo fallback rules';
}

export function formatUnavailableContextDomain(domain: string): string {
  const labels: Record<string, string> = {
    thread_replies: 'Thread replies',
    parent_context: 'Parent context',
    user_history: 'User history',
    subreddit_rules: 'Subreddit rules',
    target: 'Target',
  };
  return labels[domain] ?? domain.replace(/_/g, ' ');
}

function formatTargetTypeLabel(type: ModerationTargetType): string {
  return type === 'post' ? 'Post' : 'Comment';
}

export function buildContextSnapshot(bundle: ContextBundle): ContextSnapshotView {
  const { target } = bundle;

  return {
    header: buildReviewedTargetHeaderView(bundle),
    targetType: target.type,
    targetId: target.id,
    subredditName: target.subredditName,
    ruleSource: bundle.ruleSource,
    ruleSourceLabel: ruleSourceLabel(bundle.ruleSource),
    parentContextCount: bundle.parentContext.length,
    recentUserActivityCount: bundle.recentUserActivity.length,
    subredditRulesCount: bundle.subredditRules.length,
    unavailableNotes: [...bundle.unavailableContext],
    redactionNotice: detectRedactionNotice(bundle),
  };
}

export function formatTargetTypeLine(view: ContextSnapshotView): string {
  return `${formatTargetTypeLabel(view.targetType)} (${view.targetId})`;
}
