import { describe, expect, it } from "vitest";
import type { PartInstance, QuarterTurn } from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";
import { snapPlacementCenter } from "../../src/features/editor/placement-grid";

const single = partDefinitions.find((part) => part.id === "demo-brick-1x1")!;
const double = partDefinitions.find((part) => part.id === "demo-brick-1x2")!;
const base = partDefinitions.find((part) => part.id === "demo-brick-2x4")!;
const support: PartInstance = {
  id: "support",
  partId: base.id,
  groupId: "assembly",
  colorId: "ivory",
  transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
};

describe("connector grid placement", () => {
  it("places a single stud on a support stud rather than between four studs", () => {
    const position = snapPlacementCenter({ x: 0.12, z: 0.2 }, single, 0, {
      part: support,
      definition: base,
    });
    expect(position).toEqual({ x: 0.5, z: 0.5 });
  });

  it.each([0, 90, 180, 270] as QuarterTurn[])(
    "aligns each connector of a rotated 1×2 brick at %s degrees",
    (rotation) => {
      const position = snapPlacementCenter({ x: 0.2, z: 0.1 }, double, rotation, {
        part: support,
        definition: base,
      });
      const alongX = rotation % 180 === 0;
      for (const offset of [-0.5, 0.5]) {
        const stud = {
          x: position.x + (alongX ? offset : 0),
          z: position.z + (alongX ? 0 : offset),
        };
        expect(Number.isInteger(stud.x - 0.5)).toBe(true);
        expect(Number.isInteger(stud.z - 0.5)).toBe(true);
      }
    },
  );

  it("inherits a translated and rotated support's connector phase", () => {
    const part = { ...support, transform: { x: 2.5, y: 1, z: -1, rotation: 90 as const } };
    expect(snapPlacementCenter({ x: 2.2, z: -0.9 }, single, 0, { part, definition: base })).toEqual(
      {
        x: 2,
        z: -0.5,
      },
    );
  });

  it("keeps odd and even footprints on the same ground connector grid", () => {
    expect(snapPlacementCenter({ x: 0.1, z: 0.1 }, base, 0)).toEqual({ x: 0, z: 0 });
    expect(snapPlacementCenter({ x: 0.1, z: 0.1 }, single, 0)).toEqual({ x: 0.5, z: 0.5 });
  });

  it("preserves the free-form half-stud grid for nonstandard footprints", () => {
    expect(snapPlacementCenter({ x: 0.3, z: -0.8 }, { ...single, width: 1.25 }, 0)).toEqual({
      x: 0.5,
      z: -1,
    });
  });
});
