import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function readRepo(relPath: string): string {
  return readFileSync(join(repoRoot, relPath), 'utf8');
}

function listSourceFiles(relDir: string, extensions: string[]): string[] {
  const abs = join(repoRoot, relDir);
  return walkFiles(abs).filter((p) => extensions.some((ext) => p.endsWith(ext)));
}

const ENFORCEMENT_PATTERNS = [
  /\bremovePost\b/,
  /\bremoveComment\b/,
  /\bbanUser\b/,
  /\blockPost\b/,
  /\bapprovePost\b/,
  /\bsendMessage\b/,
  /\bautoRemove\b/,
  /\bautoBan\b/,
  /\bautoLock\b/,
];

const CLIENT_SECRET_PATTERNS = [
  /\bopenaiApiKey\b/,
  /\bOPENAI_API_KEY\b/,
  /\bsk-[a-zA-Z0-9]{8,}\b/,
  /settings\.get\s*\(\s*['"]openaiApiKey['"]/,
  /Authorization:\s*[`'"]Bearer\s*\$\{/,
];

describe('guardrailAudit (static, read-only)', () => {
  it('does not call Reddit enforcement APIs under src/', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles('src', ['.ts', '.tsx'])) {
      const rel = relative(repoRoot, file);
      const normalized = rel.replace(/\\/g, '/');
      if (normalized.includes('src/tests/')) {
        continue;
      }
      const source = readFileSync(file, 'utf8');
      for (const pattern of ENFORCEMENT_PATTERNS) {
        if (pattern.test(source)) {
          offenders.push(`${rel} matches ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps OpenAI secrets off the client bundle sources', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(join('src', 'client'), ['.ts', '.tsx'])) {
      const rel = relative(repoRoot, file);
      const source = readFileSync(file, 'utf8');
      for (const pattern of CLIENT_SECRET_PATTERNS) {
        if (pattern.test(source)) {
          offenders.push(`${rel} matches ${pattern}`);
        }
      }
      if (/@devvit\/web\/server/.test(source)) {
        offenders.push(`${rel} imports @devvit/web/server`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('loads the OpenAI key only from Devvit settings on the server', () => {
    const aiAnalysis = readRepo(join('src', 'server', 'analysis', 'aiAnalysis.ts'));
    expect(aiAnalysis).toMatch(/settings\.get\(\s*['"]openaiApiKey['"]/);
    expect(aiAnalysis).not.toMatch(/console\.(log|error|warn)\([^)]*apiKey/i);
    expect(aiAnalysis).not.toMatch(/Bearer \$\{apiKey\}[^`]*console/);
  });

  it('fails closed on GET /api/analyze without a session or Review Desk context', () => {
    const analyzeTarget = readRepo(join('src', 'server', 'routes', 'analyzeTarget.ts'));
    expect(analyzeTarget).toContain('MISSING_ANALYSIS_SESSION_ERROR');
    expect(analyzeTarget).toContain('MISSING_REVIEW_DESK_CONTEXT_ERROR');
    expect(analyzeTarget).toMatch(/if\s*\(\s*!analysisSessionId\s*\)/);
    expect(analyzeTarget).toMatch(/if\s*\(\s*!postId\s*\|\|\s*!subredditName\s*\)/);
    expect(analyzeTarget).toMatch(/if\s*\(\s*!session\s*\)/);
    expect(analyzeTarget).toMatch(/getAnalysisSessionIdFromReviewDeskPostData/);
    expect(analyzeTarget).toMatch(/c\.req\.query\('analysisSessionId'\)/);
  });

  it('fails closed on the client when no session id is resolvable', () => {
    const clientApi = readRepo(join('src', 'client', 'api.ts'));
    expect(clientApi).toMatch(/getAnalysisSessionIdFromWindow/);
    expect(clientApi).toMatch(/if\s*\(\s*!analysisSessionId\s*\)/);
    expect(clientApi).toContain('NO_ACTIVE_REVIEW_SESSION_MESSAGE');
  });

  it('resolves the session bridge from postData before URL fallbacks', () => {
    const sharedSession = readRepo(join('src', 'shared', 'analysisSession.ts'));
    const clientSession = readRepo(join('src', 'client', 'analysisSession.ts'));
    expect(sharedSession).toContain('getAnalysisSessionIdFromReviewDeskPostData');
    expect(sharedSession).toContain('getAnalysisSessionIdFromLocation');
    expect(clientSession).toMatch(/getAnalysisSessionIdFromReviewDeskPostData[\s\S]*getAnalysisSessionIdFromLocation/);
  });

  it('writes Redis only from analysis session and Review Desk modules', () => {
    const redisSetFiles = listSourceFiles(join('src', 'server'), ['.ts'])
      .filter((file) => /redis\.set/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(repoRoot, file).replace(/\\/g, '/'))
      .sort();

    expect(redisSetFiles).toEqual(['src/server/analysisSession.ts', 'src/server/reviewDesk.ts']);
  });

  it('does not write the legacy shared desk handoff key from menu analyze', () => {
    const menuAnalyze = readRepo(join('src', 'server', 'routes', 'menuAnalyze.ts'));
    expect(menuAnalyze).not.toMatch(/redis\.set\(/);
    expect(menuAnalyze).toMatch(/createAnalysisSession/);
    expect(menuAnalyze).toMatch(/storeAnalysisSessionBridgeOnReviewDeskPost/);
  });
});
