import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { partDefinitions } from "../../src/fixtures/catalog";
import { buildPartGeometry } from "../../src/features/editor/scene/part-geometry";

describe.each([true, false])("authored pergola joints, detailed=%s", (detailed) => {
  it("seats the post tenon inside the lower beam groove", () => {
    const postDefinition = partDefinitions.find((part) => part.id === "demo-pergola-post")!;
    const beamDefinition = partDefinitions.find((part) => part.id === "demo-beam-1x4")!;
    expect(beamDefinition.height).toBe(0.4);
    const post = buildPartGeometry(postDefinition, detailed);
    const beam = buildPartGeometry(beamDefinition, detailed);
    const material = new MeshBasicMaterial();
    const postMesh = new Mesh(post, material);
    const beamMesh = new Mesh(beam, material);
    postMesh.position.y = 2.6;
    beamMesh.position.y = 4.5;
    postMesh.updateMatrixWorld();
    beamMesh.updateMatrixWorld();
    try {
      for (const x of [-0.065, 0, 0.065])
        for (const z of [-0.065, 0, 0.065]) {
          const fromAbove = new Raycaster(new Vector3(x, 6, z), new Vector3(0, -1, 0));
          const postTop = fromAbove.intersectObject(postMesh)[0].point.y;
          const receiver = new Raycaster(
            new Vector3(x, 4, z),
            new Vector3(0, 1, 0),
          ).intersectObject(beamMesh)[0].point.y;
          expect(postTop).toBeGreaterThan(4.3);
          expect(postTop).toBeLessThan(receiver);
        }
      const shoulder = new Raycaster(
        new Vector3(0.13, 6, 0),
        new Vector3(0, -1, 0),
      ).intersectObject(postMesh)[0];
      expect(shoulder.point.y).toBeLessThan(4.3);
    } finally {
      post.dispose();
      beam.dispose();
      material.dispose();
    }
  });

  it("fits lower-beam pegs into an orthogonal slat without shoulder overlap", () => {
    const definition = partDefinitions.find((part) => part.id === "demo-beam-1x4")!;
    const geometry = buildPartGeometry(definition, detailed);
    const material = new MeshBasicMaterial();
    const lower = new Mesh(geometry, material);
    const upper = new Mesh(geometry, material);
    lower.position.y = 4.5;
    upper.position.y = 4.8;
    upper.rotation.y = Math.PI / 2;
    lower.updateMatrixWorld();
    upper.updateMatrixWorld();
    try {
      for (const x of [-0.06, 0, 0.06])
        for (const z of [-0.06, 0, 0.06]) {
          const peg = new Raycaster(new Vector3(x, 6, z), new Vector3(0, -1, 0)).intersectObject(
            lower,
          )[0];
          const receiver = new Raycaster(
            new Vector3(x, 4.5, z),
            new Vector3(0, 1, 0),
          ).intersectObject(upper)[0];
          expect(peg.point.y).toBeGreaterThan(4.6);
          expect(peg.point.y).toBeLessThan(receiver.point.y);
        }
      const shoulder = new Raycaster(
        new Vector3(0.13, 6, 0),
        new Vector3(0, -1, 0),
      ).intersectObject(lower)[0];
      const upperSide = new Raycaster(
        new Vector3(0.13, 4.5, 0),
        new Vector3(0, 1, 0),
      ).intersectObject(upper)[0];
      expect(shoulder.point.y).toBeLessThan(upperSide.point.y);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });
});
