export {
  createModel,
  isValidTransform,
  getGroupInstanceIds,
  isGroupProtected,
  rotateVector,
  fromLDrawPoint,
} from "./domain/model";
export {
  STUD_PITCH_CM,
  studsToCentimeters,
  centimetersToStuds,
  formatCentimeters,
} from "./domain/units";
export {
  deriveBom,
  getSelectionBounds,
  isInstructionCompatible,
  missingQuantity,
} from "./domain/queries";
export {
  getPartConnections,
  worldStudSites,
  findStudContacts,
  hasOccupiedStudSpace,
} from "./domain/connections";
export type { StudSite, StudContact } from "./domain/connections";
export { generateBuildPlan, getBuildLayers, isBuildPlanCurrent } from "./domain/build-plan";
export type { BuildLayer, DraftBuildPlan, DraftBuildStep } from "./domain/build-plan";
export { applyBuildPlanEdit } from "./domain/build-plan-editing";
export {
  createBuildPlanSession,
  editBuildPlan,
  undoBuildPlan,
  redoBuildPlan,
} from "./application/build-plan-commands";
export type { BuildPlanEdit } from "./domain/build-plan-editing";
export type { BuildPlanSession } from "./application/build-plan-commands";
export {
  getReceivingSlopeProfile,
  framedDoorMaterial,
  NOMINAL_SIDE_CLEARANCE,
  NOMINAL_VERTICAL_CLEARANCE,
} from "./domain/nominal-geometry";
export { assessAttachments } from "./domain/attachment-status";
export { createArchitecturePreview } from "./application/architecture-preview";
export type { ArchitecturePreview } from "./application/architecture-preview";
export type { ArchitectureRequest, ArchitectureSection } from "./domain/architecture-layout";
export type {
  AttachmentStatus,
  InstanceAttachment,
  AttachmentAssessment,
} from "./domain/attachment-status";
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
export {
  encodeProjectSnapshot,
  parseProjectSnapshot,
  INSTRUCTION_MEMBERSHIP_LIMIT,
} from "./application/project-snapshot";
export type {
  ProjectSnapshot,
  SerializedProjectSnapshot,
  SerializedBuildStep,
} from "./application/project-snapshot";
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
