import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import type { PartDefinition } from "../../src/core/model/public";
import {
  buildPartGeometry,
  buildStudGeometry,
} from "../../src/features/editor/scene/part-geometry";

const brick: PartDefinition = {
  id: "test-brick-2x4",
  name: "Test brick",
  width: 4,
  height: 1.2,
  depth: 2,
  shape: "brick",
  studs: true,
};

describe.each([true, false])("brick connection geometry, detailed=%s", (detailed) => {
  it("has open cavities and hollow tubes beneath the top skin", () => {
    const geometry = buildPartGeometry(brick, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    const fromBelow = (x: number, z: number) => {
      const ray = new Raycaster(new Vector3(x, -2, z), new Vector3(0, 1, 0));
      return ray.intersectObject(mesh)[0]?.point.y;
    };
    try {
      // Stud-grid locations enter the cavity; the middle tube is open through its center.
      expect(fromBelow(0.5, 0.5)).toBeCloseTo(0.47);
      expect(fromBelow(0, 0)).toBeCloseTo(0.47);
      // The tube annulus and perimeter lip are real material near the underside.
      expect(fromBelow(0.35, 0)).toBeCloseTo(-0.565);
      expect(fromBelow(1.9, 0)).toBeCloseTo(-0.59);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("leaves room for a lower stud beneath a plate ceiling", () => {
    const geometry = buildPartGeometry({ ...brick, height: 0.4, shape: "plate" }, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    try {
      const ray = new Raycaster(new Vector3(0.5, -1, 0.5), new Vector3(0, 1, 0));
      const ceiling = ray.intersectObject(mesh)[0]?.point.y;
      expect(ceiling).toBeCloseTo(0.07);
      expect(ceiling! - -0.2).toBeGreaterThan(0.2);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("keeps the studded round brick cavity and central tube open", () => {
    const geometry = buildPartGeometry({ ...brick, width: 2, shape: "cylinder" }, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    try {
      const ray = new Raycaster(new Vector3(0, -2, 0), new Vector3(0, 1, 0));
      expect(ray.intersectObject(mesh)[0]?.point.y).toBeCloseTo(0.47);
      ray.ray.origin.x = 0.35;
      expect(ray.intersectObject(mesh)[0]?.point.y).toBeCloseTo(-0.565);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("clears all four lower studs through the round brick's scalloped rim", () => {
    const geometry = buildPartGeometry({ ...brick, width: 2, shape: "cylinder" }, detailed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    try {
      for (const x of [-0.5, 0.5])
        for (const z of [-0.5, 0.5]) {
          for (let sample = 0; sample < 32; sample++) {
            const angle = (sample * Math.PI) / 16;
            const origin = new Vector3(x + Math.cos(angle) * 0.3, -1, z + Math.sin(angle) * 0.3);
            const hit = new Raycaster(origin, new Vector3(0, 1, 0)).intersectObject(mesh)[0];
            // Lower studs reach Y=-0.41; any circular rim hit below that would intersect them.
            if (hit) expect(hit.point.y).toBeGreaterThan(-0.4);
          }
        }
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("has a 0.6-stud diameter and 0.2-stud exposed height", () => {
    const geometry = buildStudGeometry(detailed);
    try {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(0.6);
      expect(bounds.max.z - bounds.min.z).toBeCloseTo(0.6);
      expect(bounds.max.y).toBeCloseTo(0.2);
      expect(bounds.min.y).toBeLessThan(0);
    } finally {
      geometry.dispose();
    }
  });
});
