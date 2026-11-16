import { timingSafeEqual } from 'node:crypto';
import type { EvidenceClaim } from './claim-evidence.js';
import { validateClaimPassage } from './claim-evidence.js';
import type { Discovery } from './types.js';

export function bearerMatches(header: string | undefined, expected: string): boolean {
  if (expected.length < 32) return false;
  const presented = (header ?? '').replace(/^Bearer\s+/i, '');
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Passage checks only. This engine never promotes an abstract into a verified fact. */
export function reviewAssertion(discovery: Discovery, claim: EvidenceClaim) {
  const passage = validateClaimPassage(claim, discovery);
  return {
    service: 'iamfather420-ctrl/Discover-Engine',
    publishable: false,
    withheld: true,
    reviewStatus: passage.valid ? 'human_review_required' as const : 'insufficient_evidence' as const,
    passageValid: passage.valid,
    reason: passage.reason,
    evidenceGrade: 'metadata_verified_abstract_only' as const,
  };
}
