import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Ray,
  Raycaster,
  Vector3,
} from "three";
import { convertedProjection, modelBounds } from "../../src/features/editor/scene/scene-camera";
import {
  clippedInstanceRaycast,
  instancePartId,
  partIsPresented,
} from "../../src/features/editor/scene/picking";
import { intersectWorkplane } from "../../src/features/editor/scene/editing-plane";
import { previewTransform } from "../../src/features/editor/scene/part-batch";
import type { Model, PartInstance } from "../../src/core/model/public";

const part: PartInstance = {
  id: "a",
  partId: "demo-brick-2x4",
  groupId: "group",
  colorId: "ivory",
  transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
};
const model: Model = {
  id: "empty",
  title: "Empty",
  revision: "r1",
  baselineRevision: "r1",
  instances: [],
  groups: [],
};

describe("Specialist rendering contracts", () => {
  it("EDT-026/045: focused and step layers share exact visible membership for bodies and selection helpers", () => {
    const layers = { hidden: ["a"], focusIds: ["a", "b"], presentationIds: ["a", "c"] };
    expect(partIsPresented(part, layers)).toBe(true);
    expect(partIsPresented({ ...part, id: "b" }, layers)).toBe(false);
    expect(partIsPresented({ ...part, id: "c" }, layers)).toBe(false);
    expect(partIsPresented(part, { hidden: ["a"] })).toBe(false);
  });
  it("EDT-001/028: empty fit is finite and visible bounds omit hidden IDs and groups", () => {
    const empty = modelBounds(model, [], new Map());
    expect(empty.isEmpty()).toBe(false);
    expect(empty.getSize(new Vector3()).toArray().every(Number.isFinite)).toBe(true);
    const scene = {
      ...model,
      instances: [
        part,
        { ...part, id: "far", groupId: "far-group", transform: { ...part.transform, x: 100 } },
      ],
    };
    expect(modelBounds(scene, ["far"], new Map()).max.x).toBe(2);
    expect(modelBounds(scene, ["far-group"], new Map()).max.x).toBe(2);
  });

  it("EDT-029: projection conversion preserves target-plane scale and orientation", () => {
    const camera = new OrthographicCamera(-400, 400, 300, -300, 0.1, 2000);
    camera.zoom = 20;
    const target = new Vector3(4, 5, 6);
    camera.position.set(30, 40, 50);
    camera.lookAt(target);
    const perspective = convertedProjection(camera, "perspective", target, 800, 600);
    expect(perspective).toBeInstanceOf(PerspectiveCamera);
    if (!(perspective instanceof PerspectiveCamera)) throw new Error("Expected perspective camera");
    const height =
      2 * perspective.position.distanceTo(target) * Math.tan((perspective.fov * Math.PI) / 360);
    expect(height).toBeCloseTo(30, 8);
    expect(perspective.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0);
    const orthographic = convertedProjection(perspective, "orthographic", target, 800, 600);
    expect(orthographic).toBeInstanceOf(OrthographicCamera);
    expect(orthographic.zoom).toBeCloseTo(20, 8);
  });

  it("EDT-012: repacked body and stud slots resolve current stable IDs", () => {
    expect(instancePartId(["a", "b", "c"], 8, 8)).toBe("b");
    expect(instancePartId(["a", "c"], 8, 8)).toBe("c");
    expect(instancePartId(["a"], 1)).toBeUndefined();
    expect(instancePartId(["a"], -1)).toBeUndefined();
  });

  it("EDT-040: sectioned surface filtering occurs before instance hit deduplication", () => {
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshBasicMaterial();
    const mesh = new InstancedMesh(geometry, material, 2);
    mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, 0, 0));
    mesh.setMatrixAt(1, new Matrix4().makeTranslation(0, 0, -4));
    mesh.raycast = clippedInstanceRaycast({ axis: "z", offset: -2 });
    mesh.updateMatrixWorld();
    try {
      const hits = new Raycaster(new Vector3(0, 0, 8), new Vector3(0, 0, -1)).intersectObject(mesh);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((hit) => hit.instanceId === 1 && hit.point.z <= -2)).toBe(true);
    } finally {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    }
  });

  it("EDT-039: vertical workplanes and grazing rejection retain the canonical frame", () => {
    const hit = intersectWorkplane(new Ray(new Vector3(5, 2, 3), new Vector3(-1, 0, 0)), {
      axis: "x",
      offset: 1,
    });
    expect(hit?.toArray()).toEqual([1, 2, 3]);
    expect(
      intersectWorkplane(new Ray(new Vector3(0, 2, 0), new Vector3(1, 0, 0)), {
        axis: "y",
        offset: 1,
      }),
    ).toBeNull();
  });

  it("EDT-018: collection drag previews preserve the immutable starting relationship", () => {
    const other = { ...part, id: "b", transform: { ...part.transform, x: 4 } };
    const before = structuredClone(other);
    const drag = {
      id: "a",
      transform: { ...part.transform, x: 2 },
      ids: ["a", "b"],
      delta: { x: 2, y: 0, z: 0 },
    };
    expect(previewTransform(other, drag).x).toBe(6);
    expect(previewTransform(other, null)).toEqual(before.transform);
    expect(other).toEqual(before);
  });
});
