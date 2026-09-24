import { describe, expect, it } from "vitest";
import {
  assessAttachments,
  type Model,
  type PartDefinition,
  type PartInstance,
} from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";

const definitions: readonly PartDefinition[] = [
  { id: "brick", name: "Brick", width: 1, depth: 1, height: 1.2, shape: "brick", studs: true },
  { id: "bridge", name: "Bridge", width: 2, depth: 1, height: 1.2, shape: "brick", studs: true },
  { id: "tile", name: "Tile", width: 1, depth: 1, height: 0.4, shape: "plate", studs: false },
  {
    id: "decoration",
    name: "Decoration",
    width: 0.2,
    depth: 0.2,
    height: 1.2,
    shape: "brick",
    studs: false,
  },
];

function instance(id: string, partId: string, x: number, y: number): PartInstance {
  return {
    id,
    partId,
    colorId: "ivory",
    groupId: "assembly",
    transform: { x, y, z: 0, rotation: 0 },
  };
}
function model(instances: readonly PartInstance[]): Model {
  return {
    id: "attachment-study",
    title: "Attachment study",
    baselineRevision: "r1",
    revision: "r2",
    groups: [{ id: "assembly", name: "Assembly", protected: false }],
    instances,
  };
}

describe("Nominal attachment paths", () => {
  it("distinguishes grounded construction, floating connected islands and unsupported pieces", () => {
    const source = model([
      instance("base", "brick", 0, 0.6),
      instance("upper", "brick", 0, 1.8),
      instance("floating-base", "brick", 5, 3),
      instance("floating-upper", "brick", 5, 4.2),
      instance("decorative-door", "decoration", 10, 0.6),
      instance("unknown", "missing-definition", 20, 0.6),
    ]);
    const before = structuredClone(source);
    const result = assessAttachments(source, definitions);
    expect(result.instances).toEqual([
      { id: "base", status: "ground-supported", contactIds: ["upper"] },
      { id: "upper", status: "connected-to-ground", contactIds: ["base"] },
      { id: "floating-base", status: "unattached", contactIds: ["floating-upper"] },
      { id: "floating-upper", status: "unattached", contactIds: ["floating-base"] },
      { id: "decorative-door", status: "unsupported", contactIds: [] },
      { id: "unknown", status: "unsupported", contactIds: [] },
    ]);
    expect(result.counts).toEqual({
      "ground-supported": 1,
      "connected-to-ground": 1,
      unattached: 2,
      unsupported: 2,
    });
    expect(result.modelRevision).toBe("r2");
    expect(result.physicalAssessment).toBe("not-evaluated");
    expect(source).toEqual(before);
  });

  it("follows contacts in both directions for a part hanging from a grounded bridge", () => {
    const result = assessAttachments(
      model([
        instance("hanging", "brick", 1, 1.8),
        instance("bridge", "bridge", 0.5, 3),
        instance("column", "brick", 0, 1.8),
        instance("base", "brick", 0, 0.6),
      ]),
      definitions,
    );
    expect(result.instances.find((part) => part.id === "hanging")).toEqual({
      id: "hanging",
      status: "connected-to-ground",
      contactIds: ["bridge"],
    });
    expect(result.counts).toEqual({
      "ground-supported": 1,
      "connected-to-ground": 3,
      unattached: 0,
      unsupported: 0,
    });
  });

  it("does not turn smooth tops, misaligned studs or buried pieces into ground connections", () => {
    const result = assessAttachments(
      model([
        instance("smooth", "tile", 0, 0.2),
        instance("above-smooth", "brick", 0, 1),
        instance("ground-brick", "brick", 5, 0.6),
        instance("misaligned", "brick", 5.5, 1.8),
        instance("buried", "brick", 10, 0.4),
      ]),
      definitions,
    );
    expect(
      result.instances.filter((part) => part.status === "unattached").map((part) => part.id),
    ).toEqual(["above-smooth", "misaligned", "buried"]);
  });

  it("cannot use unsupported geometry as a connection bridge, even with nominal stud sites", () => {
    const custom: PartDefinition = {
      id: "custom",
      name: "Custom",
      width: 1,
      depth: 1,
      height: 2,
      studs: true,
      shape: "brick",
    };
    const result = assessAttachments(
      model([
        instance("unknown-support", "custom", 0, 1),
        instance("supported-brick", "brick", 0, 2.6),
      ]),
      [...definitions, custom],
    );
    expect(result.instances).toEqual([
      { id: "unknown-support", status: "unsupported", contactIds: [] },
      { id: "supported-brick", status: "unattached", contactIds: [] },
    ]);
  });

  it("recomputes after removing a support and handles an empty model", () => {
    const upper = instance("upper", "brick", 0, 1.8);
    expect(
      assessAttachments(model([instance("base", "brick", 0, 0.6), upper]), definitions).counts
        .unattached,
    ).toBe(0);
    expect(assessAttachments(model([upper]), definitions).counts.unattached).toBe(1);
    expect(assessAttachments(model([]), definitions)).toMatchObject({
      instances: [],
      counts: { "ground-supported": 0, "connected-to-ground": 0, unattached: 0, unsupported: 0 },
    });
  });

  it.each(["demo-slope-2x4", "demo-slope-1x2", "demo-door-assembly-1x2x4"])(
    "uses the declared nominal connector capability of %s",
    (partId) => {
      const definition = partDefinitions.find((part) => part.id === partId)!;
      const source = model([
        instance("base", "demo-plate-4x4", 0, 0.2),
        {
          ...instance("attached", partId, 0, 0.4 + definition.height / 2),
          transform: {
            x: definition.width % 2 ? 0.5 : 0,
            y: 0.4 + definition.height / 2,
            z: definition.depth % 2 ? 0.5 : 0,
            rotation: 0,
          },
        },
      ]);
      expect(assessAttachments(source, partDefinitions).instances).toEqual([
        { id: "base", status: "ground-supported", contactIds: ["attached"] },
        { id: "attached", status: "connected-to-ground", contactIds: ["base"] },
      ]);
    },
  );
});
