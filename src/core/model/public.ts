export {
  createModel,
  isValidTransform,
  getGroupInstanceIds,
  isGroupProtected,
  rotateVector,
  fromLDrawPoint,
} from "./domain/model";
export { deriveBom, isInstructionCompatible, missingQuantity } from "./domain/queries";
export {
  getPartConnections,
  worldStudSites,
  findStudContacts,
  hasOccupiedStudSpace,
} from "./domain/connections";
export type { StudSite, StudContact } from "./domain/connections";
export { applyCommand, createSession, previewVariant, redo, undo } from "./application/commands";
export {
  diagnosePlacement,
  hasSupportedDiagnosticGeometry,
  DIAGNOSTIC_RULE,
} from "./domain/diagnostics";
export type { PlacementDiagnostic } from "./domain/diagnostics";
export {
  getPlacementCandidates,
  diagnoseModel,
  validatePlacement,
  snapGridTransform,
} from "./domain/placement";
export type { PlacementCandidate, PlacementQuery } from "./domain/placement";
export { getReplacementFeedback } from "./application/selection-commands";
export { previewExperiment, acceptExperiment, modelSignature } from "./application/experiments";
export type { ExperimentPreview, ExperimentImpact } from "./application/experiments";
export {
  parseProject,
  serializeProject,
  PROJECT_SCHEMA_VERSION,
  PROJECT_TEXT_LIMIT,
} from "./application/project-file";
export type {
  BomLine,
  DomainError,
  EditCommand,
  EditingPolicy,
  GridTransform,
  Model,
  ModelSession,
  PartDefinition,
  PartInstance,
  QuarterTurn,
  Result,
  SampleVariant,
  Subassembly,
  VariantPreview,
} from "./domain/types";
