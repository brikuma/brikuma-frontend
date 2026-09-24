import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PartDefinition } from "@/core/model/public";
import { buildBrickShell, BODY_SIDE_CLEARANCE, BODY_VERTICAL_CLEARANCE } from "./brick-geometry";

function extrude(
  shape: Shape,
  depth: number,
  detailed: boolean,
  bevel = 0.02,
  curves = detailed ? 24 : 12,
) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - bevel * 2),
    steps: 1,
    bevelEnabled: true,
    bevelSegments: detailed ? 2 : 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: curves,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}
function archGeometry(w: number, h: number, d: number, panel: boolean, detailed: boolean) {
  const shape = new Shape();
  const radius = w / 2 - 0.02;
  const bottom = -h / 2 + 0.02;
  const spring = h / 2 - 0.02 - radius;
  shape.moveTo(-radius, bottom);
  shape.lineTo(-radius, spring);
  shape.absarc(0, spring, radius, Math.PI, 0, true);
  shape.lineTo(radius, bottom);
  if (!panel) {
    const inner = radius - w * 0.12;
    shape.lineTo(inner, bottom);
    shape.lineTo(inner, spring);
    shape.absarc(0, spring, inner, 0, Math.PI, false);
    shape.lineTo(-inner, bottom);
  }
  shape.closePath();
  return extrude(shape, d, detailed, 0.018);
}

function receivingPortal(definition: PartDefinition, detailed: boolean) {
  const { width: w, height: h, depth: d } = definition;
  const bevel = 0.012;
  const spring = h / 2 - w / 2;
  const outer = (w - BODY_SIDE_CLEARANCE) / 2 - bevel;
  const inner = (w - 2) / 2 + BODY_SIDE_CLEARANCE / 2 + bevel;
  const top = (h - BODY_VERTICAL_CLEARANCE) / 2 - bevel;
  const header = new Shape();
  header.moveTo(-outer, spring);
  header.lineTo(-outer, top);
  header.lineTo(outer, top);
  header.lineTo(outer, spring);
  header.lineTo(inner, spring);
  header.absarc(0, spring, inner, 0, Math.PI, false);
  header.closePath();
  const pieces: BufferGeometry[] = [extrude(header, d - BODY_SIDE_CLEARANCE, detailed, bevel)];
  const pierHeight = spring + h / 2;
  for (const side of [-1, 1]) {
    const pier = buildBrickShell(
      { ...definition, width: 1, height: pierHeight, depth: d, shape: "brick", studs: false },
      detailed,
    );
    if (!pier) throw new Error("The receiving portal requires one-stud hollow piers.");
    const surface = pier.toNonIndexed();
    pier.dispose();
    surface.translate((side * (w - 1)) / 2, -h / 2 + pierHeight / 2, 0);
    pieces.push(surface);
  }
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error("Portal surfaces must share their vertex attributes.");
  return geometry;
}
function leafSprig(w: number, h: number, d: number, detailed: boolean) {
  const pieces: BufferGeometry[] = [];
  const shades: number[] = [];
  function moldedLeaf(width: number, length: number) {
    const leaf = new SphereGeometry(1, detailed ? 12 : 8, detailed ? 8 : 6).toNonIndexed();
    leaf.scale(width / 2, Math.min(h * 0.15, width * 0.2), length / 2);
    leaf.translate(0, 0, -length / 2);
    return leaf;
  }
  function stemBetween(from: Vector3, to: Vector3, radius: number) {
    const delta = to.clone().sub(from);
    const stem = new CylinderGeometry(
      radius * 0.7,
      radius,
      delta.length(),
      detailed ? 8 : 6,
    ).toNonIndexed();
    stem.rotateX(Math.acos(delta.y / delta.length()));
    stem.rotateY(Math.atan2(delta.x, delta.z));
    const middle = from.clone().add(to).multiplyScalar(0.5);
    stem.translate(middle.x, middle.y, middle.z);
    pieces.push(stem);
    shades.push(0.8);
  }
  for (let row = 0; row < 3; row++) {
    for (const side of [-1, 1]) {
      const leaf = moldedLeaf(w * 0.2, d * (0.38 - row * 0.02));
      leaf.rotateY(-side * (0.85 + row * 0.1));
      leaf.rotateZ(side * 0.12);
      const base = new Vector3(side * w * 0.08, (row - 1) * h * 0.12, (row - 1) * d * 0.24);
      leaf.translate(base.x, base.y, base.z);
      pieces.push(leaf);
      shades.push(0.82 + row * 0.07 + (side > 0 ? 0.08 : 0));
      stemBetween(new Vector3(0, base.y, base.z + d * 0.07), base, Math.min(w, d) * 0.02);
    }
  }
  const terminal = moldedLeaf(w * 0.18, d * 0.32);
  terminal.translate(0, -h * 0.12, -d * 0.24);
  pieces.push(terminal);
  shades.push(1.03);
  stemBetween(
    new Vector3(0, h * 0.15, d * 0.38),
    new Vector3(0, -h * 0.12, -d * 0.28),
    Math.min(w, d) * 0.03,
  );
  for (let index = 0; index < pieces.length; index++) {
    const values = new Float32Array(pieces[index].getAttribute("position").count * 3).fill(
      shades[index],
    );
    pieces[index].setAttribute("color", new Float32BufferAttribute(values, 3));
  }
  const result = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!result) throw new Error("The leaf sprig geometries must share their vertex attributes.");
  result.computeBoundingBox();
  const bounds = result.boundingBox!;
  const size = bounds.max.clone().sub(bounds.min);
  const center = bounds.max.clone().add(bounds.min).multiplyScalar(0.5);
  result.translate(-center.x, -center.y, -center.z);
  result.scale(w / size.x, h / size.y, d / size.z);
  return result;
}
function planter(w: number, h: number, detailed: boolean) {
  const r = w / 2 - 0.02;
  const wall = Math.min(0.16, w * 0.075);
  const bottom = -h / 2 + 0.02;
  const top = h / 2 - 0.02;
  return new LatheGeometry(
    [
      new Vector2(0, bottom),
      new Vector2(r * 0.69, bottom),
      new Vector2(r * 0.75, bottom + Math.min(0.09, h * 0.12)),
      new Vector2(r * 0.9, top - Math.min(0.16, h * 0.2)),
      new Vector2(r, top - Math.min(0.1, h * 0.12)),
      new Vector2(r, top - 0.025),
      new Vector2(r - 0.025, top),
      new Vector2(r - wall, top),
      new Vector2(r - wall - 0.025, top - 0.045),
      new Vector2(r * 0.7 - wall, bottom + Math.min(0.15, h * 0.2)),
      new Vector2(0, bottom + Math.min(0.15, h * 0.2)),
    ],
    detailed ? 40 : 20,
  );
}
function barrelTile(w: number, h: number, d: number, detailed: boolean) {
  const section = new Shape();
  const radius = w / 2 - 0.025;
  const rise = h * 0.25;
  section.moveTo(-radius, 0);
  section.absellipse(0, 0, radius, rise, Math.PI, 0, true, 0);
  section.lineTo(radius - 0.035, 0);
  section.absellipse(0, 0, radius - 0.035, Math.max(0.012, rise - 0.035), 0, Math.PI, false, 0);
  section.closePath();
  const geometry = extrude(section, d - 0.03, detailed, 0.009, detailed ? 12 : 6);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setY(
      index,
      positions.getY(index) - rise / 2 - (positions.getZ(index) / d) * h * 0.75,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}
export function buildArchitecturalGeometry(
  definition: PartDefinition,
  detailed: boolean,
): BufferGeometry | null {
  const { width: w, height: h, depth: d, shape } = definition;
  if (definition.id === "demo-gate-arch") return receivingPortal(definition, detailed);
  if (shape === "arch" || shape === "arch-panel")
    return archGeometry(w, h, d, shape === "arch-panel", detailed);
  if (shape === "arch-spandrel") {
    const outline = new Shape();
    const radius = w / 2 - 0.015;
    outline.moveTo(-radius, -h / 2 + 0.01);
    outline.lineTo(-radius, h / 2 - 0.01);
    outline.lineTo(radius, h / 2 - 0.01);
    outline.lineTo(radius, -h / 2 + 0.01);
    outline.absarc(0, -h / 2 + 0.01, radius, 0, Math.PI, false);
    outline.closePath();
    return extrude(outline, d, detailed, 0.012);
  }
  if (shape === "leaf") return leafSprig(w, h, d, detailed);
  if (shape === "leaf-upright") {
    const geometry = leafSprig(w, d, h, detailed);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }
  if (shape === "planter") return planter(w, h, detailed);
  if (shape === "roof-tile") return barrelTile(w, h, d, detailed);
  if (shape === "branch") {
    const wide = w > d * 1.5;
    const thickness = Math.min(w, d);
    const branch = new LatheGeometry(
      [
        new Vector2(0, -h / 2),
        new Vector2(thickness * 0.48, -h / 2 + 0.02),
        new Vector2(thickness * 0.38, -h / 2 + h * 0.08),
        new Vector2(thickness * 0.29, -h * 0.23),
        new Vector2(thickness * 0.23, h * 0.07),
        new Vector2(thickness * 0.17, h * 0.33),
        new Vector2(thickness * 0.1, h / 2),
        new Vector2(0, h / 2),
      ],
      detailed ? 14 : 8,
    );
    const position = branch.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const y = position.getY(index);
      position.setX(
        index,
        position.getX(index) +
          (wide
            ? (y / h) * (w - d) + Math.sin((y / h + 0.5) * Math.PI) * thickness * 0.09
            : Math.sin((y / h + 0.5) * Math.PI * 1.15) * w * 0.42),
      );
      position.setZ(index, position.getZ(index) + Math.sin((y / h) * Math.PI * 2) * d * 0.08);
    }
    branch.computeVertexNormals();
    branch.computeBoundingBox();
    const bounds = branch.boundingBox!;
    const size = bounds.max.clone().sub(bounds.min);
    const center = bounds.max.clone().add(bounds.min).multiplyScalar(0.5);
    branch.translate(wide ? 0 : -center.x, -center.y, -center.z);
    branch.scale(wide ? 1 : (w - 0.01) / size.x, (h - 0.02) / size.y, (d - 0.01) / size.z);
    return branch;
  }
  return null;
}
