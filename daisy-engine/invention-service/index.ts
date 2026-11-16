export { InventionService } from './invention-service.js';
export { ProjectRepository, connectDb } from './project-repository.js';
export { discover, searchArxiv, searchOpenAlex, DEFAULT_LENSES } from './discover.js';
export { understand, classify } from './understand.js';
export { connect } from './connect.js';
export { invent, inventCustom } from './invent.js';
export { runExperiment } from './experiment.js';
export { extractEvidenceClaims, validateClaimPassage } from './claim-evidence.js';
export { evaluate, WEIGHTS } from './evaluate.js';
export { buildExportPackage, designSpec } from './export-package.js';
export type {
  EvidenceClaim,
  ClaimKind,
  ClaimReviewStatus,
  Discovery,
  DiscoverySource,
  TechComponent,
  ComponentKind,
  Connection,
  ConnectionType,
  Invention,
  ExperimentParams,
  ExperimentResult,
  Project,
  ProjectStatus,
  Evaluation,
  EvaluationRow,
} from './types.js';
export { createMeasurementRecord, validateMeasurementInput } from './measurement-evidence.js';
export type { MeasurementRecord, MeasurementInput, MeasurementStatus } from './measurement-evidence.js';
