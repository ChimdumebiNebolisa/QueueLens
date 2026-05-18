import type { ContextBundle } from '../types/context.js';
import type { DeterministicSignal } from '../types/analysis.js';
import { collectLinkObservations, URL_RE } from './linkFragments.js';

function uniqueUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches)];
}

function findRepeatedUrlOrDomain(
  observations: ReturnType<typeof collectLinkObservations>,
): { matchedText: string; kind: 'url' | 'domain' } | null {
  const urlCounts = new Map<string, { exact: string; count: number }>();
  const domainCounts = new Map<string, { exact: string; count: number }>();

  for (const observation of observations) {
    if (observation.canonicalUrl && observation.exactUrl) {
      const urlEntry = urlCounts.get(observation.canonicalUrl);
      if (urlEntry) {
        urlEntry.count += 1;
      } else {
        urlCounts.set(observation.canonicalUrl, { exact: observation.exactUrl, count: 1 });
      }
    }

    const domainEntry = domainCounts.get(observation.canonicalDomain);
    if (domainEntry) {
      domainEntry.count += 1;
    } else {
      domainCounts.set(observation.canonicalDomain, {
        exact: observation.exactDomain,
        count: 1,
      });
    }
  }

  for (const entry of urlCounts.values()) {
    if (entry.count >= 2) {
      return { matchedText: entry.exact, kind: 'url' };
    }
  }

  for (const entry of domainCounts.values()) {
    if (entry.count >= 2) {
      return { matchedText: entry.exact, kind: 'domain' };
    }
  }

  return null;
}

/** Explainable, pre-AI signals - advisory only, not enforcement. */
export function extractDeterministicSignals(bundle: ContextBundle): DeterministicSignal[] {
  const signals: DeterministicSignal[] = [];
  const reportedContent = [bundle.target.title, bundle.target.bodyText].filter(Boolean).join('\n');
  const repeatedUrlOrDomain = findRepeatedUrlOrDomain(
    collectLinkObservations(bundle.target.bodyText),
  );

  if (repeatedUrlOrDomain) {
    signals.push({
      id: repeatedUrlOrDomain.kind === 'url' ? 'repeated_url' : 'repeated_domain',
      label:
        repeatedUrlOrDomain.kind === 'url'
          ? 'Same link repeated in reported content'
          : 'Same domain repeated in reported content',
      severity: 'high',
      matchedText: repeatedUrlOrDomain.matchedText,
      reason: 'Same link/domain appears multiple times in the reported content.',
    });
  }

  const urls = uniqueUrls(reportedContent);
  if (urls.length >= 2) {
    signals.push({
      id: 'multi_links',
      label: 'Multiple outbound links',
      severity: 'medium',
      matchedText: urls.slice(0, 3).join(' '),
      reason: `Found ${urls.length} distinct URLs in reported content.`,
    });
  } else if (urls.length === 1) {
    signals.push({
      id: 'single_link',
      label: 'Contains link',
      severity: 'info',
      matchedText: urls[0],
      reason: 'Reported content includes at least one URL.',
    });
  }

  const lowered = reportedContent.toLowerCase();
  const redactedPersonalInfo = [
    {
      token: '[redacted-email]',
      id: 'possible_pii_email',
      label: 'Possible email address in reported content',
      reason: 'Reported content included an email address that was redacted before analysis.',
    },
    {
      token: '[redacted-phone]',
      id: 'possible_pii_phone',
      label: 'Possible phone number in reported content',
      reason: 'Reported content included a phone number that was redacted before analysis.',
    },
  ];
  for (const item of redactedPersonalInfo) {
    if (lowered.includes(item.token)) {
      signals.push({
        id: item.id,
        label: item.label,
        severity: 'low',
        matchedText: item.token,
        reason: item.reason,
      });
    }
  }

  const spammy = ['buy now', 'click here', 'crypto', 'giveaway', 'free money'];
  for (const term of spammy) {
    if (lowered.includes(term)) {
      signals.push({
        id: `kw_${term.replace(/\s+/g, '_')}`,
        label: `Keyword: ${term}`,
        severity: 'low',
        matchedText: term,
        reason: 'Matched a simple keyword heuristic in reported content.',
      });
    }
  }

  for (const rule of bundle.subredditRules) {
    const needle = rule.title.slice(0, 64).toLowerCase();
    if (needle.length > 2 && lowered.includes(needle)) {
      signals.push({
        id: `rule_title_${rule.id}`,
        label: 'Rule title phrase in content',
        severity: 'medium',
        matchedText: rule.title,
        reason: 'Reported content contains a phrase from a subreddit rule title.',
      });
    }
  }

  if (bundle.target.reportReason) {
    signals.push({
      id: 'report_reason',
      label: 'Report reason present',
      severity: 'info',
      matchedText: bundle.target.reportReason,
      reason: 'Reddit report reason metadata was available on the target.',
    });
  }

  if (bundle.unavailableContext.length) {
    signals.push({
      id: 'missing_context',
      label: 'Some context was unavailable',
      severity: 'info',
      reason: `There are ${bundle.unavailableContext.length} unavailable context note(s); review raw context.`,
    });
  }

  return signals;
}
