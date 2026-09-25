import {
  findStudContacts,
  isValidTransform,
  isGroupProtected,
  validatePlacement,
  type Model,
  type PartDefinition,
  type StudContact,
} from "@/core/model/public";
import { editPolicy } from "@/fixtures/catalog";
import type { PlacementPreview } from "./viewport-types";
import { getPlacementModel } from "./placement-model";

export interface PlacementFeedback {
  readonly allowed: boolean;
  readonly kind: "ground" | "connected" | "free" | "blocked";
  readonly message: string;
  readonly contacts: readonly StudContact[];
}

/** Preview uses the same core policy as the committed place command. */
export function placementFeedback(
  model: Model,
  definitions: readonly PartDefinition[],
  placement: PlacementPreview,
): PlacementFeedback {
  if (placement.editing) {
    const source = model.instances.find((part) => part.id === placement.editing?.instanceId);
    const message =
      placement.editing.baseRevision !== model.revision
        ? "The model changed. Cancel this move and select the piece again."
        : !source
          ? "This piece is no longer in the model. Cancel this move."
          : isGroupProtected(model, source.groupId)
            ? "This piece is protected. Cancel the move and unlock its assembly first."
            : "";
    if (message) return { allowed: false, kind: "blocked", message, contacts: [] };
  }
  const placementModel = getPlacementModel(model, placement);
  const definition = definitions.find((item) => item.id === placement.partId);
  if (!definition)
    return { allowed: false, kind: "blocked", message: "Choose a part first", contacts: [] };
  const mode =
    placement.target === "free" ? "free" : placement.target === "ground" ? "grid" : "connect";
  const result = validatePlacement(
    placementModel,
    definitions,
    definition,
    placement.transform,
    mode,
    editPolicy.bounds,
  );
  if (!result.ok)
    return {
      allowed: false,
      kind: "blocked",
      message:
        result.error.code === "invalid-transform"
          ? isValidTransform(placement.transform, editPolicy.bounds)
            ? "Align to the floor grid: 0.8 cm horizontal steps and 0.32 cm height steps."
            : "Use 0.08 cm horizontal steps and 0.04 cm height steps within the workspace."
          : result.error.code === "occupied-volume"
            ? "This position overlaps another piece. Point to an available connection or choose another position."
            : result.error.code === "missing-connection"
              ? "Point to a studded surface to attach this piece."
              : result.error.code === "unsupported-connector"
                ? "This connection cannot be checked. Choose a supported piece or another position."
                : result.error.message,
      contacts: [],
    };
  const contacts =
    mode === "connect"
      ? findStudContacts(placementModel, definitions, definition, placement.transform)
      : [];
  return {
    allowed: true,
    kind: mode === "connect" ? "connected" : mode === "grid" ? "ground" : "free",
    message:
      mode === "connect"
        ? `${contacts.length} stud${contacts.length === 1 ? "" : "s"} aligned · click to attach`
        : mode === "grid"
          ? "Aligned grid draft · click to place"
          : "Free position · unverified draft",
    contacts,
  };
}
