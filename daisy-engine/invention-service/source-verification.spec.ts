import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifySourceMetadata } from './source-verification.js';
import type { Discovery } from './types.js';

const source: Discovery = {
  id: 'local-hash', providerId: 'W123456789', source: 'openalex', title: 'A verified paper title',
  abstract: 'Abstract text with an unsupported scientific claim.', year: 2024,
  url: 'https://openalex.org/W123456789', field: 'Engineering', lens: 'core',
  keywords: [], metrics: ['claims 42% improvement'], citations: 0, type: 'article',
};

afterEach(() => vi.unstubAllGlobals());

describe('canonical source metadata verification', () => {
  it('marks matching provider metadata as bibliographically verified only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'https://openalex.org/W123456789', title: 'A verified paper title',
      publication_year: 2024, doi: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('verified_metadata');
    expect(result.sourceVerificationDetail).toContain('title and year matched');
    expect(result.metrics).toEqual(['claims 42% improvement']);
  });

  it('flags title mismatch instead of accepting the record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'https://openalex.org/W123456789', title: 'Different paper',
      publication_year: 2024, doi: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('metadata_mismatch');
  });

  it('fails closed when the metadata provider is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('unverified');
  });
});
