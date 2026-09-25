import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createModel,
  createSession,
  findStudContacts,
  validatePlacement,
  type Model,
  type PartInstance,
} from "../../src/core/model/public";
import { createInitialPlacement } from "../../src/features/editor/initial-placement";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

const definition = (id: string) => partDefinitions.find((part) => part.id === id)!;
function part(id: string, x = 0.5, y = 0.6, partId = "demo-brick-1x1"): PartInstance {
  return {
    id,
    partId,
    colorId: "ivory",
    groupId: "build",
    transform: { x, y, z: 0.5, rotation: 0 },
  };
}
function modelWith(instances: readonly PartInstance[] = []): Model {
  const result = createModel(
    {
      id: "first-build",
      title: "First build",
      baselineRevision: "base",
      revision: "base",
      groups: [{ id: "build", name: "Build", protected: false }],
      instances,
    },
    editPolicy,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
function preview(
  model: Model,
  partId = "demo-brick-1x1",
  selectedIds: readonly string[] = [],
  visibleIds = model.instances.map((instance) => instance.id),
) {
  return createInitialPlacement({
    model,
    definitions: partDefinitions,
    definition: definition(partId),
    colorId: "red",
    selectedIds,
    visibleIds,
    bounds: editPolicy.bounds,
  });
}

describe("Initial placement for a manual build", () => {
  it("starts the first brick on the floor grid without adding a model instance", () => {
    const model = modelWith();
    const pending = preview(model, "demo-brick-2x6");
    expect(pending).toEqual({
      partId: "demo-brick-2x6",
      colorId: "red",
      target: "ground",
      transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
    });
    expect(
      validatePlacement(
        model,
        partDefinitions,
        definition(pending.partId),
        pending.transform,
        "grid",
      ).ok,
    ).toBe(true);
    expect(model.instances).toHaveLength(0);
    expect(model.revision).toBe("base");
  });

  it("suggests a connected second 2 × 6 brick and only commits on an explicit command", () => {
    const model = modelWith([
      {
        ...part("first", 0, 0.6, "demo-brick-2x6"),
        transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
      },
    ]);
    const original = structuredClone(model);
    const pending = preview(model, "demo-brick-2x6", ["first"]);
    expect(pending.target).toBe("surface");
    expect(pending.transform).toEqual({ x: 0, y: 1.8, z: 0, rotation: 0 });
    expect(
      findStudContacts(model, partDefinitions, definition(pending.partId), pending.transform),
    ).toHaveLength(12);
    expect(model).toEqual(original);
    const result = applyCommand(
      createSession(model),
      {
        type: "place",
        baseRevision: model.revision,
        placement: "connect",
        instance: { ...part("second", 0, 1.8, pending.partId), transform: pending.transform },
      },
      editPolicy,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.present.instances).toHaveLength(2);
    expect(result.value.past).toHaveLength(1);
    expect(model.instances).toHaveLength(1);
  });

  it("prefers the active visible selection over a newer piece", () => {
    const model = modelWith([part("selected", 10.5), part("newest")]);
    const pending = preview(model, "demo-brick-1x1", ["newest", "selected"]);
    expect(pending.transform).toEqual({ x: 10.5, y: 1.8, z: 0.5, rotation: 0 });
  });

  it("suggests the latest visible support when there is no selection", () => {
    const model = modelWith([part("first"), part("newest", 10.5)]);
    expect(preview(model).transform.x).toBe(10.5);
  });

  it("does not suggest an attachment to a hidden selected piece", () => {
    const model = modelWith([part("visible", 10.5), part("hidden")]);
    const pending = preview(model, "demo-brick-1x1", ["hidden"], ["visible"]);
    expect(pending.transform.x).toBe(10.5);
  });

  it("keeps hidden obstacles physical and tries another visible support", () => {
    const model = modelWith([
      part("selected"),
      part("available", 10.5),
      part("hidden-blocker", 0.5, 1.8),
    ]);
    const pending = preview(model, "demo-brick-1x1", ["selected"], ["selected", "available"]);
    expect(pending.transform).toEqual({ x: 10.5, y: 1.8, z: 0.5, rotation: 0 });
    expect(model.instances).toHaveLength(3);
  });

  it("falls back to an available nearby candidate when the newest support is blocked", () => {
    const model = modelWith([
      part("nearby"),
      part("newest", 20.5),
      part("hidden-blocker", 20.5, 1.8),
    ]);
    const pending = preview(model, "demo-brick-1x1", [], ["nearby", "newest"]);
    expect(pending.transform).toEqual({ x: 0.5, y: 1.8, z: 0.5, rotation: 0 });
  });

  it("leaves Connect for pointer adjustment when every visible support is blocked", () => {
    const model = modelWith([part("support"), part("hidden-blocker", 0.5, 1.8)]);
    const pending = preview(model, "demo-brick-1x1", ["support"], ["support"]);
    expect(pending.target).toBe("surface");
    expect(pending.transform).toEqual({ x: 0.5, y: 0.6, z: 0.5, rotation: 0 });
    expect(
      validatePlacement(
        model,
        partDefinitions,
        definition(pending.partId),
        pending.transform,
        "connect",
      ),
    ).toMatchObject({ ok: false, error: { code: "occupied-volume" } });
  });

  it("does not promote unsupported target geometry into a checked attachment", () => {
    const model = modelWith([part("round", 0.5, 0.6, "demo-round-2x2")]);
    const pending = preview(model, "demo-brick-1x1", ["round"]);
    expect(pending.target).toBe("surface");
    expect(pending.transform.y).toBe(0.6);
  });

  it("rejects otherwise clear attachment candidates outside the workspace bounds", () => {
    const model = modelWith([part("high", 0.5, 39.8)]);
    const pending = preview(model, "demo-brick-1x1", ["high"]);
    expect(pending.target).toBe("surface");
    expect(pending.transform.y).toBe(0.6);
  });

  it("keeps unsupported source geometry an explicit Free preview", () => {
    const model = modelWith([part("support")]);
    expect(preview(model, "demo-round-2x2", ["support"])).toMatchObject({
      partId: "demo-round-2x2",
      target: "free",
      transform: { y: 0.6 },
    });
  });
});
