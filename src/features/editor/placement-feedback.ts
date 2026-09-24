import {
  findStudContacts,
  getPartConnections,
  hasOccupiedStudSpace,
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

export function placementFeedback(
  model: Model,
  definitions: readonly PartDefinition[],
  placement: PlacementPreview,
): PlacementFeedback {
  const definition = definitions.find((item) => item.id === placement.partId);
  const blocked = (message: string): PlacementFeedback => ({
    allowed: false,
    kind: "blocked",
    message,
    contacts: [],
  });
  if (!definition) return blocked("Choose a part first");
  if (placement.target === "free")
    return {
      allowed: true,
      kind: "free",
      message: "Free placement · no connector snapping",
      contacts: [],
    };
  if (hasOccupiedStudSpace(model, definitions, definition, placement.transform))
    return blocked("Space occupied · choose another position");
  if (Math.abs(placement.transform.y - definition.height / 2) < 0.001)
    return { allowed: true, kind: "ground", message: "On the ground plane", contacts: [] };
  if (placement.target === "ground") return blocked("Ground placement must touch the ground plane");
  if (!getPartConnections(definition).receivesStuds)
    return blocked("This detail has no stud socket · use Free placement");
  const contacts = findStudContacts(model, definitions, definition, placement.transform);
  if (!contacts.length) return blocked("No matching studs · point at a studded surface");
  return {
    allowed: true,
    kind: "connected",
    message: `${contacts.length} stud${contacts.length === 1 ? "" : "s"} aligned · click to attach`,
    contacts,
  };
}
