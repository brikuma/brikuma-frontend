import { describe, expect, it } from "vitest";
import {
  applyBuildPlanEdit,
  createBuildPlanSession,
  editBuildPlan,
  generateBuildPlan,
  isBuildPlanCurrent,
  redoBuildPlan,
  undoBuildPlan,
  type BuildPlanEdit,
  type DraftBuildPlan,
  type Model,
  type Result,
} from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";

const model: Model = {
  id: "editable-guide",
  title: "Small tower",
  baselineRevision: "tower-r1",
  revision: "tower-r1",
  groups: [{ id: "tower", name: "Tower", protected: false }],
  instances: Array.from({ length: 5 }, (_, index) => ({
    id: `brick-${index + 1}`,
    partId: "demo-brick-2x2",
    colorId: "ivory",
    groupId: "tower",
    transform: { x: (index % 2) * 2, y: Math.floor(index / 2) * 1.2 + 0.6, z: 0, rotation: 0 },
  })),
};
function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
const original = () => value(generateBuildPlan(model, partDefinitions));

function expectExactMembership(plan: DraftBuildPlan) {
  const sourceIds = model.instances.map((part) => part.id).sort();
  expect(plan.steps.flatMap((step) => step.newPartIds).sort()).toEqual(sourceIds);
  for (let index = 0; index < plan.steps.length; index++)
    expect(plan.steps[index].visiblePartIds).toEqual(
      plan.steps.slice(0, index + 1).flatMap((step) => step.newPartIds),
    );
  expect(plan.pieceCount).toBe(model.instances.length);
  expect(plan.physicalAssessment).toBe("not-evaluated");
  expect(isBuildPlanCurrent(model, plan)).toBe(true);
}

describe("Editable instruction plans", () => {
  it("edits a title, notes and saved view while preserving source geometry and identities", () => {
    const plan = original();
    const before = structuredClone(plan);
    const source = structuredClone(model);
    const edited = value(
      applyBuildPlanEdit(plan, {
        type: "update-step",
        stepId: plan.steps[0].id,
        title: "  Build the foot  ",
        description: "Align the two base bricks.",
        view: "top",
      }),
    );
    expect(edited.steps[0]).toMatchObject({
      title: "Build the foot",
      description: "Align the two base bricks.",
      view: "top",
    });
    expect(edited.steps[0].id).toBe(plan.steps[0].id);
    expectExactMembership(edited);
    expect(plan).toEqual(before);
    expect(model).toEqual(source);
  });

  it("reorders steps and rebuilds cumulative visibility in the new editorial order", () => {
    const plan = original();
    const moved = value(
      applyBuildPlanEdit(plan, {
        type: "move-step",
        stepId: plan.steps[1].id,
        direction: "earlier",
      }),
    );
    expect(moved.steps.map((step) => step.id)).toEqual([
      plan.steps[1].id,
      plan.steps[0].id,
      plan.steps[2].id,
    ]);
    expect(moved.steps[0].visiblePartIds).toEqual(["brick-3", "brick-4"]);
    expectExactMembership(moved);
    const restored = value(
      applyBuildPlanEdit(moved, {
        type: "move-step",
        stepId: plan.steps[1].id,
        direction: "later",
      }),
    );
    expect(restored).toEqual(plan);
  });

  it("splits only selected new pieces into the following step then merges without losing notes", () => {
    const plan = original();
    const split = value(
      applyBuildPlanEdit(plan, {
        type: "split-step",
        stepId: plan.steps[0].id,
        partIds: ["brick-2"],
        newStepId: "base-detail",
      }),
    );
    expect(split.steps.map((step) => step.newPartIds)).toEqual([
      ["brick-1"],
      ["brick-2"],
      ["brick-3", "brick-4"],
      ["brick-5"],
    ]);
    expect(split.steps[1]).toMatchObject({ id: "base-detail", view: "isometric" });
    expect(split.steps[0].title).toBe("Layer 1 · 1 piece");
    expect(split.steps[1].title).toBe("Layer 1 · 1 piece");
    expect(split.steps[0].description).toContain("highlighted piece in");
    expectExactMembership(split);
    const notes = value(
      applyBuildPlanEdit(split, {
        type: "update-step",
        stepId: "base-detail",
        description: "Keep this second note.",
      }),
    );
    const merged = value(
      applyBuildPlanEdit(notes, { type: "merge-next", stepId: plan.steps[0].id }),
    );
    expect(merged.steps[0].description).toContain("Keep this second note.");
    expect(merged.steps[0].title).toBe("Combined step · 2 pieces");
    expect(merged.steps.map((step) => step.newPartIds)).toEqual(
      plan.steps.map((step) => step.newPartIds),
    );
    expectExactMembership(merged);
    expect(plan.steps).toHaveLength(3);
  });

  it("updates generated counts after merging across layers without rewriting an authored title", () => {
    const plan = original();
    const merged = value(
      applyBuildPlanEdit(plan, { type: "merge-next", stepId: plan.steps[1].id }),
    );
    expect(merged.steps[1].title).toBe("Combined step · 3 pieces");
    expect(merged.steps[1].description).toBe(plan.steps[1].description);
    const splitMerged = value(
      applyBuildPlanEdit(merged, {
        type: "split-step",
        stepId: merged.steps[1].id,
        partIds: ["brick-5"],
        newStepId: "upper-only",
      }),
    );
    expect(splitMerged.steps[1].title).toBe("Combined step · 2 pieces");
    expect(splitMerged.steps[2].title).toBe("Combined step · 1 piece");
    const authored = value(
      applyBuildPlanEdit(plan, {
        type: "update-step",
        stepId: plan.steps[0].id,
        title: "My base",
        description: "Keep these notes.",
      }),
    );
    const split = value(
      applyBuildPlanEdit(authored, {
        type: "split-step",
        stepId: plan.steps[0].id,
        partIds: ["brick-2"],
        newStepId: "other",
      }),
    );
    expect(split.steps[0].title).toBe("My base");
    expect(split.steps[1].title).toBe("My base (continued)");
    expect(split.steps[1].description).toBe("Keep these notes.");
  });

  it("rejects invalid, empty, duplicate and unrelated split selections without mutation", () => {
    const plan = original();
    const before = structuredClone(plan);
    const edits: BuildPlanEdit[] = [
      { type: "split-step", stepId: plan.steps[0].id, partIds: [], newStepId: "new" },
      {
        type: "split-step",
        stepId: plan.steps[0].id,
        partIds: ["brick-1", "brick-2"],
        newStepId: "new",
      },
      {
        type: "split-step",
        stepId: plan.steps[0].id,
        partIds: ["brick-1", "brick-1"],
        newStepId: "new",
      },
      { type: "split-step", stepId: plan.steps[0].id, partIds: ["brick-4"], newStepId: "new" },
      {
        type: "split-step",
        stepId: plan.steps[0].id,
        partIds: ["brick-1"],
        newStepId: plan.steps[1].id,
      },
      { type: "split-step", stepId: plan.steps[0].id, partIds: ["brick-1"], newStepId: " " },
    ];
    for (const edit of edits) {
      expect(applyBuildPlanEdit(plan, edit).ok).toBe(false);
      expect(plan).toEqual(before);
    }
  });

  it("rejects invalid titles, oversized notes, missing steps and impossible boundary operations", () => {
    const plan = original();
    const before = structuredClone(plan);
    const edits: BuildPlanEdit[] = [
      { type: "update-step", stepId: plan.steps[0].id, title: " " },
      { type: "update-step", stepId: plan.steps[0].id, title: "a".repeat(121) },
      { type: "update-step", stepId: plan.steps[0].id, description: "a".repeat(2001) },
      { type: "update-step", stepId: "absent", title: "Base" },
      { type: "update-step", stepId: plan.steps[0].id },
      { type: "move-step", stepId: plan.steps[0].id, direction: "earlier" },
      { type: "move-step", stepId: plan.steps.at(-1)!.id, direction: "later" },
      { type: "merge-next", stepId: plan.steps.at(-1)!.id },
    ];
    for (const edit of edits) {
      expect(applyBuildPlanEdit(plan, edit).ok).toBe(false);
      expect(plan).toEqual(before);
    }
  });

  it("rejects unpersistable step identities and control characters without changing the guide", () => {
    const plan = original();
    const before = structuredClone(plan);
    const stepId = plan.steps[0].id;
    const edits: BuildPlanEdit[] = [
      ...["a".repeat(129), "has space", "-leading", "hidden\u0000id"].map((newStepId) => ({
        type: "split-step" as const,
        stepId,
        partIds: ["brick-1"],
        newStepId,
      })),
      ...["\u0000", "\u0007", "\u007f", "\n", "\t"].map((character) => ({
        type: "update-step" as const,
        stepId,
        title: `Base${character}detail`,
      })),
      ...["\u0000", "\u0007", "\u007f", "\u000b"].map((character) => ({
        type: "update-step" as const,
        stepId,
        description: `Place${character}carefully`,
      })),
    ];
    for (const edit of edits) {
      expect(applyBuildPlanEdit(plan, edit).ok).toBe(false);
      expect(plan).toEqual(before);
    }
    const notes = "First line.\n\tIndented line.\r\nLast line.";
    expect(
      value(applyBuildPlanEdit(plan, { type: "update-step", stepId, description: notes })).steps[0]
        .description,
    ).toBe(notes);
  });

  it("refuses merging notes that would exceed the limit instead of discarding them", () => {
    const plan = original();
    const notes = value(
      applyBuildPlanEdit(plan, {
        type: "update-step",
        stepId: plan.steps[0].id,
        description: "a".repeat(2000),
      }),
    );
    const before = structuredClone(notes);
    expect(applyBuildPlanEdit(notes, { type: "merge-next", stepId: notes.steps[0].id }).ok).toBe(
      false,
    );
    expect(notes).toEqual(before);
  });

  it("rejects malformed existing membership before an edit can hide it", () => {
    const plan = original();
    const malformed = [
      { ...plan, pieceCount: 99 },
      {
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 0 ? { ...step, id: "a".repeat(129) } : step,
        ),
      },
      {
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 0 ? { ...step, description: "Hidden\u0000note" } : step,
        ),
      },
      {
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 1 ? { ...step, id: plan.steps[0].id } : step,
        ),
      },
      {
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 0 ? { ...step, newPartIds: ["brick-1", "brick-1"] } : step,
        ),
      },
      {
        ...plan,
        steps: plan.steps.map((step, index) =>
          index === 0 ? { ...step, visiblePartIds: [] } : step,
        ),
      },
    ];
    for (const invalid of malformed) {
      const before = structuredClone(invalid);
      expect(
        applyBuildPlanEdit(invalid, {
          type: "update-step",
          stepId: plan.steps[0].id,
          title: "Base",
        }).ok,
      ).toBe(false);
      expect(invalid).toEqual(before);
    }
  });

  it("supports independent undo/redo and discards only the redo branch after another edit", () => {
    const plan = original();
    const initial = createBuildPlanSession(plan);
    const edited = value(
      editBuildPlan(initial, { type: "update-step", stepId: plan.steps[0].id, title: "Base" }),
    );
    const undone = value(undoBuildPlan(edited));
    expect(undone.present).toBe(initial.initial);
    expect(value(redoBuildPlan(undone)).present).toBe(edited.present);
    const branch = value(
      editBuildPlan(undone, { type: "update-step", stepId: plan.steps[0].id, title: "Foot" }),
    );
    expect(branch.future).toEqual([]);
    expect(redoBuildPlan(branch).ok).toBe(false);
    expect(undoBuildPlan(initial).ok).toBe(false);
    expect(initial.present).toBe(plan);
    expect(initial.past).toEqual([]);
    expect(initial.future).toEqual([]);
  });

  it("retains the original generated baseline after the bounded editorial history fills", () => {
    const plan = original();
    let session = createBuildPlanSession(plan);
    for (let index = 0; index < 45; index++)
      session = value(
        editBuildPlan(session, {
          type: "update-step",
          stepId: plan.steps[0].id,
          title: `Base ${index}`,
        }),
      );
    expect(session.past).toHaveLength(40);
    for (let index = 0; index < 40; index++) session = value(undoBuildPlan(session));
    expect(session.initial).toBe(plan);
    expect(session.present).not.toBe(plan);
    expect(session.present.steps[0].title).toBe("Base 4");
    expect(session.future).toHaveLength(40);
    expect(undoBuildPlan(session).ok).toBe(false);
    expectExactMembership(session.present);
  });
});
