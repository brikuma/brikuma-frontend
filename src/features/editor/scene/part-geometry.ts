import { BufferGeometry, Float32BufferAttribute, LatheGeometry, Vector2 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { PartDefinition } from "@/core/model/public";
import { buildArchitecturalGeometry } from "./architectural-geometry";
import { buildJoineryGeometry } from "./joinery-geometry";
import { buildDoorAssemblyGeometry } from "./door-geometry";
import {
  buildBrickShell,
  buildRoundBrickShell,
  buildSlopedBrickShell,
  BODY_SIDE_CLEARANCE,
  BODY_VERTICAL_CLEARANCE,
  STUD_HEIGHT,
} from "./brick-geometry";

export function buildPartGeometry(definition: PartDefinition, detailed = true) {
  const { width: w, height: h, depth: d, shape } = definition;
  const door = buildDoorAssemblyGeometry(definition, detailed);
  if (door) return door;
  const joinery = buildJoineryGeometry(definition, detailed);
  if (joinery) return joinery;
  const architectural = buildArchitecturalGeometry(definition, detailed);
  if (architectural) return architectural;
  if (shape === "cylinder") {
    if (definition.studs) return buildRoundBrickShell(definition, detailed);
    const wheel = definition.id.includes("wheel");
    const height = (wheel ? w : h) - 0.025;
    const radius = (wheel ? h : w) / 2 - 0.025;
    const bevel = Math.min(0.045, height / 5);
    const geometry = new LatheGeometry(
      [
        new Vector2(0, -height / 2),
        new Vector2(radius - bevel, -height / 2),
        new Vector2(radius, -height / 2 + bevel),
        new Vector2(radius, height / 2 - bevel),
        new Vector2(radius - bevel, height / 2),
        new Vector2(0, height / 2),
      ],
      detailed ? 32 : 16,
    );
    if (wheel) geometry.rotateZ(Math.PI / 2);
    return geometry;
  }
  if (shape === "slope") {
    const shell = buildSlopedBrickShell(definition, detailed);
    if (shell) return shell;
    const x = w / 2 - 0.025;
    const z = d / 2 - 0.025;
    const y = h / 2 - 0.015;
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        [
          -x,
          -y,
          -z,
          x,
          -y,
          -z,
          x,
          -y,
          z,
          -x,
          -y,
          z,
          -x,
          y,
          -z,
          x,
          y,
          -z,
          -x,
          -y + 0.06,
          z,
          x,
          -y + 0.06,
          z,
        ],
        3,
      ),
    );
    geometry.setIndex([
      0, 1, 2, 0, 2, 3, 0, 5, 1, 0, 4, 5, 4, 7, 5, 4, 6, 7, 3, 7, 6, 3, 2, 7, 0, 6, 4, 0, 3, 6, 1,
      7, 2, 1, 5, 7,
    ]);
    const flat = geometry.toNonIndexed();
    geometry.dispose();
    flat.computeVertexNormals();
    return flat;
  }
  return (
    buildBrickShell(definition, detailed) ??
    new RoundedBoxGeometry(
      w - BODY_SIDE_CLEARANCE,
      h - BODY_VERTICAL_CLEARANCE,
      d - BODY_SIDE_CLEARANCE,
      detailed ? 2 : 1,
      Math.min(0.025, Math.min(w, h, d) / 8),
    )
  );
}

export function buildStudGeometry(detailed = true) {
  return new LatheGeometry(
    [
      new Vector2(0, -0.012),
      new Vector2(0.3, -0.012),
      new Vector2(0.3, 0.001),
      new Vector2(0.297, 0.009),
      new Vector2(0.296, 0.02),
      new Vector2(0.296, STUD_HEIGHT - 0.016),
      new Vector2(0.292, STUD_HEIGHT - 0.006),
      new Vector2(0.282, STUD_HEIGHT),
      new Vector2(0, STUD_HEIGHT),
    ],
    detailed ? 24 : 12,
  );
}
