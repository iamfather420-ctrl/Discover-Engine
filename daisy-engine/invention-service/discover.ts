import type { Discovery } from './types.js';
import { extractMetrics, shortId } from './text-utils.js';

/** Adjacent lenses used when the user does not provide any — deliberately far from typical engineering silos. */
export const DEFAULT_LENSES = ['bio-inspired', 'machine learning', 'metamaterial', 'control theory'];

const UA = 'DaisyInventionEngine/1.0 (research prototype)';

async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } });
  } finally {
    clearTimeout(timer);
  }
}

function rebuildAbstract(index?: Record<string, number[]> | null): string {
  if (!index) return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const p of positions) words[p] = word;
  }
  return words.filter(Boolean).join(' ').replace(/^abstract[:.\s]+/i, '');
}

/**
 * Search OpenAlex (250M+ papers, patents-adjacent literature) for works.
 * @param query - search terms
 * @param lens - label of the lens this search represents
 * @param limit - max results
 */
export async function searchOpenAlex(query: string, lens: string, limit = 8): Promise<Discovery[]> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}` +
    `&filter=has_abstract:true,from_publication_date:2015-01-01` +
    `&select=id,title,publication_year,keywords,topics,doi,abstract_inverted_index,cited_by_count,type&mailto=daisy@bit.cloud`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`OpenAlex responded ${res.status}`);
  const json: any = await res.json();
  return (json.results || [])
    .filter((w: any) => w.title)
    .map((w: any): Discovery => {
      const abstract = rebuildAbstract(w.abstract_inverted_index);
      return {
        id: shortId(w.id),
        source: 'openalex',
        title: w.title,
        abstract,
        year: w.publication_year ?? null,
        url: w.doi || w.id,
        field: w.topics?.[0]?.subfield?.display_name || w.topics?.[0]?.field?.display_name || 'General',
        lens,
        keywords: (w.keywords || []).map((k: any) => String(k.display_name).toLowerCase()),
        metrics: extractMetrics(abstract),
        citations: w.cited_by_count || 0,
        type: w.type || 'article',
      };
    });
}

function xmlTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

const ARXIV_FIELDS: Record<string, string> = {
  cs: 'Computer Science',
  physics: 'Physics',
  'cond-mat': 'Condensed Matter',
  'quant-ph': 'Quantum Physics',
  eess: 'Electrical Engineering & Systems',
  math: 'Mathematics',
  'q-bio': 'Quantitative Biology',
  stat: 'Statistics',
  astro: 'Astrophysics',
};

/**
 * Search arXiv preprints — the freshest algorithms and engineering approaches.
 * @param query - search terms
 * @param lens - label of the lens this search represents
 * @param limit - max results
 */
export async function searchArxiv(query: string, lens: string, limit = 6): Promise<Discovery[]> {
  const terms = query.split(/\s+/).filter(Boolean).map((t) => `all:${encodeURIComponent(t)}`).join('+AND+');
  const url = `https://export.arxiv.org/api/query?search_query=${terms}&max_results=${limit}&sortBy=relevance`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`arXiv responded ${res.status}`);
  const xml = await res.text();
  const entries = xml.split('<entry>').slice(1);
  return entries.map((entry): Discovery => {
    const id = xmlTag(entry, 'id');
    const abstract = xmlTag(entry, 'summary');
    const cat = (entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/) || [])[1] || '';
    const prefix = cat.split('.')[0].replace(/-ph$/, '') ;
    return {
      id: shortId(id),
      source: 'arxiv',
      title: xmlTag(entry, 'title'),
      abstract,
      year: Number(xmlTag(entry, 'published').slice(0, 4)) || null,
      url: id.replace('http://', 'https://'),
      field: ARXIV_FIELDS[prefix] || ARXIV_FIELDS[cat.split('.')[0]] || cat || 'Preprint',
      lens,
      keywords: [],
      metrics: extractMetrics(abstract),
      citations: 0,
      type: 'preprint',
    };
  });
}

/**
 * Run the Discover stage: the core query plus each adjacent-domain lens, across sources.
 * Individual source failures are tolerated and reported through `log`.
 * @param query - core problem / technology
 * @param domains - adjacent domains to cross-pollinate from
 * @param log - progress logger
 */
export async function discover(query: string, domains: string[], log: (m: string) => void): Promise<Discovery[]> {
  const lenses = [{ lens: 'core', q: query }, ...domains.map((d) => ({ lens: d, q: `${query} ${d}` }))];
  const tasks: Promise<Discovery[]>[] = [];
  for (const { lens, q } of lenses) {
    const isCore = lens === 'core';
    tasks.push(
      searchOpenAlex(q, lens, isCore ? 12 : 6).catch((e) => {
        log(`OpenAlex (${lens}) unavailable: ${e.message}`);
        return [];
      }),
    );
    tasks.push(
      searchArxiv(q, lens, isCore ? 8 : 4).catch((e) => {
        log(`arXiv (${lens}) unavailable: ${e.message}`);
        return [];
      }),
    );
  }
  const results = (await Promise.all(tasks)).flat();
  const seen = new Set<string>();
  const unique = results.filter((d) => {
    const key = d.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seen.has(key) || !d.abstract) return false;
    seen.add(key);
    return true;
  });
  log(`Discovered ${unique.length} sources across ${lenses.length} lenses`);
  return unique;
}
