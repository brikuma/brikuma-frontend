export { createModel, isValidTransform } from "./domain/model";
export { deriveBom, isInstructionCompatible, missingQuantity } from "./domain/queries";
export {
  getPartConnections,
  worldStudSites,
  findStudContacts,
  hasOccupiedStudSpace,
} from "./domain/connections";
export type { StudSite, StudContact } from "./domain/connections";
export { applyCommand, createSession, previewVariant, redo, undo } from "./application/commands";
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
