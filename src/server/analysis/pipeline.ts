import type { InvestigationTraceStep, ValidatedAnalysisResult } from '../types/analysis.js';
import type { GatherSession } from '../reddit/redditContext.js';
import {
  attachInvestigationTrace,
  buildAiCallOutcomeStep,
  buildContextGatheredStep,
  buildDeterministicSignalsStep,
  buildValidationWarningsStep,
} from '../../shared/investigationTrace.js';
import { gatherRedditContext } from '../reddit/redditContext.js';
import { extractDeterministicSignals } from './deterministicSignals.js';
import { runOpenAIAnalysis } from './aiAnalysis.js';
import { buildDeterministicFallbackEvidence, validateAnalysis } from './validateAnalysis.js';

function finalizeWithTrace(
  result: ValidatedAnalysisResult,
  prelude: InvestigationTraceStep[],
): ValidatedAnalysisResult {
  return attachInvestigationTrace(result, [
    ...prelude,
    buildValidationWarningsStep(result.validationWarnings, result.status),
  ]);
}

/**
 * End-to-end: bounded Reddit context → deterministic signals → OpenAI → validation.
 */
export async function executeQueueLensPipeline(session: GatherSession): Promise<ValidatedAnalysisResult> {
  const contextBundle = await gatherRedditContext(session);
  const contextStep = buildContextGatheredStep(contextBundle);
  const deterministicSignals = extractDeterministicSignals(contextBundle);
  const signalsStep = buildDeterministicSignalsStep(deterministicSignals);
  const ai = await runOpenAIAnalysis({
    contextBundle,
    deterministicSignals,
    outputContract: 'QueueLensAIAnalysisV1',
  });
  const aiStep = buildAiCallOutcomeStep(ai);
  const prelude = [contextStep, signalsStep, aiStep];

  if (ai.parsed) {
    const validated = validateAnalysis(contextBundle, deterministicSignals, ai.parsed);
    if (!validated.aiAnalysis || validated.aiAnalysis.evidence.length > 0) {
      return finalizeWithTrace(validated, prelude);
    }

    const fallbackEvidence = buildDeterministicFallbackEvidence(contextBundle, deterministicSignals);
    if (!fallbackEvidence.length) {
      return finalizeWithTrace(validated, prelude);
    }

    return finalizeWithTrace(
      {
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
      },
      prelude,
    );
  }

  return finalizeWithTrace(
    {
      status: 'partial',
      contextBundle,
      deterministicSignals,
      evidenceFallbackUsed: false,
      validationWarnings: [ai.error ?? 'AI analysis unavailable.'],
      safeFallbackMessage: 'AI is unavailable; use context, signals, and your judgment.',
    },
    prelude,
  );
}

export { executeQueueLensOnBundle } from './quickValidate.js';
