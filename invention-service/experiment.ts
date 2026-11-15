import type { ExperimentParams, ExperimentResult, Invention } from './types.js';
import { hash, seededRandom } from './text-utils.js';

/** Standard normal sample via Box–Muller. */
function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Run an isolated Monte Carlo prototype of an invention against the baseline.
 * Each trial samples: the true design gain (expected ± uncertainty), an integration-loss
 * penalty that grows with complexity, a maturity-driven failure chance, and baseline noise.
 * The hypothesis is "supported" when the design beats baseline in ≥70% of trials and the
 * 5th percentile is not catastrophic; "rejected" when it wins in <40%.
 * @param inv - the invention to test
 * @param params - trials and baseline noise
 * @param runIndex - used to vary the seed between repeated runs
 */
export function runExperiment(inv: Invention, params: ExperimentParams, runIndex = 0): ExperimentResult {
  const trials = Math.max(100, Math.min(20000, Math.round(params.trials)));
  const rand = seededRandom(hash(inv.id) + runIndex * 7919);
  const failureChance = (1 - inv.maturity) * 0.12 + (inv.complexity - 1) * 0.02;
  const integrationLoss = inv.complexity * 1.2;

  const samples: number[] = [];
  for (let i = 0; i < trials; i++) {
    if (rand() < failureChance) {
      samples.push(-Math.abs(normal(rand)) * 10 - 5); // prototype fails to integrate
      continue;
    }
    const gain = inv.expectedGain + normal(rand) * inv.uncertainty;
    const loss = Math.abs(normal(rand)) * integrationLoss;
    const baselineDrift = normal(rand) * params.baselineNoise;
    samples.push(gain - loss - baselineDrift);
  }
  samples.sort((a, b) => a - b);

  const mean = samples.reduce((s, x) => s + x, 0) / trials;
  const std = Math.sqrt(samples.reduce((s, x) => s + (x - mean) ** 2, 0) / trials);
  const pct = (p: number) => samples[Math.floor(p * (trials - 1))];
  const probBetter = samples.filter((x) => x > 0).length / trials;
  const probHitsTarget = samples.filter((x) => x >= inv.expectedGain * 0.8).length / trials;

  const lo = Math.floor(samples[0]);
  const hi = Math.ceil(samples[trials - 1]);
  const bins = 16;
  const width = Math.max(0.5, (hi - lo) / bins);
  const histogram = Array.from({ length: bins }, (_, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 }));
  for (const x of samples) histogram[Math.min(bins - 1, Math.floor((x - lo) / width))].count++;

  const verdict = probBetter >= 0.7 && pct(0.05) > -15 ? 'supported' : probBetter < 0.4 ? 'rejected' : 'inconclusive';
  const r = (n: number) => Math.round(n * 100) / 100;

  return {
    id: `${inv.id}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    params: { trials, baselineNoise: params.baselineNoise },
    meanImprovement: r(mean),
    stdDev: r(std),
    p5: r(pct(0.05)),
    p95: r(pct(0.95)),
    probBetter: r(probBetter),
    probHitsTarget: r(probHitsTarget),
    histogram: histogram.map((h) => ({ from: r(h.from), to: r(h.to), count: h.count })),
    verdict,
  };
}
