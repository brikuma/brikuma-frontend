import { hasSupportedDiagnosticGeometry } from "./diagnostics";
import { failure, rotateVector } from "./model";
import type { PartDefinition, PartInstance, QuarterTurn, Result } from "./types";

export type ArchitectureSection = "complete" | "foundation" | "walls" | "roof";
export interface ArchitectureRequest {
  readonly layout: "house" | "courtyard";
  readonly section: ArchitectureSection;
  readonly width: number;
  readonly depth: number;
  readonly origin: Readonly<{ x: number; z: number }>;
  readonly wallColorId: string;
  readonly roofColorId: string;
  readonly baseColorId: string;
  readonly doorColorId: string;
  readonly groupId: string;
  readonly idPrefix: string;
}
export interface ArchitectureParts {
  readonly instances: readonly PartInstance[];
  readonly counts: Readonly<Record<Exclude<ArchitectureSection, "complete">, number>>;
  readonly height: number;
}

/** A bounded local construction recipe; catalog identities are resolved by declared capabilities. */
export function generateArchitectureParts(
  request: ArchitectureRequest,
  definitions: readonly PartDefinition[],
  usedIds: readonly string[],
): Result<ArchitectureParts> {
  if (
    !["house", "courtyard"].includes(request.layout) ||
    !["complete", "foundation", "walls", "roof"].includes(request.section) ||
    ![request.width, request.depth].every(
      (size) => Number.isInteger(size) && size >= 8 && size <= 32 && size % 4 === 0,
    ) ||
    (request.layout === "courtyard" && Math.min(request.width, request.depth) < 16)
  )
    return failure(
      "invalid-transform",
      "Choose a footprint from 8 to 32 studs in steps of 4; courtyards need at least 16 × 16 studs.",
    );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$/.test(request.idPrefix))
    return failure("invalid-model", "Choose a valid local identity prefix for the building.");
  if (
    ![request.origin.x, request.origin.z].every(
      (value) => Number.isFinite(value) && Number.isInteger(value),
    )
  )
    return failure("invalid-transform", "Place the building origin on whole-stud coordinates.");

  function rectangular(width: number, depth: number, height: number, shape: "brick" | "plate") {
    return definitions.find(
      (part) =>
        part.shape === shape &&
        part.studs &&
        part.width === width &&
        part.depth === depth &&
        part.height === height &&
        hasSupportedDiagnosticGeometry(part),
    );
  }
  const parts = {
    brick11: rectangular(1, 1, 1.2, "brick"),
    brick12: rectangular(2, 1, 1.2, "brick"),
    brick14: rectangular(4, 1, 1.2, "brick"),
    brick24: rectangular(4, 2, 1.2, "brick"),
    plate22: rectangular(2, 2, 0.4, "plate"),
    plate24: rectangular(4, 2, 0.4, "plate"),
    plate44: rectangular(4, 4, 0.4, "plate"),
    roof: definitions.find(
      (part) =>
        part.geometryProfile === "receiving-slope-v1" &&
        part.width === 4 &&
        part.depth === 2 &&
        part.height === 1.2 &&
        hasSupportedDiagnosticGeometry(part),
    ),
    door: definitions.find(
      (part) => part.geometryProfile === "framed-door-v1" && hasSupportedDiagnosticGeometry(part),
    ),
  };
  if (Object.values(parts).some((part) => !part))
    return failure(
      "unknown-part",
      "This catalog is missing a supported plate, brick, receiving roof slope or framed door needed by the building helper.",
    );

  const instances: PartInstance[] = [];
  const ids = new Set(usedIds);
  const counts = { foundation: 0, walls: 0, roof: 0 };
  let counter = 1;
  const enabled = (section: Exclude<ArchitectureSection, "complete">) =>
    request.section === "complete" || request.section === section;
  type Wing = { width: number; depth: number; x: number; z: number; rotation: QuarterTurn };
  function add(
    part: PartDefinition | undefined,
    x: number,
    y: number,
    z: number,
    rotation: QuarterTurn,
    colorId: string,
    section: Exclude<ArchitectureSection, "complete">,
    wing?: Wing,
  ) {
    if (!part || !enabled(section)) return;
    let id = `${request.idPrefix}-${counter++}`;
    while (ids.has(id)) id = `${request.idPrefix}-${counter++}`;
    ids.add(id);
    const rotated = rotateVector({ x, y, z }, wing?.rotation ?? 0);
    instances.push({
      id,
      partId: part.id,
      colorId,
      groupId: request.groupId,
      transform: {
        x: Math.round((rotated.x + (wing?.x ?? 0) + request.origin.x) * 20) / 20,
        y: Math.round(y * 20) / 20,
        z: Math.round((rotated.z + (wing?.z ?? 0) + request.origin.z) * 20) / 20,
        rotation: ((rotation + (wing?.rotation ?? 0)) % 360) as QuarterTurn,
      },
    });
    counts[section]++;
  }

  for (let x = -request.width / 2 + 2; x < request.width / 2; x += 4)
    for (let z = -request.depth / 2 + 2; z < request.depth / 2; z += 4)
      add(parts.plate44, x, 0.2, z, 0, request.baseColorId, "foundation");

  const wings: Wing[] =
    request.layout === "house"
      ? [{ width: request.width, depth: request.depth, x: 0, z: 0, rotation: 0 }]
      : [
          { width: request.depth - 4, depth: 4, x: -request.width / 2 + 2, z: -2, rotation: 270 },
          { width: request.depth - 4, depth: 4, x: request.width / 2 - 2, z: -2, rotation: 90 },
          { width: request.width, depth: 4, x: 0, z: request.depth / 2 - 2, rotation: 0 },
        ];

  for (const wing of wings) {
    const left = -wing.width / 2;
    const front = -wing.depth / 2;
    const doorStart = wing.width / 2 - 1;
    const frontWindows = wing.width >= 12 ? [wing.width / 4 - 1, (wing.width * 3) / 4 - 1] : [];
    function row(
      length: number,
      course: number,
      x: number,
      z: number,
      rotation: QuarterTurn,
      holes: readonly number[],
      windows: readonly number[],
    ) {
      const excluded = new Set(holes);
      if (course === 1 || course === 2)
        for (const start of windows) {
          excluded.add(start);
          excluded.add(start + 1);
        }
      if (course === 3)
        for (const start of windows) {
          const offset = rotateVector({ x: start + 1, y: 0, z: 0 }, rotation);
          add(
            parts.brick14,
            x + offset.x,
            0.4 + 1.2 * course + 0.6,
            z + offset.z,
            rotation,
            request.wallColorId,
            "walls",
            wing,
          );
          for (let index = start - 1; index <= start + 2; index++) excluded.add(index);
        }
      for (let index = 0; index < length;) {
        if (excluded.has(index)) {
          index++;
          continue;
        }
        const span =
          (index + course) % 2 === 0 && index + 1 < length && !excluded.has(index + 1) ? 2 : 1;
        const offset = rotateVector({ x: index + span / 2, y: 0, z: 0 }, rotation);
        add(
          span === 2 ? parts.brick12 : parts.brick11,
          x + offset.x,
          0.4 + course * 1.2 + 0.6,
          z + offset.z,
          rotation,
          request.wallColorId,
          "walls",
          wing,
        );
        index += span;
      }
    }
    for (let course = 0; course < 4; course++) {
      row(wing.width, course, left, front + 0.5, 0, [doorStart, doorStart + 1], frontWindows);
      row(wing.width, course, left, -front - 0.5, 0, [], [wing.width / 2 - 1]);
      row(wing.depth - 2, course, left + 0.5, -front - 1, 90, [], []);
      row(wing.depth - 2, course, -left - 0.5, -front - 1, 90, [], []);
    }
    add(parts.door, 0, 2.8, front + 0.5, 0, request.doorColorId, "walls", wing);

    // Two offset plate courses tie the tiled roof deck in both horizontal directions.
    for (let x = left + 2; x < -left; x += 4)
      for (let z = front + 2; z < -front; z += 4)
        add(parts.plate44, x, 5.4, z, 0, request.wallColorId, "roof", wing);
    const partitions = (size: number) => [2, ...Array.from({ length: size / 4 - 1 }, () => 4), 2];
    let xStart = left;
    for (const width of partitions(wing.width)) {
      let zStart = front;
      for (const depth of partitions(wing.depth)) {
        const part =
          width === 4 && depth === 4
            ? parts.plate44
            : width === 2 && depth === 2
              ? parts.plate22
              : parts.plate24;
        add(
          part,
          xStart + width / 2,
          5.8,
          zStart + depth / 2,
          width === 2 && depth === 4 ? 90 : 0,
          request.wallColorId,
          "roof",
          wing,
        );
        zStart += depth;
      }
      xStart += width;
    }
    for (let tier = 0; tier < wing.depth / 4; tier++) {
      const edge = front + tier * 2;
      const y = 6.6 + tier * 1.2;
      for (let x = left + 2; x < -left; x += 4) {
        add(parts.roof, x, y, edge + 1, 180, request.roofColorId, "roof", wing);
        add(parts.roof, x, y, -edge - 1, 0, request.roofColorId, "roof", wing);
        for (let z = edge + 3; z < -edge - 2; z += 2)
          add(parts.brick24, x, y, z, 0, request.wallColorId, "roof", wing);
      }
    }
  }
  return {
    ok: true,
    value: {
      instances,
      counts,
      height:
        request.section === "foundation"
          ? 0.4
          : request.section === "walls"
            ? 5.2
            : 6 + Math.max(...wings.map((wing) => wing.depth / 4)) * 1.2,
    },
  };
}
