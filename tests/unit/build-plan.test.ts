import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createSession,
  deriveBom,
  generateBuildPlan,
  isBuildPlanCurrent,
  type Model,
  type PartInstance,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

function part(id: string, x: number, y: number, partId = "demo-brick-1x2"): PartInstance {
  return {
    id,
    partId,
    groupId: "model",
    colorId: "ivory",
    transform: { x, y, z: 0.5, rotation: 0 },
  };
}
const model: Model = {
  id: "manual",
  title: "Manual build",
  baselineRevision: "r1",
  revision: "manual-local-8",
  groups: [{ id: "model", name: "My model", protected: false }],
  instances: [
    part("roof", 0, 3, "demo-slope-2x4"),
    part("wall-right", 1, 1.8),
    part("base-left", -1, 0.6),
    part("wall-left", -1, 1.8),
    part("base-right", 1, 0.6),
  ],
};

describe("Local generated instruction plans", () => {
  it("uses current coordinates to order layers, with exact additions and cumulative membership", () => {
    const before = structuredClone(model);
    const result = generateBuildPlan(model, partDefinitions);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.steps.map((step) => step.newPartIds)).toEqual([
      ["base-left", "base-right"],
      ["wall-left", "wall-right"],
      ["roof"],
    ]);
    expect(result.value.steps.map((step) => step.visiblePartIds.length)).toEqual([2, 4, 5]);
    expect(result.value.steps.at(-1)!.visiblePartIds.slice().sort()).toEqual(
      model.instances.map((part) => part.id).sort(),
    );
    expect(result.value.layerCount).toBe(3);
    expect(result.value.pieceCount).toBe(5);
    expect(result.value.physicalAssessment).toBe("not-evaluated");
    expect(
      generateBuildPlan(
        { ...model, instances: [...model.instances].reverse() },
        [...partDefinitions].reverse(),
      ),
    ).toEqual(result);
    expect(model).toEqual(before);
    expect(deriveBom(model)).toEqual(deriveBom(before));
  });

  it("splits a large layer into small steps without duplicate or missing pieces", () => {
    const large = {
      ...model,
      instances: Array.from({ length: 19 }, (_, index) => part(`brick-${index}`, index * 2, 0.6)),
    };
    const result = generateBuildPlan(large, partDefinitions);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.steps.map((step) => step.newPartIds.length)).toEqual([8, 8, 3]);
    expect(result.value.layerCount).toBe(1);
    expect(new Set(result.value.steps.flatMap((step) => step.newPartIds)).size).toBe(19);
    expect(result.value.steps.at(-1)!.visiblePartIds).toHaveLength(19);
  });

  it("invalidates on edits and also detects changed source data that reuses the same revision", () => {
    const result = generateBuildPlan(model, partDefinitions);
    if (!result.ok) throw new Error(result.error.message);
    expect(isBuildPlanCurrent(model, result.value)).toBe(true);
    const edited = applyCommand(
      createSession(model),
      { type: "recolor", id: "roof", colorId: "teal" },
      editPolicy,
    );
    if (!edited.ok) throw new Error(edited.error.message);
    expect(isBuildPlanCurrent(edited.value.present, result.value)).toBe(false);
    expect(
      isBuildPlanCurrent({ ...edited.value.present, revision: model.revision }, result.value),
    ).toBe(false);
    expect(
      isBuildPlanCurrent({ ...model, instances: model.instances.slice(1) }, result.value),
    ).toBe(false);
    expect(
      isBuildPlanCurrent(
        { ...model, groups: model.groups.map((group) => ({ ...group, protected: true })) },
        result.value,
      ),
    ).toBe(true);
    const regenerated = generateBuildPlan(edited.value.present, partDefinitions);
    expect(regenerated.ok && isBuildPlanCurrent(edited.value.present, regenerated.value)).toBe(
      true,
    );
  });

  it("keeps unsupported visual pieces in the draft and identifies their unchecked coverage", () => {
    const source = {
      ...model,
      instances: [...model.instances, part("loose-door", 4, 1.4, "demo-door-leaf")],
    };
    const result = generateBuildPlan(source, partDefinitions);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.uncheckedPartIds).toEqual(["loose-door"]);
    expect(result.value.steps.at(-1)!.visiblePartIds).toContain("loose-door");
  });

  it("rejects empty, unknown, duplicate and invalid inputs without mutation", () => {
    const sources = [
      { ...model, instances: [] },
      { ...model, instances: [part("unknown", 0, 0.6, "not-in-catalog")] },
      { ...model, instances: [model.instances[0], model.instances[0]] },
      { ...model, instances: [part("invalid", 0.12, 0.6)] },
    ];
    for (const source of sources) {
      const before = structuredClone(source);
      expect(generateBuildPlan(source, partDefinitions).ok).toBe(false);
      expect(source).toEqual(before);
    }
  });
});
