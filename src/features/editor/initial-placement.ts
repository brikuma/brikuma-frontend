import {
  getPartConnections,
  getPlacementCandidates,
  hasSupportedDiagnosticGeometry,
  validatePlacement,
  type GridTransform,
  type Model,
  type PartDefinition,
} from "@/core/model/public";
import { snapPlacementCenter } from "./placement-grid";
import type { PlacementPreview } from "./viewport-types";

interface InitialPlacementInput {
  readonly model: Model;
  readonly definitions: readonly PartDefinition[];
  readonly definition: PartDefinition;
  readonly colorId: string;
  readonly selectedIds: readonly string[];
  readonly visibleIds: readonly string[];
  readonly bounds: number;
}

/** Suggest a starting preview; the normal placement command still owns the commit. */
export function createInitialPlacement({
  model,
  definitions,
  definition,
  colorId,
  selectedIds,
  visibleIds,
  bounds,
}: InitialPlacementInput): PlacementPreview {
  const supported =
    hasSupportedDiagnosticGeometry(definition) &&
    getPartConnections(definition).receivers.length > 0;
  const preview: PlacementPreview = {
    partId: definition.id,
    colorId,
    target: supported ? (model.instances.length ? "surface" : "ground") : "free",
    transform: {
      ...snapPlacementCenter({ x: 0, z: 0 }, definition, 0),
      y: definition.height / 2,
      rotation: 0,
    },
  };
  if (preview.target !== "surface") return preview;

  const visible = new Set(visibleIds);
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  const supports = model.instances.filter((part) => {
    const support = catalog.get(part.partId);
    return (
      visible.has(part.id) &&
      support &&
      hasSupportedDiagnosticGeometry(support) &&
      getPartConnections(support).studs.length > 0
    );
  });
  const eligibleIds = supports.map((part) => part.id);
  const activeId = [...selectedIds].reverse().find((id) => eligibleIds.includes(id));
  const preferredIds = new Set([activeId, supports.at(-1)?.id]);

  function findTransform(transform: GridTransform, targetIds: readonly string[]) {
    const candidates = getPlacementCandidates({
      model,
      definitions,
      definition,
      transform,
      eligibleTargetIds: targetIds,
      orientationPolicy: "keep",
      maxDistance: 6,
      limit: 32,
    });
    return candidates.find(
      (candidate) =>
        candidate.diagnostic.status === "no-conflict" &&
        validatePlacement(model, definitions, definition, candidate.transform, "connect", bounds)
          .ok,
    )?.transform;
  }

  // Restrict only the suggested targets; hidden pieces remain in collision checks.
  for (const id of preferredIds) {
    const support = supports.find((part) => part.id === id);
    const supportDefinition = support && catalog.get(support.partId);
    if (!support || !supportDefinition) continue;
    const transform = findTransform(
      {
        ...preview.transform,
        x: support.transform.x,
        y: support.transform.y + supportDefinition.height / 2 + definition.height / 2,
        z: support.transform.z,
      },
      [support.id],
    );
    if (transform) return { ...preview, transform };
  }

  const nearby = findTransform(preview.transform, eligibleIds);
  return nearby ? { ...preview, transform: nearby } : preview;
}
