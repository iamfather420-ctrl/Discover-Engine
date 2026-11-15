import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.js';
import type { Invention, Project } from './types.js';

function makeInvention(overrides: Partial<Invention> = {}): Invention {
  return {
    id: 'design-1',
    title: 'Test design',
    summary: 'A controlled test design',
    hypothesis: 'The design improves the target metric',
    targetMetric: 'performance',
    componentIds: ['a', 'b'],
    componentNames: ['Component A', 'Component B'],
    fields: ['Energy', 'Computer Science'],
    mechanism: ['Mechanism'],
    risks: ['Implementation risk'],
    sourceIds: ['source-1'],
    connectionType: 'unexplored',
    crossDomain: true,
    expectedGain: 18,
    uncertainty: 4,
    complexity: 2,
    maturity: 0.8,
    custom: false,
    experiments: [],
    ...overrides,
  };
}

function makeProject(inventions: Invention[]): Project {
  return {
    id: 'project-1',
    query: 'test query',
    domains: [],
    status: 'ready',
    stage: 'evaluate',
    log: [],
    discoveries: [],
    components: [],
    connections: [],
    inventions,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('evaluation scoring (novelty-free)', () => {
  it('uses only feasibility, impact, evidence and risk weights', () => {
    const report = evaluate(makeProject([makeInvention()]));
    expect(report.weights).toEqual({
      feasibility: 0.3,
      impact: 0.4,
      evidence: 0.3,
      risk: 0.15,
    });
    expect(report.weights).not.toHaveProperty('novelty');
    expect(report.rows[0].overall).toBe(5.9);
  });

  it('does not change a score just because a connection is labelled unexplored', () => {
    const unexplored = makeInvention({ connectionType: 'unexplored' });
    const established = makeInvention({ connectionType: 'established' });
    const report = evaluate(makeProject([unexplored, established]));
    const scores = report.rows.filter((row) => !row.isBaseline).map((row) => row.overall);
    expect(scores).toEqual([scores[0], scores[0]]);
  });

  it('subtracts the risk penalty from the weighted score', () => {
    const lowRisk = makeInvention({ id: 'low-risk', uncertainty: 1, complexity: 2 });
    const highRisk = makeInvention({ id: 'high-risk', uncertainty: 8, complexity: 2 });
    const report = evaluate(makeProject([lowRisk, highRisk]));
    const rows = Object.fromEntries(report.rows.map((row) => [row.id, row]));
    expect(rows['low-risk'].overall).toBeGreaterThan(rows['high-risk'].overall);
  });

  it('does not let the connection discovery label appear in evaluation rows', () => {
    const report = evaluate(makeProject([makeInvention()]));
    const designRow = report.rows.find((row) => !row.isBaseline)!;
    expect(designRow).not.toHaveProperty('novelty');
    expect(designRow).not.toHaveProperty('connectionType');
  });
});
