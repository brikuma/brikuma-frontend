import type { PartDefinition } from "./types";

export const NOMINAL_SIDE_CLEARANCE = 0.035;
export const NOMINAL_VERTICAL_CLEARANCE = 0.02;

export interface MaterialBox {
  readonly kind: "box";
  readonly x: number;
  readonly z: number;
  readonly halfX: number;
  readonly halfZ: number;
  readonly bottom: number;
  readonly top: number;
}
export interface MaterialRing {
  readonly kind: "ring";
  readonly x: number;
  readonly z: number;
  readonly inner: number;
  readonly outer: number;
  readonly bottom: number;
  readonly top: number;
}
export type MaterialVolume = MaterialBox | MaterialRing;

/** Only explicitly authored receiving slopes have this shared deformation contract. */
export function getReceivingSlopeProfile(part: PartDefinition) {
  if (
    part.geometryProfile !== "receiving-slope-v1" ||
    part.shape !== "slope" ||
    part.studs ||
    !Number.isInteger(part.width) ||
    !Number.isInteger(part.depth) ||
    part.width < 1 ||
    part.depth < 1 ||
    part.height < 0.6
  )
    return null;
  return {
    height: part.height - NOMINAL_VERTICAL_CLEARANCE,
    depth: part.depth - NOMINAL_SIDE_CLEARANCE,
    toe: part.depth > 2 ? 0.46 : 0.36,
  };
}

export function isFramedDoorAssembly(part: PartDefinition): boolean {
  return (
    part.geometryProfile === "framed-door-v1" &&
    part.shape === "door-assembly" &&
    part.width === 2 &&
    part.depth === 1 &&
    part.height === 4.8 &&
    part.studs
  );
}

/** Shell bounds conservatively enclose the renderer's rounded rectangular shell. */
export function rectangularShellMaterial(
  width: number,
  height: number,
  depth: number,
): MaterialVolume[] {
  const hx = (width - NOMINAL_SIDE_CLEARANCE) / 2;
  const hz = (depth - NOMINAL_SIDE_CLEARANCE) / 2;
  const top = (height - NOMINAL_VERTICAL_CLEARANCE) / 2;
  const bottom = -top;
  const ceiling = top - 0.12;
  const wall = 0.18;
  const result: MaterialVolume[] = [
    // The inner ceiling bevel projects 0.016 into the nominal cavity.
    { kind: "box", x: 0, z: 0, halfX: hx, halfZ: hz, bottom: ceiling - 0.016, top },
    ...[-1, 1].flatMap((side): MaterialBox[] => [
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
  if (width > 1 && depth > 1) {
    for (let x = 0; x < width - 1; x++)
      for (let z = 0; z < depth - 1; z++)
        result.push({
          kind: "ring",
          x: x - (width - 2) / 2,
          z: z - (depth - 2) / 2,
          inner: 0.3,
          outer: 0.4,
          bottom: bottom + 0.025,
          top: ceiling,
        });
  } else {
    const count = Math.max(width, depth) - 1;
    for (let n = 0; n < count; n++) {
      const position = n - (count - 1) / 2;
      result.push({
        kind: "ring",
        x: width > 1 ? position : 0,
        z: depth > 1 ? position : 0,
        inner: 0,
        outer: 0.195,
        bottom: bottom + 0.025,
        top: ceiling,
      });
    }
  }
  return result;
}

/** One original closed assembly: receiving sill, frame, retained leaf and two pin journals. */
export function framedDoorMaterial(part: PartDefinition): MaterialVolume[] {
  if (!isFramedDoorAssembly(part)) return [];
  const hx = (part.width - NOMINAL_SIDE_CLEARANCE) / 2;
  const hz = (part.depth - NOMINAL_SIDE_CLEARANCE) / 2;
  const top = (part.height - NOMINAL_VERTICAL_CLEARANCE) / 2;
  const sillCenter = -part.height / 2 + 0.2;
  const result: MaterialVolume[] = rectangularShellMaterial(2, 0.4, 1).map((volume) => ({
    ...volume,
    bottom: volume.bottom + sillCenter,
    top: volume.top + sillCenter,
  }));
  for (const side of [-1, 1])
    result.push({
      kind: "box",
      x: side * (hx - 0.09),
      z: 0,
      halfX: 0.09,
      halfZ: hz,
      bottom: -2.01,
      top,
    });
  result.push(
    { kind: "box", x: 0, z: 0, halfX: hx - 0.18, halfZ: hz, bottom: top - 0.26, top },
    { kind: "box", x: 0.085, z: 0, halfX: 0.665, halfZ: 0.08, bottom: -1.97, top: 2.08 },
    { kind: "box", x: 0.58, z: 0.12, halfX: 0.07, halfZ: 0.05, bottom: -0.17, top: -0.03 },
  );
  for (const center of [-1.25, 1.25]) {
    // A pin runs through three separated annular knuckles; end caps retain the leaf journal.
    result.push({
      kind: "ring",
      x: -0.7,
      z: 0.05,
      inner: 0,
      outer: 0.04,
      bottom: center - 0.27,
      top: center + 0.27,
    });
    for (const offset of [-0.18, 0, 0.18])
      result.push({
        kind: "ring",
        x: -0.7,
        z: 0.05,
        inner: 0.045,
        outer: 0.09,
        bottom: center + offset - 0.08,
        top: center + offset + 0.08,
      });
    for (const offset of [-0.18, 0.18])
      result.push({
        kind: "box",
        x: -0.77625,
        z: 0.05,
        halfX: 0.03125,
        halfZ: 0.045,
        bottom: center + offset - 0.08,
        top: center + offset + 0.08,
      });
    result.push({
      kind: "box",
      x: -0.6125,
      z: 0.05,
      halfX: 0.0425,
      halfZ: 0.045,
      bottom: center - 0.08,
      top: center + 0.08,
    });
    for (const side of [-1, 1])
      result.push({
        kind: "ring",
        x: -0.7,
        z: 0.05,
        inner: 0,
        outer: 0.065,
        bottom: center + side * 0.275 - 0.015,
        top: center + side * 0.275 + 0.015,
      });
  }
  return result;
}
