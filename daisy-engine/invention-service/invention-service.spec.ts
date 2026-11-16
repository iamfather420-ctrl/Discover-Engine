import { understand } from './understand.js';
import { connect } from './connect.js';
import { invent } from './invent.js';
import { runExperiment } from './experiment.js';
import type { Discovery } from './types.js';

const doc = (id: string, lens: string, field: string, abstract: string): Discovery => ({
  id,
  source: 'openalex',
  title: id,
  abstract,
  year: 2024,
  url: '',
  field,
  lens,
  keywords: [],
  metrics: [],
  citations: 0,
  type: 'article',
});

const discoveries = [
  doc('a', 'core', 'Energy', 'Solid electrolyte interfaces limit ionic conductivity. Graphene oxide coating improves stability.'),
  doc('b', 'core', 'Energy', 'Solid electrolyte interfaces degrade. Thermal management model predicts failure.'),
  doc('c', 'machine learning', 'Computer Science', 'Reinforcement learning controller tunes thermal management online.'),
  doc('d', 'machine learning', 'Computer Science', 'Reinforcement learning controller with graphene oxide coating sensors.'),
];

describe('invention pipeline', () => {
  it('extracts recurring components, connects them and invents designs', () => {
    const components = understand(discoveries, 'battery');
    expect(components.map((c) => c.name.toLowerCase())).toContain('solid electrolyte interfaces');
    const extracted = components.find((c) => c.name.toLowerCase() === 'solid electrolyte interfaces')!;
    expect(extracted.context).toContain('Solid electrolyte interfaces');
    expect(extracted.contextSourceId).toBeTruthy();
    expect(extracted.sourceIds).toContain(extracted.contextSourceId);
    const connections = connect(components, discoveries);
    expect(connections.length).toBeGreaterThan(0);
    const inventions = invent('battery', components, connections, discoveries);
    expect(inventions.length).toBeGreaterThan(0);
    expect(inventions[0].componentIds.length).toBeGreaterThanOrEqual(2);
  });

  it('runs a reproducible experiment with a verdict', () => {
    const components = understand(discoveries, 'battery');
    const [inv] = invent('battery', components, connect(components, discoveries), discoveries);
    const r1 = runExperiment(inv, { trials: 500, baselineNoise: 3 });
    const r2 = runExperiment(inv, { trials: 500, baselineNoise: 3 });
    expect(r1.meanImprovement).toEqual(r2.meanImprovement);
    expect(['supported', 'inconclusive', 'rejected']).toContain(r1.verdict);
  });
});
