import { redis } from '@devvit/web/server';
import { ANALYSIS_SESSION_QUERY_PARAM } from '../shared/analysisSession.js';
import type { GatherSession } from './reddit/redditContext.js';

export { ANALYSIS_SESSION_QUERY_PARAM };

export const ANALYSIS_SESSION_TTL_SECONDS = 3600;

export type AnalysisSessionPayload = GatherSession & {
  deskPostId: string;
  createdAt: string;
};

export function analysisSessionKey(sessionId: string): string {
  return `queuelens:analysis:${sessionId}`;
}

export function generateAnalysisSessionId(): string {
  return crypto.randomUUID();
}

export function validateAnalysisSessionPayload(raw: unknown): AnalysisSessionPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const targetType = record.targetType;
  const targetId = record.targetId;
  const subredditName = record.subredditName;
  const deskPostId = record.deskPostId;
  const createdAt = record.createdAt;

  if (targetType !== 'post' && targetType !== 'comment') {
    return null;
  }
  if (typeof targetId !== 'string' || !targetId) {
    return null;
  }
  if (typeof subredditName !== 'string' || !subredditName) {
    return null;
  }
  if (typeof deskPostId !== 'string' || !deskPostId.startsWith('t3_')) {
    return null;
  }
  if (typeof createdAt !== 'string' || !createdAt) {
    return null;
  }
  if (targetType === 'post' && !targetId.startsWith('t3_')) {
    return null;
  }
  if (targetType === 'comment' && !targetId.startsWith('t1_')) {
    return null;
  }

  return {
    targetType,
    targetId,
    subredditName,
    deskPostId,
    createdAt,
  };
}

export async function createAnalysisSession(
  payload: Omit<AnalysisSessionPayload, 'createdAt'> & { createdAt?: string },
): Promise<string> {
  const sessionId = generateAnalysisSessionId();
  const fullPayload: AnalysisSessionPayload = {
    ...payload,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  };

  const key = analysisSessionKey(sessionId);
  await redis.set(key, JSON.stringify(fullPayload));
  await redis.expire(key, ANALYSIS_SESSION_TTL_SECONDS);

  return sessionId;
}

export async function readAnalysisSession(sessionId: string): Promise<AnalysisSessionPayload | null> {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  const raw = await redis.get(analysisSessionKey(sessionId));
  if (!raw) {
    return null;
  }

  try {
    return validateAnalysisSessionPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function toGatherSession(payload: AnalysisSessionPayload): GatherSession {
  return {
    targetType: payload.targetType,
    targetId: payload.targetId,
    subredditName: payload.subredditName,
  };
}
