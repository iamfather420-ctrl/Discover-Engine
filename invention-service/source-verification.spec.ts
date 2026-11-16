import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifySourceMetadata } from './source-verification.js';
import type { Discovery } from './types.js';

const abstract = 'Abstract text with an unsupported scientific claim.';
const source: Discovery = {
  id: 'local-hash', providerId: 'https://openalex.org/W123456789', source: 'openalex',
  title: 'A verified paper title', abstract, year: 2024,
  url: 'https://openalex.org/W123456789', field: 'Engineering', lens: 'core',
  keywords: [], metrics: ['claims 42% improvement'], citations: 0, type: 'article',
};
const inverted = Object.fromEntries(abstract.split(' ').map((word, position) => [word, [position]]));

afterEach(() => vi.unstubAllGlobals());

describe('canonical source and abstract verification', () => {
  it('matches canonical OpenAlex identity and abstract text without claiming the science is true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'https://openalex.org/W123456789', title: source.title,
      publication_year: 2024, doi: null, abstract_inverted_index: inverted,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('verified_metadata');
    expect(result.sourceVerificationDetail).toContain('abstract text matched');
    expect(result.sourceVerificationDetail).toContain('scientific claims remain unverified');
    expect(result.metrics).toEqual(source.metrics);
  });

  it('flags canonical abstract mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'https://openalex.org/W123456789', title: source.title,
      publication_year: 2024, abstract_inverted_index: { Different: [0], abstract: [1] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('metadata_mismatch');
    expect(result.sourceVerificationDetail).toContain('abstract text mismatch');
  });

  it('flags canonical identifier mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'https://openalex.org/W999999999', title: source.title,
      publication_year: 2024, abstract_inverted_index: inverted,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('unverified');
    expect(result.sourceVerificationDetail).toContain('identifier mismatch');
  });

  it('extracts and checks arXiv IDs from canonical provider URLs', async () => {
    const arxiv: Discovery = {
      ...source, id: 'opaque-hash', providerId: 'http://arxiv.org/abs/2401.01234v2',
      source: 'arxiv', url: 'https://arxiv.org/abs/2401.01234v2',
      title: 'An arXiv paper', abstract: 'A concise abstract.', year: 2024,
    };
    const xml = '<feed><entry><id>http://arxiv.org/abs/2401.01234v2</id><title>An arXiv paper</title><published>2024-01-02T00:00:00Z</published><summary>A concise abstract.</summary></entry></feed>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml, { status: 200 })));
    const result = await verifySourceMetadata(arxiv);
    expect(result.sourceVerification).toBe('verified_metadata');
    expect(result.url).toBe('https://arxiv.org/abs/2401.01234v2');
  });

  it('fails closed when the metadata provider is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));
    const result = await verifySourceMetadata(source);
    expect(result.sourceVerification).toBe('unverified');
  });
});
