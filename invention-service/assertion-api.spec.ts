import { describe, expect, it } from 'vitest';
import { bearerMatches, reviewAssertion } from './assertion-api.js';
import type { EvidenceClaim } from './claim-evidence.js';
import type { Discovery } from './types.js';
import { run } from './server.js';

const token = 'discovery-test-token-32-characters-min';

function discovery(): Discovery {
  return {
    id: 'src-1',
    source: 'arxiv',
    title: 'A note',
    abstract: 'The measured loss fell by 2%.',
    year: 2024,
    url: 'https://arxiv.org/abs/2401.00001',
    field: 'test',
    lens: 'core',
    keywords: [],
    metrics: [],
    citations: 0,
    type: 'preprint',
    sourceVerification: 'verified_metadata',
  };
}

function claim(): EvidenceClaim {
  return {
    id: 'claim-1',
    text: 'The measured loss fell by 2%.',
    kind: 'numeric',
    sourceId: 'src-1',
    sourceUrl: 'https://arxiv.org/abs/2401.00001',
    sourceTitle: 'A note',
    locator: { kind: 'abstract_sentence', sentenceIndex: 0, quote: 'The measured loss fell by 2%.' },
    quantitativeTokens: ['2%'],
    corroboratingSourceIds: [],
    corroborationStatus: 'candidate_only_unassessed',
    reviewStatus: 'human_review_required',
    evidenceGrade: 'metadata_verified_abstract_only',
    limitations: [],
  };
}

describe('authenticated assertion review', () => {
  it('rejects a short or mismatched token', () => {
    expect(bearerMatches('Bearer short', 'short')).toBe(false);
    expect(bearerMatches('Bearer wrong-token-but-long-enough-value', token)).toBe(false);
    expect(bearerMatches(`Bearer ${token}`, token)).toBe(true);
  });

  it('keeps a matching passage withheld', () => {
    const result = reviewAssertion(discovery(), claim());
    expect(result.publishable).toBe(false);
    expect(result.reviewStatus).toBe('human_review_required');
    expect(result.passageValid).toBe(true);
  });

  it('withholds a passage that does not match', () => {
    const mismatched = claim();
    mismatched.locator.quote = 'A different sentence.';
    const result = reviewAssertion(discovery(), mismatched);
    expect(result.publishable).toBe(false);
    expect(result.reviewStatus).toBe('insufficient_evidence');
  });

  it('requires the configured bearer token over HTTP', async () => {
    process.env.DISCOVERY_API_TOKEN = token;
    process.env.PORT = '0';
    const server = await run();
    try {
      const refused = await fetch(`http://127.0.0.1:${server.port}/v1/assertions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ discovery: discovery(), claim: claim() }),
      });
      expect(refused.status).toBe(401);
      const accepted = await fetch(`http://127.0.0.1:${server.port}/v1/assertions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ discovery: discovery(), claim: claim() }),
      });
      expect(accepted.status).toBe(200);
      const body = await accepted.json() as { publishable: boolean; reviewStatus: string };
      expect(body.publishable).toBe(false);
      expect(body.reviewStatus).toBe('human_review_required');
    } finally {
      delete process.env.DISCOVERY_API_TOKEN;
      await server.stop();
    }
  });
});
