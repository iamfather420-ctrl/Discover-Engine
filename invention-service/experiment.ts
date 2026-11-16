import type { ExperimentParams, ExperimentResult } from './types.js';
import { validateExperimentParams } from './validation.js';

/**
 * Disabled by design. Synthetic Monte Carlo outputs are not experimental observations
 * and must never be represented as evidence or results.
 */
export function runExperiment(_inv: unknown, params: ExperimentParams, _runIndex = 0): ExperimentResult {
  validateExperimentParams(params);
  throw new Error('Simulation disabled: synthetic model output is not real experimental evidence.');
}
