import { describe, expect, it } from "vitest";
import { Ray, Vector3 } from "three";
import { intersectEditingPlane } from "../../src/features/editor/scene/editing-plane";

describe("horizontal editing plane", () => {
  it.each([0, -1e-12, -0.001])("rejects elevation rays with vertical component %s", (y) => {
    const ray = new Ray(new Vector3(0, 2, 10), new Vector3(0, y, -1).normalize());
    expect(intersectEditingPlane(ray, 0)).toBeNull();
  });

  it("places a top-view ray on the requested support height", () => {
    const ray = new Ray(new Vector3(2.5, 20, -3), new Vector3(0, -1, 0));
    const hit = intersectEditingPlane(ray, 1.2);
    expect(hit?.x).toBe(2.5);
    expect(hit?.y).toBeCloseTo(1.2);
    expect(hit?.z).toBe(-3);
  });

  it("keeps an isometric drag intersection on the part's original height", () => {
    const ray = new Ray(new Vector3(10, 10, 10), new Vector3(-1, -1, -1).normalize());
    const hit = intersectEditingPlane(ray, 3);
    expect(hit?.x).toBeCloseTo(3);
    expect(hit?.y).toBeCloseTo(3);
    expect(hit?.z).toBeCloseTo(3);
  });
});
