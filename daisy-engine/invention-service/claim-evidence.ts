import type { Discovery } from './types.js';
import { sentences, shortId } from './text-utils.js';

export type ClaimKind = 'descriptive' | 'numeric' | 'causal' | 'comparative' | 'performance';
export type ClaimReviewStatus = 'human_review_required' | 'insufficient_evidence' | 'conflicting';
export interface ClaimLocator {
  kind: 'abstract_sentence';
  sentenceIndex: number;
  quote: string;
}
export interface EvidenceClaim {
  id: string;
  text: string;
  kind: ClaimKind;
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  locator: ClaimLocator;
  quantitativeTokens: string[];
  corroboratingSourceIds: string[];
  corroborationStatus: 'candidate_only_unassessed';
  reviewStatus: ClaimReviewStatus;
  evidenceGrade: 'metadata_verified_abstract_only';
  limitations: string[];
}
const NUMBER_UNIT = /\b\d+(?:[.,]\d+)?\s?(?:%|percent|x|×|-fold|fold|times|mg|g|kg|ml|l|mah\/g|wh\/kg|w\/kg|mw|kw|gw|ms|µs|us|ns|hz|khz|mhz|ghz|db|nm|µm|mm|ev|mev|°c|kpa|mpa|gpa|tops|flops|fps)(?=$|[^a-z0-9])/gi;
function numericTokens(text: string): string[] {
  return (text.match(NUMBER_UNIT) || []).map((token) => token.toLowerCase().replace(/\s+/g, ' ').trim()).sort();
}
function kindOf(text: string): ClaimKind {
  if (NUMBER_UNIT.test(text)) { NUMBER_UNIT.lastIndex = 0; return 'numeric'; }
  NUMBER_UNIT.lastIndex = 0;
  if (/\b(cause[sd]?|leads? to|results? in|due to|because|therefore)\b/i.test(text)) return 'causal';
  if (/\b(compared with|compared to|higher than|lower than|more than|less than|outperform|superior|inferior)\b/i.test(text)) return 'comparative';
  if (/\b(improv|increase|reduce|enhanc|performance|efficien|accuracy|throughput|latency|yield)/i.test(text)) return 'performance';
  return 'descriptive';
}

/**
 * Checks provenance integrity only. A matching quote is not a semantic truth check.
 * No automated result from this module can promote a claim to verified.
 */
export function validateClaimPassage(claim: EvidenceClaim, source: Discovery): { valid: boolean; reason: string } {
  if (source.sourceVerification !== 'verified_metadata') return { valid: false, reason: 'Source metadata is not verified' };
  if (claim.sourceId !== source.id || claim.sourceUrl !== source.url) return { valid: false, reason: 'Claim source identity does not match the canonical discovery' };
  const sourceSentences = sentences(source.abstract);
  const sentence = sourceSentences[claim.locator.sentenceIndex];
  if (!sentence || sentence !== claim.locator.quote || !source.abstract.includes(claim.locator.quote)) {
    return { valid: false, reason: 'Exact quoted passage or sentence locator does not match source abstract' };
  }
  const claimNumbers = numericTokens(claim.text);
  const quoteNumbers = numericTokens(claim.locator.quote);
  if (JSON.stringify(claimNumbers) !== JSON.stringify(quoteNumbers)) return { valid: false, reason: 'Quantitative values or units do not match the cited passage' };
  return { valid: true, reason: 'Exact abstract passage and quantitative tokens match; semantic support and scientific validity remain unreviewed' };
}

/** Build traceable sentence-level literature leads from canonical-metadata-matched abstracts. */
export function extractEvidenceClaims(discoveries: Discovery[]): EvidenceClaim[] {
  const eligible = discoveries.filter((source) => source.sourceVerification === 'verified_metadata');
  const rows = eligible.flatMap((source) => sentences(source.abstract).map((quote, sentenceIndex) => ({ source, quote, sentenceIndex })));
  return rows.map(({ source, quote, sentenceIndex }) => {
    const normalized = quote.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    const corroboratingSourceIds = [...new Set(rows
      .filter((other) => other.source.id !== source.id &&
        other.quote.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ') === normalized)
      .map((other) => other.source.id))];
    const claim: EvidenceClaim = {
      id: shortId(`${source.id}:${sentenceIndex}:${quote}`),
      text: quote,
      kind: kindOf(quote),
      sourceId: source.id,
      sourceUrl: source.url,
      sourceTitle: source.title,
      locator: { kind: 'abstract_sentence', sentenceIndex, quote },
      quantitativeTokens: numericTokens(quote),
      corroboratingSourceIds,
      corroborationStatus: 'candidate_only_unassessed',
      reviewStatus: 'human_review_required',
      evidenceGrade: 'metadata_verified_abstract_only',
      limitations: [
        'This is an exact sentence extracted from an abstract, not a verified scientific conclusion.',
        'Abstract-level provenance does not establish full-text context, semantic support, reproducibility, or truth.',
        'Candidate matching across sources is not independent corroboration; shared datasets and derivative publications have not been excluded.',
      ],
    };
    const checked = validateClaimPassage(claim, source);
    if (!checked.valid) claim.reviewStatus = 'insufficient_evidence';
    return claim;
  });
}
