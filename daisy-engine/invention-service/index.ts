export { InventionService } from './invention-service.js';
export { ProjectRepository, connectDb } from './project-repository.js';
export { discover, searchArxiv, searchOpenAlex, DEFAULT_LENSES } from './discover.js';
export { understand, classify } from './understand.js';
export { connect } from './connect.js';
export { invent, inventCustom } from './invent.js';
export { runExperiment } from './experiment.js';
export { verifySourceMetadata, verifySourceMetadataBatch } from './source-verification.js';
export { evaluate, WEIGHTS } from './evaluate.js';
export { buildExportPackage, designSpec } from './export-package.js';
export type {
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
