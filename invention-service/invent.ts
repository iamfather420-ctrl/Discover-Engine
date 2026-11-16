import type { ComponentKind, Connection, Discovery, Invention, TechComponent } from './types.js';
import { clamp, hash, shortId, titleCase } from './text-utils.js';

const ROLE: Record<ComponentKind, string> = {
  algorithm: 'the decision/optimization layer',
  material: 'the physical substrate',
  device: 'the hardware platform',
  method: 'the process route',
  concept: 'the guiding principle',
};

const MECHANISM: Record<ComponentKind, (n: string) => string> = {
  algorithm: (n) => `Use ${n} to adaptively tune operating parameters in closed loop, replacing fixed hand-tuned settings.`,
  material: (n) => `Introduce ${n} as the functional layer where the current design is performance-limited.`,
  device: (n) => `Build around ${n} as the integration platform, exposing measurable inputs and outputs.`,
  method: (n) => `Apply ${n} to fabricate / process the assembly with tighter tolerances.`,
  concept: (n) => `Re-frame the architecture around ${n}, transferring it from its home domain.`,
};

const RISK: Record<ComponentKind, (n: string) => string> = {
  algorithm: (n) => `${n} may overfit to lab conditions and need retraining or robust-control guarantees in the field.`,
  material: (n) => `${n} stability, cost and supply at scale are unproven for this use.`,
  device: (n) => `Interfacing ${n} adds integration losses and packaging complexity.`,
  method: (n) => `${n} may not transfer to production throughput or yield.`,
  concept: (n) => `Translating ${n} across domains may break assumptions that held in its original field.`,
};

const VERBS = ['Adaptive', 'Hybrid', 'Self-Optimizing', 'Hierarchical', 'Coupled', 'Bio-Inspired', 'Programmable', 'Graded'];
const NOUNS = ['Architecture', 'System', 'Platform', 'Stack', 'Framework', 'Module'];

function pick<T>(arr: T[], seed: number): T {
  return arr[(seed >>> 0) % arr.length];
}

/** Best metric phrase from the query to anchor the target (e.g. "energy density"). */
function inferTarget(query: string, discoveries: Discovery[]): string {
  const text = discoveries.map((d) => `${d.abstract} ${d.metrics.join(' ')}`).join(' ').toLowerCase();
  const candidates = ['efficiency', 'energy density', 'accuracy', 'latency', 'throughput', 'ionic conductivity', 'conductivity', 'cost', 'lifetime', 'cycle life', 'power density', 'sensitivity', 'yield', 'capacity', 'speed', 'stability', 'resolution', 'energy consumption', 'selectivity'];
  const count = (c: string) => text.split(c).length - 1;
  const found = candidates.filter((c) => count(c) > 0).sort((a, b) => count(b) - count(a))[0];
  return found ? `${found} of ${query}` : `key performance metric of ${query}`;
}

function buildInvention(
  query: string,
  parts: TechComponent[],
  conn: Pick<Connection, 'type' | 'crossDomain'>,
  target: string,
  custom: boolean,
): Invention {
  const seed = hash(parts.map((p) => p.id).join('|'));
  const names = parts.map((p) => p.name);
  const fields = [...new Set(parts.flatMap((p) => p.fields))];
  // Source mention counts and connection labels are not performance evidence.
  // Do not synthesize gains, uncertainty, or evidence maturity.
  const complexity = clamp(parts.length + (conn.crossDomain ? 1 : 0), 1, 5);

  const title = `${pick(VERBS, seed)} ${names[0]} × ${names[1]} ${pick(NOUNS, seed >>> 3)}`;
  const roles = parts.map((p) => `${p.name} as ${ROLE[p.kind]}`).join(', ');

  return {
    id: shortId(title + query + (custom ? 'c' : '')),
    title,
    summary: `A ${query} design that combines ${roles}. ${
      'This is a proposed combination assembled from literature-derived components; the combined design has not been validated.'
    }`,
    hypothesis: `Integrating ${names.join(' with ')} may affect the ${target}. Direction and magnitude of any effect are unknown and require controlled measurement.`,
    targetMetric: target,
    componentIds: parts.map((p) => p.id),
    componentNames: names,
    fields,
    mechanism: [
      ...parts.map((p) => MECHANISM[p.kind](p.name)),
      `Couple the parts through a shared interface and instrument it so the ${target} can be measured against the baseline.`,
    ],
    risks: parts.map((p) => RISK[p.kind](p.name)),
    sourceIds: [...new Set(parts.flatMap((p) => p.sourceIds))],
    connectionType: conn.type,
    crossDomain: conn.crossDomain,
    expectedGain: null,
    uncertainty: null,
    complexity,
    maturity: null,
    custom,
    experiments: [],
  };
}

/**
 * Run the Invent stage: turn the strongest connections into concrete engineering designs.
 * Each design pairs two connected components and, where helpful, adds a third "enabler"
 * that bridges both (a component co-occurring with each).
 * @param query - core problem
 * @param components - Understand output
 * @param connections - Connect output
 * @param discoveries - Discover output
 * @param max - number of inventions
 */
export function invent(
  query: string,
  components: TechComponent[],
  connections: Connection[],
  discoveries: Discovery[],
  max = 6,
): Invention[] {
  const byId = new Map(components.map((c) => [c.id, c]));
  const target = inferTarget(query, discoveries);
  const used = new Set<string>();
  const out: Invention[] = [];

  // each component may anchor at most 2 designs so one popular hub doesn't dominate
  const usage = new Map<string, number>();
  const uses = (id: string) => usage.get(id) || 0;
  const bump = (id: string) => usage.set(id, uses(id) + 1);
  // prefer pairs where at least one side is a concrete (non-concept) component
  const ranked = [...connections].sort((x, y) => {
    const concrete = (c: Connection) => [c.aId, c.bId].filter((id) => byId.get(id)?.kind !== 'concept').length;
    return concrete(y) * 0.08 + y.score - (concrete(x) * 0.08 + x.score);
  });

  for (const conn of ranked) {
    if (out.length >= max) break;
    if (uses(conn.aId) >= 2 || uses(conn.bId) >= 2) continue;
    if (uses(conn.aId) >= 1 && uses(conn.bId) >= 1) continue;
    const a = byId.get(conn.aId)!;
    const b = byId.get(conn.bId)!;
    const enabler = components.find(
      (c) =>
        c.id !== a.id &&
        c.id !== b.id &&
        uses(c.id) === 0 &&
        c.kind !== a.kind &&
        c.kind !== b.kind &&
        c.sourceIds.some((s) => a.sourceIds.includes(s)) &&
        c.sourceIds.some((s) => b.sourceIds.includes(s)),
    );
    const parts = enabler ? [a, b, enabler] : [a, b];
    out.push(buildInvention(query, parts, conn, target, false));
    parts.forEach((p) => bump(p.id));
  }
  return out;
}

/**
 * Generate a design from a user-chosen set of components.
 * @param query - core problem
 * @param parts - 2–4 selected components
 * @param connections - known connections (to determine novelty)
 * @param discoveries - Discover output
 */
export function inventCustom(query: string, parts: TechComponent[], connections: Connection[], discoveries: Discovery[]): Invention {
  const ids = new Set(parts.map((p) => p.id));
  const shared = parts.every((p, i) => i === 0 || p.sourceIds.some((s) => parts[0].sourceIds.includes(s)));
  const known = connections.find((c) => ids.has(c.aId) && ids.has(c.bId));
  const conn = known || { type: shared ? 'emerging' : 'unexplored', crossDomain: new Set(parts.map((p) => p.kind)).size > 1 };
  const inv = buildInvention(query, parts, conn as Connection, inferTarget(query, discoveries), true);
  inv.title = `Custom: ${titleCase(inv.title)}`;
  return inv;
}
