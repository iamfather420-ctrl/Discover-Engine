import type { Discovery } from './types.js';

const clean = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
function rebuildAbstract(index?: Record<string, number[]> | null): string {
  if (!index) return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const position of positions) words[position] = word;
  return words.filter(Boolean).join(' ').replace(/^abstract[:.\s]+/i, '');
}
async function json(url: string): Promise<any> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function xml(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
function xmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/\\s+/g, ' ').trim() : '';
}
function compare(d: Discovery, title: string, year: number | null, abstract: string): string | null {
  if (clean(d.title) !== clean(title)) return 'Canonical title mismatch';
  if (d.year !== null && year !== null && d.year !== year) return 'Publication year mismatch';
  if (!d.abstract || !abstract || clean(d.abstract) !== clean(abstract)) return 'Canonical abstract text mismatch or unavailable';
  return null;
}

/**
 * Cross-checks the provider ID, title, year and abstract text against the provider's
 * canonical record. This verifies record consistency only; it does not prove claims.
 */
export async function verifySourceMetadata(d: Discovery): Promise<Discovery> {
  try {
    if (d.source === 'openalex') {
      const id = d.providerId?.match(/W\d+/i)?.[0];
      if (!id) throw new Error('Missing canonical OpenAlex work identifier');
      const work = await json(`https://api.openalex.org/works/${id}`);
      if (!String(work.id || '').endsWith(id)) throw new Error('Canonical OpenAlex identifier mismatch');
      const mismatch = compare(d, String(work.title || ''), work.publication_year ?? null, rebuildAbstract(work.abstract_inverted_index));
      if (mismatch) return { ...d, sourceVerification: 'metadata_mismatch', sourceVerificationDetail: mismatch };
      return {
        ...d,
        url: work.doi || work.id || d.url,
        sourceVerification: 'verified_metadata',
        sourceVerificationDetail: 'OpenAlex canonical ID, title, year and abstract text matched; scientific claims remain unverified',
      };
    }

    const id = d.providerId?.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/)?.[1]
      || d.url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i)?.[1]
      || '';
    if (!/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(id)) throw new Error('Invalid or missing arXiv identifier');
    const body = await xml(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
    const entry = body.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1];
    if (!entry) throw new Error('No canonical arXiv record returned');
    const title = xmlTag(entry, 'title');
    const yearText = xmlTag(entry, 'published').slice(0, 4);
    const mismatch = compare(d, title, Number(yearText) || null, xmlTag(entry, 'summary'));
    if (mismatch) return { ...d, sourceVerification: 'metadata_mismatch', sourceVerificationDetail: mismatch };
    return {
      ...d,
      url: `https://arxiv.org/abs/${id}`,
      sourceVerification: 'verified_metadata',
      sourceVerificationDetail: 'arXiv canonical ID, title, year and abstract text matched; scientific claims remain unverified',
    };
  } catch (error) {
    return {
      ...d,
      sourceVerification: 'unverified',
      sourceVerificationDetail: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

export async function verifySourceMetadataBatch(ds: Discovery[], concurrency = 4): Promise<Discovery[]> {
  const out: Discovery[] = new Array(ds.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, ds.length) }, async () => {
    while (next < ds.length) {
      const index = next++;
      out[index] = await verifySourceMetadata(ds[index]);
    }
  }));
  return out;
}
