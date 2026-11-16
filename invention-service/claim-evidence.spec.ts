import { describe, expect, it } from 'vitest';
import { extractEvidenceClaims, validateClaimPassage } from './claim-evidence.js';
import type { Discovery } from './types.js';

const source = (overrides: Partial<Discovery> = {}): Discovery => ({
  id: 'paper-1', source: 'openalex', providerId: 'W123', title: 'Paper',
  abstract: 'The device reached 12% efficiency at 25 °C. The authors report improved stability.',
  year: 2024, url: 'https://doi.org/10.1234/example', field: 'Engineering',
  lens: 'core', keywords: [], metrics: [], citations: 0, type: 'article',
  sourceVerification: 'verified_metadata', ...overrides,
});

describe('claim-level evidence provenance', () => {
  it('extracts exact sentence locators and never auto-verifies scientific claims', () => {
    const claims = extractEvidenceClaims([source()]);
    expect(claims).toHaveLength(2);
    expect(claims[0]).toMatchObject({
      kind: 'numeric', locator: { kind: 'abstract_sentence', sentenceIndex: 0 },
      quantitativeTokens: ['12%', '25 °c'], reviewStatus: 'human_review_required',
      evidenceGrade: 'metadata_verified_abstract_only',
    });
    expect(claims.every((claim) => claim.reviewStatus !== 'verified')).toBe(true);
  });

  it('rejects an exact-quote mismatch', () => {
    const paper = source();
    const claim = extractEvidenceClaims([paper])[0];
    expect(validateClaimPassage({ ...claim, locator: { ...claim.locator, quote: 'A different sentence.' } }, paper).valid).toBe(false);
  });

  it('rejects sources without canonical metadata verification', () => {
    const paper = source({ sourceVerification: 'unverified' });
    const claim = extractEvidenceClaims([paper]);
    expect(claim).toHaveLength(0);
    const fabricated = { ...extractEvidenceClaims([source()])[0], sourceId: paper.id };
    expect(validateClaimPassage(fabricated, paper)).toMatchObject({ valid: false, reason: 'Source metadata is not verified' });
  });

  it('does not treat matching text in a second paper as proven independent corroboration', () => {
    const claims = extractEvidenceClaims([
      source(),
      source({ id: 'paper-2', providerId: 'W456', title: 'Duplicate paper', url: 'https://doi.org/10.1234/duplicate' }),
    ]);
    expect(claims[0].corroboratingSourceIds).toContain('paper-2');
    expect(claims[0].corroborationStatus).toBe('candidate_only_unassessed');
    expect(claims[0].reviewStatus).toBe('human_review_required');
  });
});
