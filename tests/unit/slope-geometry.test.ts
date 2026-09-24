import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { partDefinitions } from "../../src/fixtures/catalog";
import { buildPartGeometry } from "../../src/features/editor/scene/part-geometry";

describe.each([true, false])("slope receiver geometry, detailed=%s", (detailed) => {
  it.each(["demo-slope-2x4", "demo-slope-1x2", "demo-roof-bed"])(
    "clears every lower stud on %s",
    (id) => {
      const definition = partDefinitions.find((part) => part.id === id)!;
      const geometry = buildPartGeometry(definition, detailed);
      const material = new MeshBasicMaterial();
      const mesh = new Mesh(geometry, material);
      try {
        const studTip = -definition.height / 2 + 0.19;
        for (let x = 0; x < definition.width; x++) {
          for (let z = 0; z < definition.depth; z++) {
            for (let sample = 0; sample < 24; sample++) {
              const angle = (sample * Math.PI) / 12;
              const origin = new Vector3(
                x - (definition.width - 1) / 2 + Math.cos(angle) * 0.3,
                -definition.height,
                z - (definition.depth - 1) / 2 + Math.sin(angle) * 0.3,
              );
              const hit = new Raycaster(origin, new Vector3(0, 1, 0)).intersectObject(mesh)[0];
              expect(hit, "The shell must still have a ceiling above each receiver").toBeDefined();
              expect(hit.point.y).toBeGreaterThan(studTip);
            }
          }
        }
      } finally {
        geometry.dispose();
        material.dispose();
      }
    },
  );

  it("keeps the high side at negative Z and an open underside", () => {
    const definition = partDefinitions.find((part) => part.id === "demo-slope-2x4")!;
    const geometry = buildPartGeometry(definition, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    try {
      const high = new Raycaster(new Vector3(0.5, 2, -0.7), new Vector3(0, -1, 0)).intersectObject(
        mesh,
      )[0];
      const low = new Raycaster(new Vector3(0.5, 2, 0.7), new Vector3(0, -1, 0)).intersectObject(
        mesh,
      )[0];
      expect(high.point.y - low.point.y).toBeGreaterThan(0.5);
      const below = new Raycaster(new Vector3(0.5, -2, -0.5), new Vector3(0, 1, 0)).intersectObject(
        mesh,
      )[0];
      expect(below.point.y).toBeGreaterThan(-definition.height / 2 + 0.2);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });
});
