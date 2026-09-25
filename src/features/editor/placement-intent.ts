import {
  findStudContacts,
  getPartConnections,
  getPlacementCandidates,
  validatePlacement,
  type GridTransform,
  type Model,
  type PartDefinition,
  type PlacementCandidate,
  type QuarterTurn,
} from "@/core/model/public";
import { snapPlacementCenter } from "./placement-grid";
import type { PlacementPreview } from "./viewport-types";

export interface PlacementIntentInput {
  readonly model: Model;
  readonly definitions: readonly PartDefinition[];
  readonly definition: PartDefinition;
  readonly placement: PlacementPreview;
  readonly eligibleTargetIds: readonly string[];
  readonly preferredTargetIds?: readonly string[];
  readonly bounds: number;
}

function validConnection(input: PlacementIntentInput, transform: GridTransform) {
  return validatePlacement(
    input.model,
    input.definitions,
    input.definition,
    transform,
    "connect",
    input.bounds,
  ).ok;
}

/** Every socket can supply the nearest attachment, including a one-stud overhang. */
function nearbyConnection(
  input: PlacementIntentInput,
  transform: GridTransform,
  targetIds: readonly string[],
  maxDistance: number,
  sameHeight = false,
): GridTransform | undefined {
  if (!targetIds.length) return undefined;
  const unique = new Map<string, PlacementCandidate>();
  getPartConnections(input.definition).receivers.forEach((_, sourceConnectorIndex) => {
    for (const candidate of getPlacementCandidates({
      model: input.model,
      definitions: input.definitions,
      definition: input.definition,
      transform,
      eligibleTargetIds: targetIds,
      sourceConnectorIndex,
      orientationPolicy: "keep",
      maxDistance,
      limit: 32,
    })) {
      if (sameHeight && Math.abs(candidate.transform.y - transform.y) > 0.000001) continue;
      const key = JSON.stringify(candidate.transform);
      const previous = unique.get(key);
      if (!previous || candidate.id.localeCompare(previous.id) < 0) unique.set(key, candidate);
    }
  });
  return [...unique.values()]
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .find((candidate) => validConnection(input, candidate.transform))?.transform;
}

/** Rotate a preview around a stable user intent, without adding or moving model parts. */
export function rotatePlacementPreview(
  input: PlacementIntentInput & { readonly origin: GridTransform },
): PlacementPreview {
  const { placement, origin, definition } = input;
  const rotated: GridTransform = {
    ...origin,
    rotation: ((placement.transform.rotation + 90) % 360) as QuarterTurn,
  };
  if (placement.target === "free") return { ...placement, transform: rotated };
  if (placement.target === "ground")
    return {
      ...placement,
      transform: {
        ...rotated,
        ...snapPlacementCenter(origin, definition, rotated.rotation),
      },
    };
  if (validConnection(input, rotated)) return { ...placement, transform: rotated };

  const eligible = new Set(input.eligibleTargetIds);
  const supports = [
    ...new Set(
      findStudContacts(input.model, input.definitions, definition, origin)
        .map((contact) => contact.supportId)
        .filter((id) => eligible.has(id)),
    ),
  ];
  const aligned = nearbyConnection(input, rotated, supports, Math.SQRT1_2 + 0.000001, true);
  // A blocked turn remains a preview. Normal feedback and the Place command still reject it.
  return { ...placement, transform: aligned ?? rotated };
}

/** Explicit Attach requests may suggest a nearby height, while retaining color and orientation. */
export function suggestAttachmentPreview(input: PlacementIntentInput): PlacementPreview {
  const { placement } = input;
  const attached: PlacementPreview = { ...placement, target: "surface" };
  if (validConnection(input, placement.transform)) return attached;

  const eligible = new Set(input.eligibleTargetIds);
  for (const id of input.preferredTargetIds ?? []) {
    if (!eligible.has(id)) continue;
    const support = input.model.instances.find((part) => part.id === id);
    const definition = input.definitions.find((part) => part.id === support?.partId);
    if (!support || !definition) continue;
    const intended = {
      ...placement.transform,
      y: support.transform.y + definition.height / 2 + input.definition.height / 2,
    };
    const aligned = nearbyConnection(input, intended, [id], 6);
    if (aligned) return { ...attached, transform: aligned };
  }
  const aligned = nearbyConnection(input, placement.transform, input.eligibleTargetIds, 6);
  return aligned ? { ...attached, transform: aligned } : attached;
}
