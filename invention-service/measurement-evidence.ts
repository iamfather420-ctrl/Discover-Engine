import { createHash, randomUUID } from 'node:crypto';

export type MeasurementStatus = 'measured_unverified';
export interface MeasurementRecord {
  id: string;
  status: MeasurementStatus;
  title: string;
  hypothesisId: string;
  protocol: { id: string; version: string; method: string };
  baseline: { description: string; value: number; unit: string };
  observations: Array<{ value: number; unit: string; observedAt: string; replicate: string }>;
  sampleSize: number;
  environment: string;
  operator: string;
  dataset: { uri: string; sha256: string; mediaType: string };
  analysis: { method: string; version: string; codeUri: string; codeSha256: string };
  uncertainty: { method: string; value: number; unit: string };
  calibration: string;
  ingestedAt: string;
  audit: Array<{ event: 'ingested'; at: string; actor: 'api_unverified' }>;
}
export type MeasurementInput = Omit<MeasurementRecord, 'id' | 'status' | 'ingestedAt' | 'audit'>;

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sha256 = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
const httpsUri = (v: unknown): v is string => nonEmpty(v) && /^https:\/\//i.test(v);

export function validateMeasurementInput(input: unknown): { valid: true; value: MeasurementInput } | { valid: false; reason: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, reason: 'Measurement payload must be an object' };
  const x = input as Record<string, any>;
  if (!nonEmpty(x.title) || !nonEmpty(x.hypothesisId)) return { valid: false, reason: 'title and hypothesisId are required' };
  if (!x.protocol || !nonEmpty(x.protocol.id) || !nonEmpty(x.protocol.version) || !nonEmpty(x.protocol.method)) return { valid: false, reason: 'Protocol ID, version and method are required' };
  if (!x.baseline || !nonEmpty(x.baseline.description) || !finite(x.baseline.value) || !nonEmpty(x.baseline.unit)) return { valid: false, reason: 'A measured baseline value, unit and description are required' };
  if (!Array.isArray(x.observations) || x.observations.length === 0 || x.observations.some((o: any) => !o || !finite(o.value) || !nonEmpty(o.unit) || !nonEmpty(o.replicate) || !nonEmpty(o.observedAt) || Number.isNaN(Date.parse(o.observedAt)))) return { valid: false, reason: 'At least one observation with numeric value, unit, timestamp and replicate ID is required' };
  const replicateIds = new Set(x.observations.map((o: any) => o.replicate));
  const observationKeys = x.observations.map((o: any) => `${o.replicate}:${new Date(o.observedAt).toISOString()}`);
  if (!Number.isInteger(x.sampleSize) || x.sampleSize < replicateIds.size || x.sampleSize < 1) return { valid: false, reason: 'sampleSize must be an integer at least as large as the number of distinct replicate IDs' };
  if (new Set(observationKeys).size !== observationKeys.length) return { valid: false, reason: 'Duplicate observation for the same replicate and timestamp' };
  if (x.observations.some((o: any) => o.unit !== x.baseline.unit)) return { valid: false, reason: 'Baseline and observation units must match for a direct comparison' };
  if (!nonEmpty(x.environment) || !nonEmpty(x.operator)) return { valid: false, reason: 'Environment and operator attribution are required' };
  if (!x.dataset || !httpsUri(x.dataset.uri) || !sha256(x.dataset.sha256) || !nonEmpty(x.dataset.mediaType)) return { valid: false, reason: 'Dataset requires an HTTPS URI, media type and SHA-256 digest' };
  if (!x.analysis || !nonEmpty(x.analysis.method) || !nonEmpty(x.analysis.version) || !httpsUri(x.analysis.codeUri) || !sha256(x.analysis.codeSha256)) return { valid: false, reason: 'Analysis method/version and code URI/SHA-256 are required' };
  if (!x.uncertainty || !nonEmpty(x.uncertainty.method) || !finite(x.uncertainty.value) || x.uncertainty.value < 0 || !nonEmpty(x.uncertainty.unit)) return { valid: false, reason: 'Uncertainty method, non-negative value and unit are required' };
  if (!nonEmpty(x.calibration)) return { valid: false, reason: 'Calibration details are required' };
  return { valid: true, value: x as MeasurementInput };
}

/** Ingestion records measurements as unverified. This function has no verification/promotion path. */
export function createMeasurementRecord(input: unknown, now = new Date().toISOString()): MeasurementRecord {
  const checked = validateMeasurementInput(input);
  if ('reason' in checked) throw new Error(checked.reason);
  return {
    ...checked.value,
    id: randomUUID(),
    status: 'measured_unverified',
    ingestedAt: now,
    dataset: { ...checked.value.dataset, sha256: checked.value.dataset.sha256.toLowerCase() },
    analysis: { ...checked.value.analysis, codeSha256: checked.value.analysis.codeSha256.toLowerCase() },
    audit: [{ event: 'ingested', at: now, actor: 'api_unverified' }],
  };
}

export function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
