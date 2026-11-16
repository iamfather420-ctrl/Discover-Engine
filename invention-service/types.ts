/** Where a discovery came from. */
export type DiscoverySource = 'openalex' | 'arxiv';

/** A research artifact found during the Discover stage. */
export interface Discovery {
  id: string;
  source: DiscoverySource;
  title: string;
  abstract: string;
  year: number | null;
  url: string;
  /** Scientific field (e.g. "Electrical and Electronic Engineering"). */
  field: string;
  /** The search lens that surfaced it (core query or an adjacent domain). */
  lens: string;
  keywords: string[];
  /** Quantitative claims extracted from the abstract (benchmarks). */
  metrics: string[];
  citations: number;
  /** Work type, e.g. article, preprint, review. */
  type: string;
}

/** Category of a technical building block. */
export type ComponentKind = 'algorithm' | 'material' | 'device' | 'method' | 'concept';

/** A reusable technical building block extracted in the Understand stage. */
export interface TechComponent {
  id: string;
  name: string;
  kind: ComponentKind;
  fields: string[];
  sourceIds: string[];
  mentions: number;
  /** A sentence from a source that shows the component in context. */
  context: string;
}

/** How well-trodden a relationship is in the literature. */
export type ConnectionType = 'unexplored' | 'emerging' | 'established';

/** A relationship between two components found in the Connect stage. */
export interface Connection {
  id: string;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  score: number;
  type: ConnectionType;
  crossDomain: boolean;
  rationale: string;
}

/** Parameters controlling a simulated experiment. */
export interface ExperimentParams {
  trials: number;
  /** Std-dev (%) of the baseline's run-to-run variation. */
  baselineNoise: number;
}

/** Outcome of a Monte Carlo experiment against the baseline. */
export interface ExperimentResult {
  id: string;
  createdAt: string;
  evidenceClass: 'simulation_only';
  params: ExperimentParams;
  meanImprovement: number;
  stdDev: number;
  p5: number;
  p95: number;
  probBetter: number;
  probHitsTarget: number;
  histogram: { from: number; to: number; count: number }[];
  verdict: 'supported' | 'inconclusive' | 'rejected';
}

/** A generated engineering design from the Invent stage. */
export interface Invention {
  id: string;
  title: string;
  summary: string;
  hypothesis: string;
  targetMetric: string;
  componentIds: string[];
  componentNames: string[];
  fields: string[];
  mechanism: string[];
  risks: string[];
  sourceIds: string[];
  connectionType: ConnectionType;
  crossDomain: boolean;
  /** No performance gain is asserted until supported by measurements. */
  expectedGain: null;
  /** No uncertainty estimate is asserted without measured data. */
  uncertainty: null;
  /** 1 (simple) – 5 (very complex). */
  complexity: number;
  /** No numeric evidence maturity is inferred from source counts. */
  maturity: null;
  custom: boolean;
  experiments: ExperimentResult[];
}

/** Pipeline lifecycle status. */
export type ProjectStatus = 'running' | 'ready' | 'error';

/** A research project that flows through all seven stages. */
export interface Project {
  id: string;
  query: string;
  domains: string[];
  status: ProjectStatus;
  stage: string;
  error?: string;
  log: string[];
  discoveries: Discovery[];
  components: TechComponent[];
  connections: Connection[];
  inventions: Invention[];
  createdAt: string;
  updatedAt: string;
}

/** Scored comparison entry in the Evaluate stage. */
export interface EvaluationRow {
  id: string;
  title: string;
  isBaseline: boolean;
  feasibility: number | null;
  impact: number | null;
  evidence: number | null;
  risk: number | null;
  overall: number | null;
  evidenceStatus: 'hypothesis_only' | 'measured_evidence_pending';
  experimentVerdict?: string;
}

/** Full evaluation report. */
export interface Evaluation {
  rows: EvaluationRow[];
  benchmarks: { claim: string; source: string; url: string }[];
  weights: Record<string, number>;
}
