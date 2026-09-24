import { findStudContacts, getPartConnections, worldStudSites } from "./connections";
import {
  diagnosePlacement,
  hasSupportedDiagnosticGeometry,
  type PlacementDiagnostic,
} from "./diagnostics";
import { failure } from "./model";
import type { GridTransform, Model, PartDefinition, QuarterTurn, Result } from "./types";

export interface PlacementCandidate {
  readonly id: string;
  readonly targetId: string;
  readonly targetConnectorIndex: number;
  readonly sourceConnectorIndex: number;
  readonly transform: GridTransform;
  readonly rotationDelta: number;
  readonly distance: number;
  readonly diagnostic: PlacementDiagnostic;
}
export interface PlacementQuery {
  readonly model: Model;
  readonly definitions: readonly PartDefinition[];
  readonly definition: PartDefinition;
  readonly transform: GridTransform;
  readonly orientationPolicy: "keep" | "align";
  readonly sourceConnectorIndex?: number;
  readonly excludeIds?: readonly string[];
  readonly eligibleTargetIds?: readonly string[];
  readonly maxDistance?: number;
  readonly previousCandidateId?: string;
  readonly limit?: number;
}

/** Manual connector selection is the deterministic fallback; proximity uses model units. */
export function getPlacementCandidates(query: PlacementQuery): readonly PlacementCandidate[] {
  const { model, definitions, definition, transform } = query;
  if (!hasSupportedDiagnosticGeometry(definition)) return [];
  const sourceIndex = query.sourceConnectorIndex ?? 0;
  const source = getPartConnections(definition).receivers[sourceIndex];
  if (!source) return [];
  const excluded = new Set(query.excludeIds ?? []),
    eligible = query.eligibleTargetIds ? new Set(query.eligibleTargetIds) : undefined;
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  const rotations: readonly QuarterTurn[] =
    query.orientationPolicy === "keep"
      ? [transform.rotation]
      : [
          transform.rotation,
          ((transform.rotation + 90) % 360) as QuarterTurn,
          ((transform.rotation + 180) % 360) as QuarterTurn,
          ((transform.rotation + 270) % 360) as QuarterTurn,
        ];
  const candidates: Omit<PlacementCandidate, "diagnostic">[] = [];
  for (const target of model.instances) {
    if (excluded.has(target.id) || (eligible && !eligible.has(target.id))) continue;
    const support = catalog.get(target.partId);
    if (!support || !hasSupportedDiagnosticGeometry(support)) continue;
    const targetSites = worldStudSites(getPartConnections(support).studs, target.transform);
    targetSites.forEach((site, targetIndex) => {
      for (const rotation of rotations) {
        const offset = worldStudSites([source], { x: 0, y: 0, z: 0, rotation })[0];
        const candidateTransform: GridTransform = {
          x: round(site.x - offset.x),
          y: round(target.transform.y + support.height / 2 + definition.height / 2),
          z: round(site.z - offset.z),
          rotation,
        };
        const distance = Math.hypot(
          candidateTransform.x - transform.x,
          candidateTransform.y - transform.y,
          candidateTransform.z - transform.z,
        );
        if (distance > (query.maxDistance ?? 6)) continue;
        const id = `${target.id}:${targetIndex}:${sourceIndex}:${rotation}`;
        candidates.push({
          id,
          targetId: target.id,
          targetConnectorIndex: targetIndex,
          sourceConnectorIndex: sourceIndex,
          transform: candidateTransform,
          rotationDelta: (rotation - transform.rotation + 360) % 360,
          distance,
        });
      }
    });
  }
  candidates.sort(
    (a, b) =>
      a.distance - b.distance ||
      Math.min(a.rotationDelta, 360 - a.rotationDelta) -
        Math.min(b.rotationDelta, 360 - b.rotationDelta) ||
      a.id.localeCompare(b.id),
  );
  const previous = candidates.find((item) => item.id === query.previousCandidateId);
  if (previous && candidates[0] && previous.distance <= candidates[0].distance + 0.25) {
    candidates.splice(candidates.indexOf(previous), 1);
    candidates.unshift(previous);
  }
  return candidates.slice(0, Math.max(1, Math.min(32, query.limit ?? 8))).map((candidate) => ({
    ...candidate,
    diagnostic: diagnosePlacement(
      model,
      definitions,
      definition,
      candidate.transform,
      query.excludeIds,
    ),
  }));
}
function round(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function snapGridTransform(
  definition: PartDefinition,
  transform: GridTransform,
  increments: Readonly<{ horizontal: number; vertical: number }> = { horizontal: 1, vertical: 0.4 },
  origin: Readonly<{ x: number; y: number; z: number }> = { x: 0.5, y: 0, z: 0.5 },
): GridTransform {
  const width = transform.rotation % 180 ? definition.depth : definition.width;
  const depth = transform.rotation % 180 ? definition.width : definition.depth;
  const x = origin.x + (width - 1) / 2;
  const z = origin.z + (depth - 1) / 2;
  const y = origin.y + definition.height / 2;
  return {
    x: round(x + Math.round((transform.x - x) / increments.horizontal) * increments.horizontal),
    y: round(y + Math.round((transform.y - y) / increments.vertical) * increments.vertical),
    z: round(z + Math.round((transform.z - z) / increments.horizontal) * increments.horizontal),
    rotation: transform.rotation,
  };
}

export function validatePlacement(
  model: Model,
  definitions: readonly PartDefinition[],
  definition: PartDefinition,
  transform: GridTransform,
  mode: "connect" | "grid" | "free",
): Result<true> {
  if (mode === "free") return { ok: true, value: true };
  const diagnosis = diagnosePlacement(model, definitions, definition, transform);
  if (diagnosis.status === "conflict")
    return failure(
      "occupied-volume",
      `Occupied-volume conflict with ${diagnosis.conflictingIds.join(", ")}. Choose another position or explicit Free position.`,
    );
  if (mode === "grid") {
    const snapped = snapGridTransform(definition, transform);
    if (
      ["x", "y", "z"].some(
        (axis) =>
          Math.abs(transform[axis as "x" | "y" | "z"] - snapped[axis as "x" | "y" | "z"]) > 0.00001,
      ) ||
      transform.y < definition.height / 2
    )
      return failure(
        "invalid-transform",
        "Grid placement uses footprint-aligned one-stud horizontal and 0.4-stud vertical increments above the ground.",
      );
    return { ok: true, value: true };
  }
  if (
    !hasSupportedDiagnosticGeometry(definition) ||
    !getPartConnections(definition).receivers.length
  )
    return failure(
      "unsupported-connector",
      "Connector placement unavailable for this part. Choose Grid or Free position.",
    );
  const contacts = findStudContacts(model, definitions, definition, transform).filter((contact) => {
    const instance = model.instances.find((part) => part.id === contact.supportId);
    const support = definitions.find((part) => part.id === instance?.partId);
    return support && hasSupportedDiagnosticGeometry(support);
  });
  if (!contacts.length)
    return failure(
      "missing-connection",
      "No supported stud and underside connector meet at this position.",
    );
  if (diagnosis.status === "not-checked")
    return failure(
      "unsupported-connector",
      "Nearby geometry is outside the supported overlap check. Choose Free position to make an unverified draft.",
    );
  return { ok: true, value: true };
}

export function diagnoseModel(model: Model, definitions: readonly PartDefinition[]) {
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  const conflicts: { ids: readonly string[] }[] = [],
    unchecked = new Set<string>();
  let checkedInstanceCount = 0;
  model.instances.forEach((instance, index) => {
    const definition = catalog.get(instance.partId);
    if (!definition || !hasSupportedDiagnosticGeometry(definition)) {
      unchecked.add(instance.id);
      return;
    }
    checkedInstanceCount++;
    const diagnosis = diagnosePlacement(
      { ...model, instances: model.instances.slice(index + 1) },
      definitions,
      definition,
      instance.transform,
    );
    for (const id of diagnosis.conflictingIds) conflicts.push({ ids: [instance.id, id] });
    for (const id of diagnosis.uncheckedIds) unchecked.add(id);
  });
  return {
    modelRevision: model.revision,
    rule: "original-rectangular-shell-v1" as const,
    conflicts,
    uncheckedIds: [...unchecked],
    checkedInstanceCount,
    physicalAssessment: "not-evaluated" as const,
  };
}
