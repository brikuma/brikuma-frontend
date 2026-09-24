import {
  findStudContacts,
  validatePlacement,
  type Model,
  type PartDefinition,
  type StudContact,
} from "@/core/model/public";
import type { PlacementPreview } from "./viewport-types";

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
  const definition = definitions.find((item) => item.id === placement.partId);
  if (!definition)
    return { allowed: false, kind: "blocked", message: "Choose a part first", contacts: [] };
  const mode =
    placement.target === "free" ? "free" : placement.target === "ground" ? "grid" : "connect";
  const result = validatePlacement(model, definitions, definition, placement.transform, mode);
  if (!result.ok)
    return { allowed: false, kind: "blocked", message: result.error.message, contacts: [] };
  const contacts =
    mode === "connect" ? findStudContacts(model, definitions, definition, placement.transform) : [];
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
