import { getPartConnections, worldStudSites } from "./connections";
import type { GridTransform, Model, PartDefinition } from "./types";
import {
  framedDoorMaterial,
  getReceivingSlopeProfile,
  isFramedDoorAssembly,
  rectangularShellMaterial,
  type MaterialBox as Box,
  type MaterialRing as Ring,
  type MaterialVolume as Volume,
} from "./nominal-geometry";

export const DIAGNOSTIC_RULE = "original-building-shell-v2";
const GEOMETRIC_TOLERANCE = 0.00001;

export interface PlacementDiagnostic {
  readonly category: "occupied-volume";
  readonly rule: typeof DIAGNOSTIC_RULE;
  readonly modelRevision: string;
  readonly state: "current";
  readonly coverage: "rectangular shells, receiving slopes and framed door assemblies";
  readonly status: "conflict" | "no-conflict" | "not-checked";
  readonly conflictingIds: readonly string[];
  readonly uncheckedIds: readonly string[];
  readonly checkedCount: number;
  readonly physicalAssessment: "not-evaluated";
}

export function hasSupportedDiagnosticGeometry(part: PartDefinition): boolean {
  return (
    ((part.shape === "brick" || part.shape === "plate") &&
      Number.isInteger(part.width) &&
      Number.isInteger(part.depth) &&
      part.width >= 1 &&
      part.depth >= 1 &&
      (part.height === 0.4 || part.height === 1.2)) ||
    getReceivingSlopeProfile(part) !== null ||
    isFramedDoorAssembly(part)
  );
}

/** Enclose the exact shell deformation in narrow Z slices, preserving receiver voids.
 * Slices can conservatively flag near-surface contacts; they never omit shell material.
 */
function slopeMaterial(part: PartDefinition, material: Volume[]): Volume[] {
  const profile = getReceivingSlopeProfile(part);
  if (!profile) return material;
  const { height, depth, toe } = profile;
  const bottom = -height / 2;
  function warp(y: number, z: number) {
    const fraction = Math.max(0, Math.min(1, (z + depth / 2) / depth));
    const localHeight = height + (toe - height) * fraction;
    return bottom + ((y - bottom) / height) * localHeight;
  }
  return material.flatMap((volume): Volume[] => {
    if (volume.kind === "ring")
      return [
        {
          ...volume,
          bottom: Math.min(
            warp(volume.bottom, volume.z - volume.outer),
            warp(volume.bottom, volume.z + volume.outer),
          ),
          top: Math.max(
            warp(volume.top, volume.z - volume.outer),
            warp(volume.top, volume.z + volume.outer),
          ),
        },
      ];
    const slices = Math.max(1, Math.ceil((volume.halfZ * 2) / 0.08));
    return Array.from({ length: slices }, (_, index): Box => {
      const start = volume.z - volume.halfZ + (index * volume.halfZ * 2) / slices;
      const end = volume.z - volume.halfZ + ((index + 1) * volume.halfZ * 2) / slices;
      return {
        ...volume,
        z: (start + end) / 2,
        halfZ: (end - start) / 2,
        bottom: Math.min(warp(volume.bottom, start), warp(volume.bottom, end)),
        top: Math.max(warp(volume.top, start), warp(volume.top, end)),
      };
    });
  });
}

/** Nominal conservative material volumes independent of tessellation, lighting and visibility. */
function volumes(part: PartDefinition, transform: GridTransform): Volume[] {
  const local: Volume[] = isFramedDoorAssembly(part)
    ? framedDoorMaterial(part)
    : slopeMaterial(part, rectangularShellMaterial(part.width, part.height, part.depth));
  const top = (part.height - 0.02) / 2;
  for (const site of getPartConnections(part).studs)
    local.push({ kind: "ring", ...site, inner: 0, outer: 0.3, bottom: top, top: top + 0.2 });
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
    coverage: "rectangular shells, receiving slopes and framed door assemblies",
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
