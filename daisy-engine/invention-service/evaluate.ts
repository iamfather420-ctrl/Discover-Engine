import type { Evaluation, EvaluationRow, Project } from './types.js';

/** No numeric ranking is defensible without measured performance and traceable evidence. */
export const WEIGHTS = {};

export function evaluate(project: Project): Evaluation {
  const baseline: EvaluationRow = {
    id: 'baseline',
    title: `Current best practice (${project.query}) — baseline not measured`,
    isBaseline: true,
    feasibility: null,
    impact: null,
    evidence: null,
    risk: null,
    overall: null,
    evidenceStatus: 'measured_evidence_pending',
  };
  const rows = project.inventions.map((inv): EvaluationRow => ({
    id: inv.id,
    title: inv.title,
    isBaseline: false,
    feasibility: null,
    impact: null,
    evidence: null,
    risk: null,
    overall: null,
    evidenceStatus: 'hypothesis_only',
  }));
  const benchmarks = project.discoveries
    .filter((d) => d.lens === 'core' && d.sourceVerification === 'verified_metadata')
    .flatMap((d) => d.metrics.map((claim) => ({ claim: `UNVERIFIED ABSTRACT EXTRACT: ${claim}`, source: d.title, url: d.url })))
    .slice(0, 12);
  return { rows: [baseline, ...rows], benchmarks, weights: WEIGHTS };
}
