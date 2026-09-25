import { describe, expect, it } from "vitest";
import {
  applyBuildPlanEdit,
  encodeProjectSnapshot,
  generateBuildPlan,
  isBuildPlanCurrent,
  parseProjectSnapshot,
  type DraftBuildPlan,
  type Model,
  type ProjectSnapshot,
  type Result,
  type SerializedProjectSnapshot,
} from "../../src/core/model/public";
import { editPolicy } from "../../src/fixtures/catalog";

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function source(count = 5): Model {
  return {
    id: "tower",
    title: "Portable tower",
    baselineRevision: "tower-r1",
    revision: "tower-local-4",
    groups: [{ id: "body", name: "Body", protected: false }],
    instances: Array.from({ length: count }, (_, index) => ({
      id: `piece-${index}`,
      partId: "demo-brick-2x2",
      colorId: "ivory",
      groupId: "body",
      transform: { x: (index % 2) * 2, y: Math.floor(index / 2) * 1.2 + 0.6, z: 0, rotation: 0 },
    })),
  };
}

function snapshot(model = source()): ProjectSnapshot {
  return {
    model,
    instructions: {
      sourceModel: model,
      plan: value(generateBuildPlan(model, editPolicy.parts)),
      edited: false,
    },
  };
}
function wire(): SerializedProjectSnapshot {
  return encodeProjectSnapshot(snapshot());
}
function flatModel(count: number): Model {
  const model = source();
  return {
    ...model,
    instances: Array.from({ length: count }, (_, index) => ({
      ...model.instances[0],
      id: `piece-${index}`,
      transform: {
        x: ((index % 100) - 50) / 2,
        y: 0.6,
        z: Math.floor(index / 100) - 25,
        rotation: 0,
      },
    })),
  };
}

describe("Portable project snapshots", () => {
  it("round trips model-only snapshots and generated guides without serialized derived arrays", () => {
    const original = snapshot();
    const encoded = encodeProjectSnapshot(original);
    const before = structuredClone(encoded);
    expect(Object.keys(encoded.instructions!)).toEqual(["sourceModel", "steps", "edited"]);
    expect(Object.keys(encoded.instructions!.steps[0])).toEqual([
      "id",
      "title",
      "description",
      "view",
      "newPartIds",
    ]);
    const restored = value(parseProjectSnapshot(encoded, editPolicy));
    expect(restored).toEqual(original);
    expect(restored.model).not.toBe(original.model);
    expect(restored.instructions!.sourceModel).not.toBe(original.instructions!.sourceModel);
    expect(encoded).toEqual(before);
    expect(
      value(parseProjectSnapshot(encodeProjectSnapshot({ model: original.model }), editPolicy)),
    ).toEqual({ model: original.model });
    expect(
      value(parseProjectSnapshot({ model: { ...source(), instances: [] } }, editPolicy)).model
        .instances,
    ).toEqual([]);
  });

  it("preserves edited sequence, saved views and notes while deriving mixed-step metadata", () => {
    const original = snapshot();
    let plan = original.instructions!.plan;
    plan = value(
      applyBuildPlanEdit(plan, {
        type: "move-step",
        stepId: plan.steps[1].id,
        direction: "earlier",
      }),
    );
    plan = value(applyBuildPlanEdit(plan, { type: "merge-next", stepId: plan.steps[0].id }));
    plan = value(
      applyBuildPlanEdit(plan, {
        type: "update-step",
        stepId: plan.steps[0].id,
        title: "Assemble this group",
        description: "Keep these notes.\nCheck the underside.",
        view: "top",
      }),
    );
    expect(plan.steps[0].layerIndex).toBe(1);
    const saved = { ...original, instructions: { ...original.instructions!, plan, edited: true } };
    const restored = value(parseProjectSnapshot(encodeProjectSnapshot(saved), editPolicy));
    expect(restored.instructions!.plan.steps[0]).toMatchObject({
      ...plan.steps[0],
      layerIndex: 0,
      baseHeight: 0,
    });
    expect(restored.instructions!.plan.steps.map((step) => step.visiblePartIds)).toEqual(
      plan.steps.map((step) => step.visiblePartIds),
    );
    expect(restored.instructions!.edited).toBe(true);
    expect(restored.model).toEqual(original.model);
    expect(encodeProjectSnapshot(restored)).toEqual(encodeProjectSnapshot(saved));
  });

  it("retains a stale source snapshot even when changed geometry reused the revision", () => {
    const original = snapshot();
    const changed = {
      ...original.model,
      instances: original.model.instances.map((part, index) =>
        index === 0 ? { ...part, colorId: "teal" } : part,
      ),
    };
    const restored = value(
      parseProjectSnapshot(encodeProjectSnapshot({ ...original, model: changed }), editPolicy),
    );
    expect(isBuildPlanCurrent(restored.model, restored.instructions!.plan)).toBe(false);
    expect(
      isBuildPlanCurrent(restored.instructions!.sourceModel, restored.instructions!.plan),
    ).toBe(true);
    expect(restored.model.instances[0].colorId).toBe("teal");
    expect(restored.instructions!.sourceModel.instances[0].colorId).toBe("ivory");
  });

  it("derives unchecked geometry instead of importing an assessment claim", () => {
    const model = source();
    const unsupported = {
      ...model,
      instances: [
        ...model.instances,
        { ...model.instances[0], id: "leaf", partId: "demo-door-leaf" },
      ],
    };
    const restored = value(
      parseProjectSnapshot(encodeProjectSnapshot(snapshot(unsupported)), editPolicy),
    );
    expect(restored.instructions!.plan.uncheckedPartIds).toEqual(["leaf"]);
    expect(restored.instructions!.plan.physicalAssessment).toBe("not-evaluated");
  });

  it("rejects malformed envelopes and models before returning a partial project", () => {
    const original = wire();
    const malformed: unknown[] = [
      null,
      [],
      {},
      { ...original, cloudId: "remote" },
      { ...original, instructions: null },
      {
        ...original,
        model: {
          ...original.model,
          instances: [original.model.instances[0], original.model.instances[0]],
        },
      },
      {
        ...original,
        instructions: {
          ...original.instructions,
          sourceModel: { ...original.model, id: "another-project" },
        },
      },
      { ...original, instructions: { ...original.instructions, edited: "false" } },
      { ...original, instructions: { ...original.instructions, sourceSignature: "forged" } },
      JSON.parse('{"model":{},"__proto__":{"polluted":true}}'),
    ];
    for (const input of malformed) {
      const before = structuredClone(input);
      expect(parseProjectSnapshot(input, editPolicy).ok).toBe(false);
      expect(input).toEqual(before);
    }
  });

  it("rejects duplicate, missing, foreign and empty step membership", () => {
    const original = wire();
    const steps = original.instructions!.steps;
    const invalidSteps = [
      [],
      steps.slice(1),
      [...steps, steps[0]],
      steps.map((step, index) => (index === 1 ? { ...step, id: steps[0].id } : step)),
      steps.map((step, index) => (index === 0 ? { ...step, newPartIds: [] } : step)),
      steps.map((step, index) =>
        index === 0 ? { ...step, newPartIds: ["piece-0", "piece-0"] } : step,
      ),
      steps.map((step, index) =>
        index === 0 ? { ...step, newPartIds: ["piece-0", "unknown"] } : step,
      ),
    ];
    for (const invalid of invalidSteps) {
      expect(
        parseProjectSnapshot(
          { ...original, instructions: { ...original.instructions, steps: invalid } },
          editPolicy,
        ).ok,
      ).toBe(false);
    }
  });

  it("bounds text and identities and rejects supplied computed fields or arbitrary saved views", () => {
    const original = wire();
    const [first, ...rest] = original.instructions!.steps;
    const patches = [
      { title: " " },
      { title: "a".repeat(121) },
      { title: "Hidden\u0000title" },
      { description: "a".repeat(2001) },
      { description: "Hidden\u0000notes" },
      { id: "a".repeat(129) },
      { view: "sideways" },
      { visiblePartIds: ["piece-0"] },
      { layerIndex: 999 },
      { physicalAssessment: "passed" },
    ];
    for (const patch of patches) {
      expect(
        parseProjectSnapshot(
          {
            ...original,
            instructions: { ...original.instructions, steps: [{ ...first, ...patch }, ...rest] },
          },
          editPolicy,
        ).ok,
      ).toBe(false);
    }
  });

  it("cannot disguise customized instructions by clearing the edited flag", () => {
    const original = wire();
    const edited = {
      ...original,
      instructions: {
        ...original.instructions!,
        edited: false,
        steps: original.instructions!.steps.map((step, index) =>
          index === 0 ? { ...step, title: "My first step" } : step,
        ),
      },
    };
    expect(value(parseProjectSnapshot(edited, editPolicy)).instructions!.edited).toBe(true);
    expect(
      value(
        parseProjectSnapshot(
          { ...original, instructions: { ...original.instructions!, edited: true } },
          editPolicy,
        ),
      ).instructions!.edited,
    ).toBe(true);
  });

  it("rejects excessive cumulative expansion on both write and read before allocating it", () => {
    const model = flatModel(2200);
    const compact = model.instances.map((part, index) => ({
      id: `step-${index}`,
      title: "One piece",
      description: "",
      view: "top" as const,
      newPartIds: [part.id],
    }));
    const encoded = { model, instructions: { sourceModel: model, steps: compact, edited: true } };
    expect(parseProjectSnapshot(encoded, editPolicy)).toMatchObject({
      ok: false,
      error: { code: "invalid-file", message: expect.stringContaining("Merge some steps") },
    });
    const template = snapshot(source(1)).instructions!.plan;
    const plan: DraftBuildPlan = {
      ...template,
      pieceCount: model.instances.length,
      steps: compact.map((step) => ({ ...step, layerIndex: 0, baseHeight: 0, visiblePartIds: [] })),
    };
    expect(() =>
      encodeProjectSnapshot({ model, instructions: { sourceModel: model, plan, edited: true } }),
    ).toThrow("Merge some steps");
  });

  it("supports the default 5,000-piece guide within the expansion limit", () => {
    const original = snapshot(flatModel(5000));
    const encoded = encodeProjectSnapshot(original);
    const restored = value(parseProjectSnapshot(encoded, editPolicy));
    expect(restored.instructions!.plan.steps).toHaveLength(625);
    expect(restored.instructions!.plan.steps.at(-1)!.visiblePartIds).toHaveLength(5000);
    expect(restored.instructions!.edited).toBe(false);
  });

  it("derives a large layered source without expanding an unnecessary generated guide", () => {
    const flat = flatModel(3000);
    const model = {
      ...flat,
      instances: flat.instances.map((part, index) => ({
        ...part,
        transform: { ...part.transform, y: (index + 1) / 20 },
      })),
    };
    const restored = value(
      parseProjectSnapshot(
        {
          model,
          instructions: {
            sourceModel: model,
            edited: true,
            steps: [
              {
                id: "all",
                title: "Combined",
                description: "",
                view: "top",
                newPartIds: model.instances.map((part) => part.id),
              },
            ],
          },
        },
        { ...editPolicy, bounds: 200 },
      ),
    );
    expect(restored.instructions!.plan.steps).toHaveLength(1);
    expect(restored.instructions!.plan.layerCount).toBe(3000);
    expect(restored.instructions!.plan.steps[0].visiblePartIds).toHaveLength(3000);
  });

  it("rejects cyclic model values without throwing and refuses model data too large to reopen", () => {
    const cyclic: Record<string, unknown> = { ...source() };
    cyclic.loop = cyclic;
    expect(parseProjectSnapshot({ model: cyclic }, editPolicy).ok).toBe(false);
    const huge = { ...source(), title: "é".repeat(3 * 1024 * 1024) };
    expect(() => encodeProjectSnapshot({ model: huge })).toThrow("5 MiB");
  });
});
