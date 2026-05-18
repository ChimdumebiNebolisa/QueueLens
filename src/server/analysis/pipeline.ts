import type { ValidatedAnalysisResult } from '../types/analysis.js';
import type { GatherSession } from '../reddit/redditContext.js';
import { gatherRedditContext } from '../reddit/redditContext.js';
import { extractDeterministicSignals } from './deterministicSignals.js';
import { runOpenAIAnalysis } from './aiAnalysis.js';
import { buildDeterministicFallbackEvidence, validateAnalysis } from './validateAnalysis.js';

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
    const validated = validateAnalysis(contextBundle, deterministicSignals, ai.parsed);
    if (!validated.aiAnalysis || validated.aiAnalysis.evidence.length > 0) {
      return validated;
    }

    const fallbackEvidence = buildDeterministicFallbackEvidence(contextBundle, deterministicSignals);
    if (!fallbackEvidence.length) {
      return validated;
    }

    return {
      ...validated,
      status: 'partial',
      evidenceFallbackUsed: true,
      aiAnalysis: {
        ...validated.aiAnalysis,
        evidence: fallbackEvidence,
      },
      validationWarnings: [
        ...validated.validationWarnings,
        'No valid AI evidence remained; showing validated deterministic evidence fallback.',
      ],
    };
  }

  return {
    status: 'partial',
    contextBundle,
    deterministicSignals,
    evidenceFallbackUsed: false,
    validationWarnings: [ai.error ?? 'AI analysis unavailable.'],
    safeFallbackMessage: 'AI is unavailable; use context, signals, and your judgment.',
  };
}

export { executeQueueLensOnBundle } from './quickValidate.js';
