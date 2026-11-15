import type { Evaluation, EvaluationRow, Project } from './types.js';
import { clamp } from './text-utils.js';

/** Weights for the overall score. Risk is subtracted. */
export const WEIGHTS = { novelty: 0.25, feasibility: 0.25, impact: 0.3, evidence: 0.2, risk: 0.15 };

/**
 * Run the Evaluate stage: score every invention against the current best practice baseline
 * on novelty, feasibility, impact, evidence and risk (0–10), using experiment results when present.
 * Also lists the quantitative benchmarks extracted from the literature.
 * @param project - project with inventions
 */
export function evaluate(project: Project): Evaluation {
  const baseline: EvaluationRow = {
    id: 'baseline',
    title: `Current best practice (${project.query})`,
    isBaseline: true,
    novelty: 0,
    feasibility: 10,
    impact: 0,
    evidence: 10,
    risk: 1,
    overall: 0,
  };
  baseline.overall = score(baseline);

  const rows = project.inventions.map((inv): EvaluationRow => {
    const last = inv.experiments[inv.experiments.length - 1];
    const novelty = inv.connectionType === 'unexplored' ? 9 : inv.connectionType === 'emerging' ? 6.5 : 3.5;
    const feasibility = clamp(10 - inv.complexity * 1.4 - (1 - inv.maturity) * 2.5, 1, 10);
    const gain = last ? last.meanImprovement : inv.expectedGain;
    const impact = clamp(gain / 3, 0, 10);
    const evidence = clamp(inv.maturity * 7 + (last ? last.probBetter * 3 : 0), 0, 10);
    const risk = clamp(last ? (1 - last.probBetter) * 10 : (inv.uncertainty / Math.max(1, inv.expectedGain)) * 6, 0, 10);
    const row: EvaluationRow = {
      id: inv.id,
      title: inv.title,
      isBaseline: false,
      novelty: round(novelty + (inv.crossDomain ? 1 : 0)),
      feasibility: round(feasibility),
      impact: round(impact),
      evidence: round(evidence),
      risk: round(risk),
      overall: 0,
      experimentVerdict: last?.verdict,
    };
    row.novelty = Math.min(10, row.novelty);
    row.overall = score(row);
    return row;
  });

  const benchmarks = project.discoveries
    .filter((d) => d.lens === 'core')
    .flatMap((d) => d.metrics.map((claim) => ({ claim, source: d.title, url: d.url })))
    .slice(0, 12);

  return { rows: [baseline, ...rows.sort((a, b) => b.overall - a.overall)], benchmarks, weights: WEIGHTS };
}

function score(r: Pick<EvaluationRow, 'novelty' | 'feasibility' | 'impact' | 'evidence' | 'risk'>): number {
  return round(
    r.novelty * WEIGHTS.novelty + r.feasibility * WEIGHTS.feasibility + r.impact * WEIGHTS.impact + r.evidence * WEIGHTS.evidence - r.risk * WEIGHTS.risk,
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
