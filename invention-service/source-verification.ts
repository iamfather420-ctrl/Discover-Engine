import type { Discovery } from './types.js';
const clean = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
async function json(url: string): Promise<any> { const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
async function xml(url: string): Promise<string> { const r = await fetch(url, { signal: AbortSignal.timeout(12000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }
function compare(d: Discovery, title: string, year: number | null): string | null { if (clean(d.title) !== clean(title)) return 'Canonical title mismatch'; if (d.year !== null && year !== null && d.year !== year) return 'Publication year mismatch'; return null; }
/** Confirms bibliographic identity only; it does not validate scientific claims. */
export async function verifySourceMetadata(d: Discovery): Promise<Discovery> {
 try {
  if (d.source === 'openalex') {
   if (!/^[a-z0-9]+$/i.test(d.id)) throw new Error('Invalid OpenAlex identifier');
   const w = await json(`https://api.openalex.org/works/https://openalex.org/${d.id}`);
   const mismatch = compare(d, String(w.title || ''), w.publication_year ?? null);
   if (mismatch) return { ...d, sourceVerification: 'metadata_mismatch', sourceVerificationDetail: mismatch };
   return { ...d, url: w.doi || w.id || d.url, sourceVerification: 'verified_metadata', sourceVerificationDetail: w.doi ? 'OpenAlex canonical record matched; DOI supplied' : 'OpenAlex canonical record title and year matched' };
  }
  const id = d.providerId?.match(/(\\d{4}\\.\\d{4,5}(?:v\\d+)?)/)?.[1] || d.url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i)?.[1] || d.id;
  if (!/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(id)) throw new Error('Invalid arXiv identifier');
  const body = await xml(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  const entry = body.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1]; if (!entry) throw new Error('No canonical arXiv record returned');
  const title = entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const y = entry.match(/<published>(\d{4})-/i)?.[1]; const mismatch = compare(d, title, y ? Number(y) : null);
  if (mismatch) return { ...d, sourceVerification: 'metadata_mismatch', sourceVerificationDetail: mismatch };
  return { ...d, url: `https://arxiv.org/abs/${id}`, sourceVerification: 'verified_metadata', sourceVerificationDetail: 'arXiv canonical record title and year matched' };
 } catch (e) { return { ...d, sourceVerification: 'unverified', sourceVerificationDetail: e instanceof Error ? e.message : 'Verification failed' }; }
}
export async function verifySourceMetadataBatch(ds: Discovery[], concurrency = 4): Promise<Discovery[]> {
 const out: Discovery[] = new Array(ds.length); let next = 0;
 await Promise.all(Array.from({ length: Math.min(concurrency, ds.length) }, async () => { while (next < ds.length) { const i = next++; out[i] = await verifySourceMetadata(ds[i]); } }));
 return out;
}