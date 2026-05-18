export const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;
const DOMAIN_RE = /(?<!@)\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;

export type LinkObservation = {
  exactUrl?: string;
  exactDomain: string;
  canonicalUrl?: string;
  canonicalDomain: string;
};

type Range = {
  start: number;
  end: number;
};

function collectUrlRanges(text: string): Range[] {
  const ranges: Range[] = [];

  for (const match of text.matchAll(URL_RE)) {
    const exactUrl = match[0];
    const index = match.index;
    if (!exactUrl || index == null) continue;
    ranges.push({ start: index, end: index + exactUrl.length });
  }

  return ranges;
}

function isInsideRanges(index: number, ranges: Range[]): boolean {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function domainFromUrl(url: string): string | null {
  const domainMatch = url.match(/^https?:\/\/([^\/\s?#]+)/i);
  return domainMatch?.[1]?.trim() ?? null;
}

export function collectLinkObservations(text: string): LinkObservation[] {
  const observations: LinkObservation[] = [];
  const urlRanges = collectUrlRanges(text);

  for (const match of text.matchAll(URL_RE)) {
    const exactUrl = match[0]?.trim();
    if (!exactUrl) continue;

    const exactDomain = domainFromUrl(exactUrl);
    if (!exactDomain) continue;

    observations.push({
      exactUrl,
      exactDomain,
      canonicalUrl: exactUrl.toLowerCase(),
      canonicalDomain: exactDomain.toLowerCase(),
    });
  }

  for (const match of text.matchAll(DOMAIN_RE)) {
    const exactDomain = match[0]?.trim();
    const index = match.index;
    if (!exactDomain || index == null || isInsideRanges(index, urlRanges)) continue;

    observations.push({
      exactDomain,
      canonicalDomain: exactDomain.toLowerCase(),
    });
  }

  return observations;
}

export function extractExactLinkSnippets(text: string): string[] {
  const snippets: string[] = [];
  const seen = new Set<string>();

  for (const observation of collectLinkObservations(text)) {
    if (observation.exactUrl && !seen.has(observation.exactUrl)) {
      seen.add(observation.exactUrl);
      snippets.push(observation.exactUrl);
    }

    if (!seen.has(observation.exactDomain)) {
      seen.add(observation.exactDomain);
      snippets.push(observation.exactDomain);
    }
  }

  return snippets;
}
