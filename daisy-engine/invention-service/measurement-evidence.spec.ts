import { describe, expect, it } from 'vitest';
import { createMeasurementRecord, validateMeasurementInput } from './measurement-evidence.js';

const input = {
  title: 'Bench test', hypothesisId: 'design-1',
  protocol: { id: 'P-01', version: '1.0', method: 'Controlled bench measurement' },
  baseline: { description: 'Control device', value: 10, unit: 'mW' },
  observations: [{ value: 11, unit: 'mW', observedAt: '2026-01-01T12:00:00Z', replicate: 'r1' }],
  sampleSize: 1, environment: 'Lab A, 22 C', operator: 'Operator 1',
  dataset: { uri: 'https://example.org/data.csv', sha256: 'a'.repeat(64), mediaType: 'text/csv' },
  analysis: { method: 'Mean comparison', version: '1', codeUri: 'https://example.org/analysis.py', codeSha256: 'b'.repeat(64) },
  uncertainty: { method: 'Instrument specification', value: 0.2, unit: 'mW' },
  calibration: 'Meter calibrated 2026-01-01 against reference standard',
};

describe('traceable measurement evidence ingestion', () => {
  it('requires protocol, baseline, observations, provenance and reproducible analysis metadata', () => {
    expect(validateMeasurementInput(input).valid).toBe(true);
    expect(validateMeasurementInput({ ...input, dataset: { ...input.dataset, sha256: 'not-a-hash' } })).toMatchObject({ valid: false });
    expect(validateMeasurementInput({ ...input, observations: [] })).toMatchObject({ valid: false });
    expect(validateMeasurementInput({ ...input, protocol: undefined })).toMatchObject({ valid: false });
  });
  it('counts distinct replicate IDs rather than raw observation rows and rejects incomparable data', () => {
    const repeated = { ...input, observations: [
      input.observations[0],
      { ...input.observations[0], value: 12, observedAt: '2026-01-01T12:05:00Z' },
    ], sampleSize: 1 };
    expect(validateMeasurementInput(repeated).valid).toBe(true);
    const undercounted = { ...repeated, observations: [...repeated.observations, { ...input.observations[0], replicate: 'r2', observedAt: '2026-01-01T12:10:00Z' }] };
    expect(validateMeasurementInput(undercounted)).toMatchObject({ valid: false, reason: expect.stringContaining('distinct replicate IDs') });
    expect(validateMeasurementInput({ ...input, observations: [{ ...input.observations[0], unit: 'V' }] })).toMatchObject({ valid: false, reason: expect.stringContaining('units must match') });
  });
  it('creates only measured_unverified records and has no automatic verified promotion', () => {
    const record = createMeasurementRecord(input, '2026-01-02T00:00:00.000Z');
    expect(record.status).toBe('measured_unverified');
    expect(record.audit).toEqual([{ event: 'ingested', at: record.ingestedAt, actor: 'api_unverified' }]);
    expect(record).not.toHaveProperty('verifiedAt');
    expect(record).not.toHaveProperty('reviewer');
  });
});
