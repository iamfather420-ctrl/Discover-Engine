/** Common English and academic filler words ignored during phrase extraction. */
export const STOPWORDS = new Set(
  (
    'a an the and or but if of in on at to for from by with without within into onto over under about as is are was were be been being ' +
    'this that these those it its their there here which who whom whose what when where why how than then so such can could may might ' +
    'will would should shall must do does did done has have had having not no nor only also very more most less least much many ' +
    'we our us they them he she his her you your i me my one two three new novel using use used based via between among both each ' +
    'other another some any all several various different same well high low large small paper study work results result show shows ' +
    'shown present presents propose proposed approach approaches method methods analysis performance model models system systems ' +
    'data effect effects due while however therefore thus further first second recent recently significant significantly important ' +
    'potential provide provides including include includes demonstrate demonstrated investigated investigate obtained found compared ' +
    'respectively achieve achieved achieves state art abstract article review applications application paper research overall key ' +
    'make makes made allow allows enable enables enabled improved improve improves improvement increase increased reduce reduced ' +
    'typical typically per et al e g ie eg up down out around across after before during against toward towards along'
  ).split(/\s+/),
);

/** Lowercase, strip punctuation and split into tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
}

/** Split text into sentences. */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract candidate noun-like phrases (2–3 words, no stopwords at edges).
 * @param text - source text
 * @returns lowercased phrases
 */
export function candidatePhrases(text: string): string[] {
  const out: string[] = [];
  for (const sentence of sentences(text)) {
    const tokens = tokenize(sentence);
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const gram = tokens.slice(i, i + n);
        if (gram.some((t) => STOPWORDS.has(t))) continue;
        if (gram.some((t) => t.length < 3)) continue;
        out.push(gram.join(' '));
      }
    }
  }
  return out;
}

/**
 * Pull quantitative claims (e.g. "efficiency of 23.4%", "3x faster") out of text.
 * @param text - abstract text
 * @returns up to 4 short claim snippets
 */
export function extractMetrics(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ');
  const pattern =
    /[^.;,]{0,60}?\b\d+(?:\.\d+)?\s?(?:%|percent|x|×|-fold|fold|times|mah\/g|wh\/kg|w\/kg|mw|kw|gw|ms|µs|us|ns|hz|khz|mhz|ghz|db|nm|µm|mm|ev|mev|k\b|°c|kpa|mpa|gpa|tops|flops|fps)[^.;,]{0,40}/gi;
  const matches = clean.match(pattern) || [];
  return matches
    .map((m) => m.trim())
    .filter((m) => m.length > 8)
    .slice(0, 4);
}

/** Simple string hash, used for deterministic ids and seeds. */
export function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Short deterministic id. */
export function shortId(input: string): string {
  return hash(input).toString(36);
}

/** Title-case a phrase. */
export function titleCase(phrase: string): string {
  return phrase
    .split(' ')
    .map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) && w !== 'gan' ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/** Seeded pseudo-random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number into [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
