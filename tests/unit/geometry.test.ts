import { describe, expect, it } from "vitest";
import { partDefinitions } from "../../src/fixtures/catalog";
import { buildPartGeometry } from "../../src/features/editor/scene/part-geometry";

const bevelTolerance = 0.04;

describe.each([
  { name: "detailed", detailed: true },
  { name: "performance", detailed: false },
])("$name renderer geometry respects its public dimensions", ({ detailed }) => {
  it.each(partDefinitions)("keeps $id body inside its centered nominal bounds", (part) => {
    const geometry = buildPartGeometry(part, detailed);
    try {
      const positions = geometry.getAttribute("position");
      expect(positions.count).toBeGreaterThan(0);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      expect(bounds.isEmpty()).toBe(false);
      const dimensions = { x: part.width, y: part.height, z: part.depth };
      for (const axis of ["x", "y", "z"] as const) {
        expect(
          bounds.max[axis],
          `${part.id}: positive ${axis} exceeds the declared body`,
        ).toBeLessThanOrEqual(dimensions[axis] / 2 + bevelTolerance);
        expect(
          bounds.min[axis],
          `${part.id}: negative ${axis} exceeds the declared body`,
        ).toBeGreaterThanOrEqual(-dimensions[axis] / 2 - bevelTolerance);
        expect(bounds.max[axis] - bounds.min[axis]).toBeGreaterThan(0);
      }
    } finally {
      geometry.dispose();
    }
  });

  it("renders the wheel two studs high and deep with a 1.2-stud axle width", () => {
    const wheel = partDefinitions.find((part) => part.id === "demo-wheel-2x2")!;
    expect({ width: wheel.width, height: wheel.height, depth: wheel.depth }).toEqual({
      width: 1.2,
      height: 2,
      depth: 2,
    });
    const geometry = buildPartGeometry(wheel, detailed);
    try {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      for (const [axis, dimension] of [
        ["x", 1.2],
        ["y", 2],
        ["z", 2],
      ] as const) {
        const extent = bounds.max[axis] - bounds.min[axis];
        expect(
          extent,
          `Wheel ${axis} axis is smaller than its declared size`,
        ).toBeGreaterThanOrEqual(dimension - 0.06);
        expect(extent, `Wheel ${axis} axis exceeds its declared size`).toBeLessThanOrEqual(
          dimension + bevelTolerance,
        );
      }
      // The editor centers this two-stud-high part at Y=1 on the ground plane.
      // A rotated cylinder with the wrong nominal axes either sinks or floats here.
      const groundClearance = 1 + bounds.min.y;
      expect(groundClearance).toBeGreaterThanOrEqual(-bevelTolerance);
      expect(groundClearance).toBeLessThanOrEqual(0.04);
    } finally {
      geometry.dispose();
    }
  });
});
