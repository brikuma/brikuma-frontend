import { BufferGeometry, ExtrudeGeometry, Shape } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PartDefinition } from "@/core/model/public";
import { BODY_SIDE_CLEARANCE, BODY_VERTICAL_CLEARANCE } from "./brick-geometry";

function merge(pieces: BufferGeometry[]) {
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error("Joinery surfaces must share their vertex attributes.");
  return geometry;
}

/** Original small tenon joints used by the authored pergola, not standard studs. */
export function buildJoineryGeometry(definition: PartDefinition, detailed: boolean) {
  const { width, height, depth } = definition;
  const segments = detailed ? 2 : 1;
  if (definition.id === "demo-pergola-post") {
    const shaft = new RoundedBoxGeometry(
      width - BODY_SIDE_CLEARANCE,
      height - BODY_VERTICAL_CLEARANCE - 0.1,
      depth - BODY_SIDE_CLEARANCE,
      segments,
      0.016,
    );
    shaft.translate(0, -0.05, 0);
    const tenon = new RoundedBoxGeometry(0.14, 0.12, 0.14, segments, 0.006);
    tenon.translate(0, height / 2 - BODY_VERTICAL_CLEARANCE / 2 - 0.06, 0);
    return merge([shaft, tenon]);
  }
  if (definition.id !== "demo-beam-1x4" || height < 0.35) return null;
  const halfDepth = (depth - BODY_SIDE_CLEARANCE) / 2;
  const bottom = -(height - BODY_VERTICAL_CLEARANCE) / 2;
  const top = -bottom;
  const shoulder = top - 0.1;
  const groove = 0.09;
  const ceiling = bottom + 0.14;
  const section = new Shape();
  section.moveTo(-halfDepth, bottom);
  section.lineTo(-groove, bottom);
  section.lineTo(-groove, ceiling);
  section.lineTo(groove, ceiling);
  section.lineTo(groove, bottom);
  section.lineTo(halfDepth, bottom);
  section.lineTo(halfDepth, shoulder);
  section.lineTo(-halfDepth, shoulder);
  section.closePath();
  const length = width - BODY_SIDE_CLEARANCE;
  const body = new ExtrudeGeometry(section, {
    depth: length - 0.016,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: detailed ? 2 : 1,
  });
  body.translate(0, 0, -length / 2 + 0.008);
  body.rotateY(Math.PI / 2);
  const pieces: BufferGeometry[] = [body];
  for (let x = -width / 2; x <= width / 2; x++) {
    const left = Math.max(-length / 2, x - 0.07);
    const right = Math.min(length / 2, x + 0.07);
    if (right <= left) continue;
    const peg = new RoundedBoxGeometry(right - left, 0.115, 0.14, segments, 0.005);
    peg.translate((left + right) / 2, top - 0.115 / 2, 0);
    pieces.push(peg);
  }
  return merge(pieces);
}
