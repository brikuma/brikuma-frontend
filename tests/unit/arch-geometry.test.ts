import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { partDefinitions } from "../../src/fixtures/catalog";
import { buildPartGeometry } from "../../src/features/editor/scene/part-geometry";

describe.each([true, false])("receiving portal, detailed=%s", (detailed) => {
  it("clears both lower studs inside actual hollow piers", () => {
    const definition = partDefinitions.find((part) => part.id === "demo-gate-arch")!;
    expect(definition.width).toBe(5);
    const geometry = buildPartGeometry(definition, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    try {
      for (const x of [-2, 2])
        for (let sample = 0; sample < 32; sample++) {
          const angle = (sample * Math.PI) / 16;
          const origin = new Vector3(
            x + Math.cos(angle) * 0.3,
            -definition.height,
            Math.sin(angle) * 0.3,
          );
          const hit = new Raycaster(origin, new Vector3(0, 1, 0)).intersectObject(mesh)[0];
          expect(hit).toBeDefined();
          expect(hit.point.y).toBeGreaterThan(-definition.height / 2 + 0.2);
        }
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("keeps the gate opening clear and fills the upper facade", () => {
    const definition = partDefinitions.find((part) => part.id === "demo-gate-arch")!;
    const geometry = buildPartGeometry(definition, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    const through = (x: number, y: number) =>
      new Raycaster(new Vector3(x, y, 2), new Vector3(0, 0, -1)).intersectObject(mesh);
    try {
      expect(through(0, 0)).toHaveLength(0);
      expect(through(0, 1.4)).toHaveLength(0);
      expect(through(0, 2.2).length).toBeGreaterThan(0);
      expect(through(2, -1).length).toBeGreaterThan(0);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });
});
