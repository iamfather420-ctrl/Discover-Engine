/** Stage identifiers in pipeline order. */
export type StageKey = 'discover' | 'understand' | 'connect' | 'invent' | 'experiment' | 'evaluate' | 'export';

/** The seven stages of Daisy's invention engine. */
export const STAGES: { key: StageKey; label: string; blurb: string }[] = [
  { key: 'discover', label: 'Discover', blurb: 'Live search across OpenAlex papers and arXiv preprints.' },
  { key: 'understand', label: 'Understand', blurb: 'Break sources into reusable technical components.' },
  { key: 'connect', label: 'Connect', blurb: 'Find cross-domain pairs rarely studied together.' },
  { key: 'invent', label: 'Invent', blurb: 'Generate engineering designs with hypotheses.' },
  { key: 'experiment', label: 'Experiment', blurb: 'Monte Carlo prototypes against the baseline.' },
  { key: 'evaluate', label: 'Evaluate', blurb: 'Score novelty, feasibility, impact and risk.' },
  { key: 'export', label: 'Export', blurb: 'Design specs, prototype code and data as a package.' },
];

const PIPELINE_ORDER = ['discover', 'understand', 'connect', 'invent', 'ready'];

/**
 * Whether a stage's data is available for a backend pipeline stage.
 * @param stage - UI stage
 * @param backendStage - project.stage from the service
 */
export function isStageAvailable(stage: StageKey, backendStage: string): boolean {
  const done = PIPELINE_ORDER.indexOf(backendStage);
  const needs: Record<StageKey, number> = { discover: 1, understand: 2, connect: 3, invent: 4, experiment: 4, evaluate: 4, export: 4 };
  return done >= needs[stage];
}
