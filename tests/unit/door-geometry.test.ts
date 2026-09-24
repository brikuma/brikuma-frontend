import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { getPartConnections } from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";
import { buildPartGeometry } from "../../src/features/editor/scene/part-geometry";

const door = partDefinitions.find((part) => part.id === "demo-door-assembly-1x2x4")!;

describe.each([true, false])("Door assembly rendered geometry, detailed=%s", (detailed) => {
  it("renders hollow sill receivers that clear the lower studs", () => {
    const geometry = buildPartGeometry(door, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    try {
      for (const receiver of getPartConnections(door).receivers) {
        for (let sample = 0; sample < 24; sample++) {
          const angle = (sample * Math.PI) / 12;
          const origin = new Vector3(
            receiver.x + Math.cos(angle) * 0.3,
            -3,
            receiver.z + Math.sin(angle) * 0.3,
          );
          const hit = new Raycaster(origin, new Vector3(0, 1, 0)).intersectObject(mesh)[0];
          expect(hit).toBeDefined();
          expect(hit.point.y).toBeGreaterThan(-door.height / 2 + 0.2);
        }
      }
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("shows a recessed leaf, projecting hinge journals, a frame and a real clearance seam", () => {
    const geometry = buildPartGeometry(door, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    const hit = (x: number, y: number) =>
      new Raycaster(new Vector3(x, y, 1), new Vector3(0, 0, -1)).intersectObject(mesh)[0];
    try {
      expect(hit(0, 0).point.z).toBeCloseTo(0.08);
      expect(hit(-0.7, 1.25).point.z).toBeCloseTo(0.14);
      expect(hit(0.9, 0).point.z).toBeGreaterThan(0.45);
      expect(hit(0.78, 0)).toBeUndefined();
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });
});
