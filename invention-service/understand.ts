import type { ComponentKind, Discovery, TechComponent } from './types.js';
import { candidatePhrases, sentences, shortId, titleCase, tokenize } from './text-utils.js';

const KIND_RULES: [ComponentKind, RegExp][] = [
  ['algorithm', /(algorithm|network|learning|optimi[sz]ation|neural|transformer|reinforcement|search|regression|inference|solver|estimation|filter|kalman|bayesian|genetic|gradient|clustering|classifier|encoder|decoder|diffusion model)/],
  ['material', /(electrolyte|graphene|polymer|alloy|oxide|ceramic|composite|perovskite|nanoparticle|nanowire|crystal|film|coating|silicon|carbon|lithium|sodium|metal|hydrogel|membrane|fiber|fibre|material|nitride|sulfide|cathode|anode)/],
  ['device', /(sensor|actuator|transistor|battery|cell|circuit|antenna|robot|motor|engine|chip|device|laser|detector|reactor|turbine|array|module|electrode|battery pack|converter|inverter)/],
  ['method', /(fabrication|synthesis|deposition|printing|manufacturing|process|technique|control|modeling|modelling|simulation|dynamics|characterization|spectroscopy|imaging|measurement|testing|assembly|design|doping|annealing|etching|lithography|calibration|osmosis|distillation|deionization|evaporation|electrodialysis|catalysis|crystallization|filtration|adsorption)/],
];

/** Phrases describing goals, problems or metrics rather than buildable components. */
const NON_COMPONENT = /\b(scarcity|crisis|challenge|challenges|future|review|technology|technologies|treatment|purification|consumption|flux|rejection|permeability|efficiency|density|conductivity|performance|capacity|stability|lifetime|cost|costs|safety|demand|issue|issues|problem|problems|need|needs|field|fields|community|decade|years|commercialization|development|applications?|security|rates?|plants?|processes|water|sources?|resources?|strategies|strategy|materials science)$|^(sustainable|renewable|future|recent|current|conventional|traditional|saline|brackish|global)\b/;

/** Crude singularizer so "batteries" matches "battery". */
function stem(word: string): string {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Guess what kind of building block a phrase represents. */
export function classify(phrase: string): ComponentKind {
  for (const [kind, rule] of KIND_RULES) if (rule.test(phrase)) return kind;
  return 'concept';
}

/**
 * Run the Understand stage: decompose discoveries into reusable technical components
 * by finding the multi-word technical phrases that recur across independent sources.
 * @param discoveries - output of the Discover stage
 * @param query - the core query (its own words are excluded, they are the problem not a component)
 * @param max - number of components to keep
 */
export function understand(discoveries: Discovery[], query: string, max = 28): TechComponent[] {
  const queryTokens = new Set(tokenize(query).flatMap((t) => t.split('-')).map(stem));
  const isQueryWord = (w: string) => w.split('-').every((part) => queryTokens.has(stem(part)));
  const docFreq = new Map<string, Set<string>>();

  for (const d of discoveries) {
    const phrases = new Set([...candidatePhrases(`${d.title}. ${d.abstract}`), ...d.keywords.filter((k) => k.includes(' '))]);
    for (const p of phrases) {
      const words = p.split(' ');
      // drop phrases that are just the query restated
      if (words.every(isQueryWord)) continue;
      if (NON_COMPONENT.test(p)) continue;
      if (!docFreq.has(p)) docFreq.set(p, new Set());
      docFreq.get(p)!.add(d.id);
    }
  }

  // score: document frequency, bonus for 3-grams and keyword-backed phrases
  const keywordSet = new Set(discoveries.flatMap((d) => d.keywords));
  const scored = [...docFreq.entries()]
    .filter(([, ids]) => ids.size >= 2)
    .map(([phrase, ids]) => ({
      phrase,
      ids,
      score: ids.size * (phrase.split(' ').length === 3 ? 1.15 : 1) * (keywordSet.has(phrase) ? 1.5 : 1),
    }))
    .sort((a, b) => b.score - a.score);

  // remove phrases subsumed by a stronger, longer/shorter overlapping phrase
  const chosen: typeof scored = [];
  for (const cand of scored) {
    const overlaps = chosen.some((c) => c.phrase.includes(cand.phrase) || cand.phrase.includes(c.phrase));
    if (!overlaps) chosen.push(cand);
    if (chosen.length >= max) break;
  }

  // fall back to single keywords if sources were sparse
  if (chosen.length < 6) {
    for (const kw of keywordSet) {
      if (chosen.length >= 12) break;
      if (chosen.some((c) => c.phrase === kw) || kw.split(' ').every(isQueryWord)) continue;
      const ids = new Set(discoveries.filter((d) => d.keywords.includes(kw)).map((d) => d.id));
      chosen.push({ phrase: kw, ids, score: ids.size });
    }
  }

  const byId = new Map(discoveries.map((d) => [d.id, d]));
  return chosen.map(({ phrase, ids }) => {
    const sources = [...ids].map((id) => byId.get(id)!).filter(Boolean);
    const context =
      sources
        .flatMap((s) => sentences(s.abstract))
        .find((s) => s.toLowerCase().includes(phrase.split(' ')[0]) && s.length < 320) || '';
    return {
      id: shortId(phrase),
      name: titleCase(phrase),
      kind: classify(phrase),
      fields: [...new Set(sources.map((s) => s.field))],
      sourceIds: [...ids],
      mentions: ids.size,
      context,
    };
  });
}
