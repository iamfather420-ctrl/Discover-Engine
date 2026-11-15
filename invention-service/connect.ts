import type { Connection, ConnectionType, Discovery, TechComponent } from './types.js';

/**
 * Run the Connect stage. For every pair of components we measure:
 * - co-occurrence: how often they already appear together (Jaccard over sources)
 * - bridge strength: shared neighbours, i.e. indirect evidence the pair is compatible
 * - domain distance: whether they come from different fields / research lenses
 * The most valuable pairs are compatible (bridged) yet rarely studied together, across domains.
 * @param components - output of the Understand stage
 * @param discoveries - output of the Discover stage (for lens/field lookup)
 * @param max - number of connections to keep
 */
export function connect(components: TechComponent[], discoveries: Discovery[], max = 24): Connection[] {
  const lensOf = new Map(discoveries.map((d) => [d.id, d.lens]));
  const lensesFor = (c: TechComponent) => new Set(c.sourceIds.map((id) => lensOf.get(id) || 'core'));

  const neighbours = new Map<string, Set<string>>();
  for (const a of components) {
    neighbours.set(a.id, new Set());
    for (const b of components) {
      if (a.id !== b.id && a.sourceIds.some((s) => b.sourceIds.includes(s))) neighbours.get(a.id)!.add(b.id);
    }
  }

  const out: Connection[] = [];
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i];
      const b = components[j];
      const shared = a.sourceIds.filter((s) => b.sourceIds.includes(s)).length;
      const union = new Set([...a.sourceIds, ...b.sourceIds]).size;
      const jaccard = shared / union;

      const na = neighbours.get(a.id)!;
      const nb = neighbours.get(b.id)!;
      const sharedNeighbours = [...na].filter((x) => nb.has(x)).length;
      const bridge = Math.min(1, sharedNeighbours / 3);

      const la = lensesFor(a);
      const lb = lensesFor(b);
      const lensOverlap = [...la].filter((x) => lb.has(x)).length / Math.max(1, Math.min(la.size, lb.size));
      const fieldOverlap = a.fields.filter((f) => b.fields.includes(f)).length / Math.max(1, Math.min(a.fields.length, b.fields.length));
      const distance = 1 - (lensOverlap + fieldOverlap) / 2;
      const crossDomain = distance >= 0.5 || a.kind !== b.kind;

      const strength = Math.min(1, (a.mentions + b.mentions) / 10);
      const novelty = 1 - jaccard;
      const score = novelty * 0.4 + distance * 0.25 + bridge * 0.2 + strength * 0.15 + (a.kind !== b.kind ? 0.05 : 0);

      const type: ConnectionType = shared === 0 ? 'unexplored' : jaccard < 0.34 ? 'emerging' : 'established';
      const rationale =
        type === 'unexplored'
          ? `Never studied together in ${union} sources, but ${sharedNeighbours} shared neighbouring concepts suggest compatibility.`
          : type === 'emerging'
            ? `Appear together in only ${shared} of ${union} sources — an early, under-explored combination.`
            : `Frequently combined (${shared}/${union} sources) — a proven pairing to build on.`;

      out.push({
        id: `${a.id}-${b.id}`,
        aId: a.id,
        bId: b.id,
        aName: a.name,
        bName: b.name,
        score: Math.round(score * 100) / 100,
        type,
        crossDomain,
        rationale,
      });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, max);
}
