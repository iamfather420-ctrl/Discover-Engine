import type { ExperimentParams } from './types.js';
export interface ProjectInput { query: string; domains?: string[]; }
export function normalizeProjectInput(query: unknown, domains?: unknown): ProjectInput {
  if (typeof query !== 'string') throw new Error('A query string is required');
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3 || normalizedQuery.length > 500) throw new Error('Query must be between 3 and 500 characters');
  if (domains === undefined) return { query: normalizedQuery };
  if (!Array.isArray(domains)) throw new Error('Domains must be an array of strings');
  if (domains.length > 5) throw new Error('A maximum of 5 domains is allowed');
  if (domains.some((domain: unknown) => typeof domain !== 'string')) throw new Error('Every domain must be a string');
  const normalizedDomains = [...new Set((domains as string[]).map(domain => domain.trim()))];
  if (normalizedDomains.some(domain => domain.length === 0 || domain.length > 80)) throw new Error('Each domain must be between 1 and 80 characters');
  return { query: normalizedQuery, domains: normalizedDomains };
}
export function validateExperimentParams(params: ExperimentParams): ExperimentParams {
  if (!Number.isInteger(params.trials) || params.trials < 100 || params.trials > 20000) throw new Error('Trials must be an integer between 100 and 20000');
  if (!Number.isFinite(params.baselineNoise) || params.baselineNoise < 0 || params.baselineNoise > 100) throw new Error('Baseline noise must be a finite number between 0 and 100');
  return params;
}