import type { ValidatedAnalysisResult } from '../types/analysis.js';
import type { GatherSession } from '../reddit/redditContext.js';
import { gatherRedditContext } from '../reddit/redditContext.js';
import { extractDeterministicSignals } from './deterministicSignals.js';
import { runOpenAIAnalysis } from './aiAnalysis.js';
import { validateAnalysis } from './validateAnalysis.js';

/**
 * End-to-end: bounded Reddit context → deterministic signals → OpenAI → validation.
 */
export async function executeQueueLensPipeline(session: GatherSession): Promise<ValidatedAnalysisResult> {
  const contextBundle = await gatherRedditContext(session);
  const deterministicSignals = extractDeterministicSignals(contextBundle);
  const ai = await runOpenAIAnalysis({
    contextBundle,
    deterministicSignals,
    outputContract: 'QueueLensAIAnalysisV1',
  });

  if (ai.parsed) {
    return validateAnalysis(contextBundle, deterministicSignals, ai.parsed);
  }

  return {
    status: 'partial',
    contextBundle,
    deterministicSignals,
    validationWarnings: [ai.error ?? 'AI analysis unavailable.'],
    safeFallbackMessage: 'AI is unavailable; use context, signals, and your judgment.',
  };
}

export { executeQueueLensOnBundle } from './quickValidate.js';
