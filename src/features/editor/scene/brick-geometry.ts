import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Shape,
  Vector2,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  getReceivingSlopeProfile,
  NOMINAL_SIDE_CLEARANCE,
  NOMINAL_VERTICAL_CLEARANCE,
  type PartDefinition,
} from "@/core/model/public";

// Nominal stud pitch is one. Clearances and shell details are visual approximations.
export const STUD_HEIGHT = 0.2;
export const BODY_SIDE_CLEARANCE = NOMINAL_SIDE_CLEARANCE;
export const BODY_VERTICAL_CLEARANCE = NOMINAL_VERTICAL_CLEARANCE;

function clutchTube(bottom: number, ceiling: number, detailed: boolean) {
  return new LatheGeometry(
    [
      new Vector2(0.3, bottom),
      new Vector2(0.385, bottom),
      new Vector2(0.4, bottom + 0.015),
      new Vector2(0.4, ceiling),
      new Vector2(0.3, ceiling),
      new Vector2(0.3, bottom),
    ],
    detailed ? 24 : 12,
  );
}

export function buildRoundBrickShell(definition: PartDefinition, detailed: boolean) {
  const radius = (definition.width - BODY_SIDE_CLEARANCE) / 2;
  const top = (definition.height - BODY_VERTICAL_CLEARANCE) / 2;
  const bottom = -top;
  const ceiling = top - 0.12;
  const inner = radius - 0.18;
  const bevel = 0.018;
  const cutoutTop = bottom + 0.25;
  const body = new LatheGeometry(
    [
      new Vector2(0, ceiling),
      new Vector2(inner, ceiling),
      new Vector2(inner, cutoutTop),
      new Vector2(radius, cutoutTop),
      new Vector2(radius, top - bevel),
      new Vector2(radius - bevel, top),
      new Vector2(0, top),
    ],
    detailed ? 40 : 20,
  );
  const tube = clutchTube(bottom + 0.025, ceiling, detailed);
  const pieces = [body.toNonIndexed(), tube.toNonIndexed()];
  body.dispose();
  tube.dispose();
  // A circular inner wall would cut through the four lower studs. Each bottom
  // sector instead follows their clearance envelopes and opens through the rim.
  const clearance = 0.315;
  const studDistance = Math.SQRT1_2;
  const opening = Math.acos(
    (radius * radius + 0.5 - clearance * clearance) / (2 * radius * studDistance),
  );
  const halfSector = Math.PI / 4 - opening;
  const segments = detailed ? 32 : 20;
  for (let sector = 0; sector < 4; sector++) {
    const shape = new Shape();
    const angles = Array.from(
      { length: segments + 1 },
      (_, step) => (sector * Math.PI) / 2 - halfSector + (step * halfSector * 2) / segments,
    );
    shape.moveTo(Math.cos(angles[0]) * radius, Math.sin(angles[0]) * radius);
    for (const angle of angles.slice(1))
      shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    for (const angle of angles.reverse()) {
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      let openingRadius = inner;
      for (const x of [-0.5, 0.5])
        for (const z of [-0.5, 0.5]) {
          const projection = x * dx + z * dz;
          const perpendicularSquared = 0.5 - projection * projection;
          if (projection > 0 && perpendicularSquared < clearance * clearance)
            openingRadius = Math.max(
              openingRadius,
              projection + Math.sqrt(clearance * clearance - perpendicularSquared),
            );
        }
      openingRadius = Math.min(radius, openingRadius);
      shape.lineTo(dx * openingRadius, dz * openingRadius);
    }
    shape.closePath();
    const wall = new ExtrudeGeometry(shape, {
      depth: cutoutTop - bottom,
      bevelEnabled: false,
      steps: 1,
    });
    wall.rotateX(-Math.PI / 2);
    wall.translate(0, bottom, 0);
    pieces.push(wall);
  }
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error("Round brick surfaces must share their vertex attributes.");
  return geometry;
}

function roundedRing(halfX: number, halfZ: number, radius: number, segments: number) {
  const points: Vector2[] = [];
  for (let corner = 0; corner < 4; corner++) {
    const angle = (corner * Math.PI) / 2;
    const centerX = (corner === 0 || corner === 3 ? 1 : -1) * (halfX - radius);
    const centerZ = (corner < 2 ? 1 : -1) * (halfZ - radius);
    for (let step = 0; step <= segments; step++) {
      const theta = angle + (step / segments) * (Math.PI / 2);
      points.push(
        new Vector2(centerX + radius * Math.cos(theta), centerZ + radius * Math.sin(theta)),
      );
    }
  }
  return points;
}

/** A closed material shell with an open underside, rather than a solid box. */
function shell(width: number, height: number, depth: number, detailed: boolean) {
  const halfX = (width - BODY_SIDE_CLEARANCE) / 2;
  const halfZ = (depth - BODY_SIDE_CLEARANCE) / 2;
  const bottom = -(height - BODY_VERTICAL_CLEARANCE) / 2;
  const top = -bottom;
  const wall = 0.18;
  const roof = 0.12;
  const bevel = 0.016;
  const corner = 0.035;
  const innerX = halfX - wall;
  const innerZ = halfZ - wall;
  const rings = [
    [halfX - bevel, halfZ - bevel, top, corner - bevel],
    [halfX, halfZ, top - bevel, corner],
    [halfX, halfZ, bottom + bevel, corner],
    [halfX - bevel, halfZ - bevel, bottom, corner - bevel],
    [innerX + bevel, innerZ + bevel, bottom, corner + bevel],
    [innerX, innerZ, bottom + bevel, corner],
    [innerX, innerZ, top - roof - bevel, corner],
    [innerX - bevel, innerZ - bevel, top - roof, corner - bevel],
  ];
  const positions: number[] = [];
  let ringSize = 0;
  for (const [x, z, y, r] of rings) {
    const points = roundedRing(x, z, r, detailed ? 3 : 1);
    ringSize = points.length;
    for (const point of points) positions.push(point.x, y, point.y);
  }
  const indices: number[] = [];
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let edge = 0; edge < ringSize; edge++) {
      const next = (edge + 1) % ringSize;
      const a = ring * ringSize + edge;
      const b = ring * ringSize + next;
      const c = (ring + 1) * ringSize + next;
      const d = (ring + 1) * ringSize + edge;
      indices.push(a, b, d, b, c, d);
    }
  }
  const topCenter = positions.length / 3;
  positions.push(0, top, 0);
  const ceilingCenter = positions.length / 3;
  positions.push(0, top - roof, 0);
  const ceilingRing = (rings.length - 1) * ringSize;
  for (let edge = 0; edge < ringSize; edge++) {
    const next = (edge + 1) % ringSize;
    indices.push(topCenter, next, edge);
    indices.push(ceilingCenter, ceilingRing + edge, ceilingRing + next);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, bottom, ceiling: top - roof };
}

export function buildBrickShell(definition: PartDefinition, detailed: boolean) {
  const { width, height, depth } = definition;
  if (
    width < 1 ||
    depth < 1 ||
    height < 0.3 ||
    !Number.isInteger(width) ||
    !Number.isInteger(depth)
  )
    return null;
  const body = shell(width, height, depth, detailed);
  const pieces: BufferGeometry[] = [body.geometry];
  const bottom = body.bottom + 0.025;
  if (width > 1 && depth > 1) {
    for (let x = 0; x < width - 1; x++) {
      for (let z = 0; z < depth - 1; z++) {
        const tube = clutchTube(bottom, body.ceiling, detailed);
        tube.translate(x - (width - 2) / 2, 0, z - (depth - 2) / 2);
        pieces.push(tube);
      }
    }
  } else {
    const count = Math.max(width, depth) - 1;
    for (let index = 0; index < count; index++) {
      const pin = new LatheGeometry(
        [
          new Vector2(0, bottom),
          new Vector2(0.18, bottom),
          new Vector2(0.195, bottom + 0.015),
          new Vector2(0.195, body.ceiling),
          new Vector2(0, body.ceiling),
        ],
        detailed ? 20 : 10,
      );
      const position = index - (count - 1) / 2;
      pin.translate(width > 1 ? position : 0, 0, depth > 1 ? position : 0);
      pieces.push(pin);
    }
  }
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error("Brick shell surfaces must share their vertex attributes.");
  return geometry;
}

export function buildSlopedBrickShell(definition: PartDefinition, detailed: boolean) {
  const geometry = buildBrickShell(definition, detailed);
  if (!geometry) return null;
  const height = definition.height - BODY_VERTICAL_CLEARANCE;
  const depth = definition.depth - BODY_SIDE_CLEARANCE;
  const bottom = -height / 2;
  const receivingProfile = getReceivingSlopeProfile(definition);
  // Standard slopes retain the complete stud insertion envelope. The roof bed
  // includes its receiving base; the miniature decorative slope stays thin.
  const toe = Math.min(height, receivingProfile?.toe ?? 0.06);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const fraction = Math.max(0, Math.min(1, (positions.getZ(index) + depth / 2) / depth));
    const localHeight = height + (toe - height) * fraction;
    positions.setY(index, bottom + ((positions.getY(index) - bottom) / height) * localHeight);
  }
  geometry.computeVertexNormals();
  return geometry;
}
