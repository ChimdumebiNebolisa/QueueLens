import { settings } from '@devvit/web/server';
import type { AIAnalysisInput, AIAnalysisResponse } from '../types/analysis.js';
import { aiAnalysisSchema } from './aiSchema.js';
import { buildAnalysisMessages } from './aiPrompt.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_MS = 25_000;

function jsonSchemaForOpenAI(): Record<string, unknown> {
  return {
    name: 'QueueLensAIAnalysisV1',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'possibleRuleMatches', 'reviewPriority', 'suggestedAction', 'confidence', 'evidence'],
      properties: {
        summary: { type: 'string' },
        possibleRuleMatches: { type: 'array', items: { type: 'string' } },
        reviewPriority: { type: 'string', enum: ['low', 'medium', 'high'] },
        suggestedAction: { type: 'string', enum: ['approve', 'remove', 'escalate', 'needs_manual_review'] },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        evidence: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['snippet', 'source', 'reason'],
            properties: {
              snippet: { type: 'string' },
              source: {
                type: 'string',
                enum: ['reported_content', 'parent_context', 'user_history', 'subreddit_rule', 'deterministic_signal'],
              },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    strict: true,
  };
}

function safeParseContent(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return null;
  const choices = (raw as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as { message?: { content?: unknown } })?.message;
  const content = msg?.content;
  if (typeof content !== 'string') return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

export async function runOpenAIAnalysis(input: AIAnalysisInput): Promise<AIAnalysisResponse> {
  const apiKeyRaw = await settings.get('openaiApiKey');
  const apiKey = typeof apiKeyRaw === 'string' && apiKeyRaw.trim() ? apiKeyRaw.trim() : undefined;
  const modelSetting = await settings.get('openaiModel');
  const model = typeof modelSetting === 'string' && modelSetting.trim() ? modelSetting.trim() : DEFAULT_MODEL;

  if (!apiKey) {
    return { raw: null, error: 'OpenAI API key is not configured (Devvit global secret openaiApiKey).' };
  }

  const { system, user } = buildAnalysisMessages(input);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_MS);

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: jsonSchemaForOpenAI(),
        },
      }),
    });

    const raw = (await res.json()) as unknown;
    if (!res.ok) {
      return { raw, error: 'OpenAI request failed.' };
    }
    const parsedJson = safeParseContent(raw);
    const z = aiAnalysisSchema.safeParse(parsedJson);
    if (!z.success) {
      return { raw, error: 'OpenAI returned JSON that failed local schema checks.' };
    }
    return { raw, parsed: z.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { raw: null, error: `OpenAI request error: ${msg}` };
  } finally {
    clearTimeout(t);
  }
}
