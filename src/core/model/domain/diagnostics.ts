import { getPartConnections, worldStudSites } from "./connections";
import type { GridTransform, Model, PartDefinition } from "./types";

export const DIAGNOSTIC_RULE = "original-rectangular-shell-v1";
const GEOMETRIC_TOLERANCE = 0.00001;

export interface PlacementDiagnostic {
  readonly category: "occupied-volume";
  readonly rule: typeof DIAGNOSTIC_RULE;
  readonly modelRevision: string;
  readonly state: "current";
  readonly coverage: "basic rectangular shell, studs, underside voids, tubes and pins";
  readonly status: "conflict" | "no-conflict" | "not-checked";
  readonly conflictingIds: readonly string[];
  readonly uncheckedIds: readonly string[];
  readonly checkedCount: number;
  readonly physicalAssessment: "not-evaluated";
}

export function hasSupportedDiagnosticGeometry(part: PartDefinition): boolean {
  return (
    (part.shape === "brick" || part.shape === "plate") &&
    Number.isInteger(part.width) &&
    Number.isInteger(part.depth) &&
    part.width >= 1 &&
    part.depth >= 1 &&
    (part.height === 0.4 || part.height === 1.2)
  );
}

type Box = {
  kind: "box";
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  bottom: number;
  top: number;
};
type Ring = {
  kind: "ring";
  x: number;
  z: number;
  inner: number;
  outer: number;
  bottom: number;
  top: number;
};
type Volume = Box | Ring;

/** Nominal conservative material volumes independent of tessellation, lighting and visibility. */
function volumes(part: PartDefinition, transform: GridTransform): Volume[] {
  const hx = (part.width - 0.035) / 2;
  const hz = (part.depth - 0.035) / 2;
  const top = (part.height - 0.02) / 2;
  const bottom = -top;
  const ceiling = top - 0.12;
  const wall = 0.18;
  const local: Volume[] = [
    { kind: "box", x: 0, z: 0, halfX: hx, halfZ: hz, bottom: ceiling, top },
    ...[-1, 1].flatMap((side): Box[] => [
      {
        kind: "box",
        x: side * (hx - wall / 2),
        z: 0,
        halfX: wall / 2,
        halfZ: hz,
        bottom,
        top: ceiling,
      },
      {
        kind: "box",
        x: 0,
        z: side * (hz - wall / 2),
        halfX: hx - wall,
        halfZ: wall / 2,
        bottom,
        top: ceiling,
      },
    ]),
  ];
  for (const site of getPartConnections(part).studs)
    local.push({ kind: "ring", ...site, inner: 0, outer: 0.3, bottom: top, top: top + 0.2 });
  if (part.width > 1 && part.depth > 1) {
    for (let x = 0; x < part.width - 1; x++)
      for (let z = 0; z < part.depth - 1; z++)
        local.push({
          kind: "ring",
          x: x - (part.width - 2) / 2,
          z: z - (part.depth - 2) / 2,
          inner: 0.3,
          outer: 0.4,
          bottom: bottom + 0.025,
          top: ceiling,
        });
  } else {
    const count = Math.max(part.width, part.depth) - 1;
    for (let n = 0; n < count; n++) {
      const position = n - (count - 1) / 2;
      local.push({
        kind: "ring",
        x: part.width > 1 ? position : 0,
        z: part.depth > 1 ? position : 0,
        inner: 0,
        outer: 0.195,
        bottom: bottom + 0.025,
        top: ceiling,
      });
    }
  }
  return local.map((volume) => {
    const site = worldStudSites([volume], transform)[0];
    return {
      ...volume,
      ...site,
      bottom: volume.bottom + transform.y,
      top: volume.top + transform.y,
      ...(volume.kind === "box" && transform.rotation % 180 !== 0
        ? { halfX: volume.halfZ, halfZ: volume.halfX }
        : {}),
    };
  });
}

function intersects(a: Volume, b: Volume): boolean {
  const epsilon = GEOMETRIC_TOLERANCE;
  if (Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom) <= epsilon) return false;
  if (a.kind === "box" && b.kind === "box")
    return (
      Math.abs(a.x - b.x) < a.halfX + b.halfX - epsilon &&
      Math.abs(a.z - b.z) < a.halfZ + b.halfZ - epsilon
    );
  if (a.kind === "ring" && b.kind === "ring") {
    const distance = Math.hypot(a.x - b.x, a.z - b.z);
    return (
      distance < a.outer + b.outer - epsilon &&
      distance + a.outer > b.inner + epsilon &&
      distance + b.outer > a.inner + epsilon
    );
  }
  const box = a.kind === "box" ? a : (b as Box);
  const ring = a.kind === "ring" ? a : (b as Ring);
  const dx = Math.abs(box.x - ring.x),
    dz = Math.abs(box.z - ring.z);
  const near = Math.hypot(Math.max(0, dx - box.halfX), Math.max(0, dz - box.halfZ));
  const far = Math.hypot(dx + box.halfX, dz + box.halfZ);
  return near < ring.outer - epsilon && far > ring.inner + epsilon;
}

function broadOverlap(
  a: PartDefinition,
  at: GridTransform,
  b: PartDefinition,
  bt: GridTransform,
): boolean {
  const ax = at.rotation % 180 ? a.depth : a.width,
    az = at.rotation % 180 ? a.width : a.depth;
  const bx = bt.rotation % 180 ? b.depth : b.width,
    bz = bt.rotation % 180 ? b.width : b.depth;
  return (
    Math.abs(at.x - bt.x) < (ax + bx) / 2 &&
    Math.abs(at.z - bt.z) < (az + bz) / 2 &&
    at.y - a.height / 2 < bt.y + b.height / 2 + (b.studs ? 0.2 : 0) &&
    bt.y - b.height / 2 < at.y + a.height / 2 + (a.studs ? 0.2 : 0)
  );
}

export function diagnosePlacement(
  model: Model,
  definitions: readonly PartDefinition[],
  definition: PartDefinition,
  transform: GridTransform,
  excludeIds: readonly string[] = [],
): PlacementDiagnostic {
  const excluded = new Set(excludeIds),
    conflictingIds: string[] = [],
    uncheckedIds: string[] = [];
  const supported = hasSupportedDiagnosticGeometry(definition);
  const material = supported ? volumes(definition, transform) : [];
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  let checkedCount = 0;
  for (const instance of model.instances) {
    if (excluded.has(instance.id)) continue;
    const other = catalog.get(instance.partId);
    if (!other) {
      uncheckedIds.push(instance.id);
      continue;
    }
    if (!broadOverlap(definition, transform, other, instance.transform)) {
      checkedCount++;
      continue;
    }
    if (!supported || !hasSupportedDiagnosticGeometry(other)) {
      uncheckedIds.push(instance.id);
      continue;
    }
    checkedCount++;
    const otherMaterial = volumes(other, instance.transform);
    if (material.some((a) => otherMaterial.some((b) => intersects(a, b))))
      conflictingIds.push(instance.id);
  }
  return {
    category: "occupied-volume",
    rule: DIAGNOSTIC_RULE,
    modelRevision: model.revision,
    state: "current",
    coverage: "basic rectangular shell, studs, underside voids, tubes and pins",
    status: conflictingIds.length
      ? "conflict"
      : !supported || uncheckedIds.length
        ? "not-checked"
        : "no-conflict",
    conflictingIds,
    uncheckedIds,
    checkedCount,
    physicalAssessment: "not-evaluated",
  };
}
