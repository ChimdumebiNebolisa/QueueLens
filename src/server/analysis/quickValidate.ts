import type { ContextBundle } from '../types/context.js';
import type { ValidatedAnalysisResult } from '../types/analysis.js';
import { extractDeterministicSignals } from './deterministicSignals.js';
import { validateAnalysis } from './validateAnalysis.js';

/** Deterministic signals + validation only (no Devvit / OpenAI). Safe for unit tests. */
export function executeQueueLensOnBundle(contextBundle: ContextBundle, rawAi: unknown): ValidatedAnalysisResult {
  const deterministicSignals = extractDeterministicSignals(contextBundle);
  return validateAnalysis(contextBundle, deterministicSignals, rawAi);
}
