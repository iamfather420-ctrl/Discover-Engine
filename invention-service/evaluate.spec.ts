import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.js';
import type { Invention, Project } from './types.js';

const invention: Invention = {
  id: 'design-1', title: 'Test design', summary: 'Design scaffold',
  hypothesis: 'May affect target; magnitude unknown', targetMetric: 'performance',
  componentIds: ['a','b'], componentNames: ['A','B'], fields: ['Energy'],
  mechanism: ['Mechanism'], risks: ['Risk'], sourceIds: ['source-1'],
  connectionType: 'unexplored', crossDomain: true, expectedGain: null,
  uncertainty: null, complexity: 2, maturity: null, custom: false, experiments: [],
};
const project: Project = {
  id: 'project-1', query: 'test query', domains: [], status: 'ready', stage: 'evaluate',
  log: [], discoveries: [], components: [], connections: [], inventions: [invention],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
describe('evidence-first evaluation (novelty-free)', () => {
  it('does not manufacture scores when measured evidence is absent', () => {
    const report = evaluate(project);
    expect(report.rows).toHaveLength(2);
    expect(report.rows[1]).toMatchObject({
      feasibility: null, impact: null, evidence: null, risk: null,
      overall: null, evidenceStatus: 'hypothesis_only',
    });
    expect(report.weights).toEqual({});
    expect(report.rows[1]).not.toHaveProperty('novelty');
  });
  it('keeps the baseline unscored until a real baseline is measured', () => {
    const baseline = evaluate(project).rows[0];
    expect(baseline.overall).toBeNull();
    expect(baseline.evidenceStatus).toBe('measured_evidence_pending');
  });
});
