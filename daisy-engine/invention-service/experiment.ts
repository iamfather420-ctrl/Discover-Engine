import type { ExperimentParams, ExperimentResult, Invention } from './types.js';

/**
 * Synthetic Monte Carlo output is not experimental evidence.
 * This legacy entry point is retained only to fail safely for existing consumers.
 */
export function runExperiment(_inv: Invention, _params: ExperimentParams): ExperimentResult {
  throw new Error('Simulation disabled: synthetic model output is not real experimental evidence. Submit traceable measured data through a validated evidence workflow.');
}
