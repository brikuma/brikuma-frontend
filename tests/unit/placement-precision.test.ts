import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createSession,
  validatePlacement,
  type GridTransform,
  type Model,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import { placementFeedback } from "../../src/features/editor/placement-feedback";

const definition = partDefinitions.find((part) => part.id === "demo-door-leaf")!;
const model: Model = {
  id: "precision",
  title: "Precision",
  revision: "r1",
  baselineRevision: "r1",
  groups: [{ id: "assembly", name: "Assembly", protected: false }],
  instances: [],
};

describe("Placement preview and commit coordinate invariants", () => {
  it.each([
    { x: 0, y: 1.4, z: 2.12, rotation: 0 },
    { x: 0, y: 1.42, z: 2.1, rotation: 0 },
    { x: 40.1, y: 1.4, z: 2.1, rotation: 0 },
    { x: 0, y: -0.05, z: 2.1, rotation: 0 },
    { x: Number.NaN, y: 1.4, z: 2.1, rotation: 0 },
  ] satisfies GridTransform[])(
    "rejects $x/$y/$z consistently without history changes",
    (transform) => {
      const session = createSession(model),
        before = structuredClone(session);
      const instance = {
        id: "door",
        partId: definition.id,
        colorId: "ivory",
        groupId: "assembly",
        transform,
      };
      const preview = placementFeedback(model, partDefinitions, { ...instance, target: "free" });
      const result = applyCommand(
        session,
        { type: "place", instance, placement: "free", baseRevision: model.revision },
        editPolicy,
      );
      expect(preview.allowed).toBe(false);
      expect(result).toEqual({
        ok: false,
        error: { code: "invalid-transform", message: expect.any(String) },
      });
      expect(preview.message).toContain("0.08 cm horizontal steps");
      expect(session).toEqual(before);
      for (const mode of ["grid", "connect"] as const)
        expect(
          validatePlacement(model, partDefinitions, definition, transform, mode, editPolicy.bounds),
        ).toEqual(result);
    },
  );
  it("accepts the same supported free transform at preview and commit", () => {
    const instance = {
      id: "door",
      partId: definition.id,
      colorId: "ivory",
      groupId: "assembly",
      transform: { x: 0, y: 1.45, z: 2.1, rotation: 0 as const },
    };
    expect(placementFeedback(model, partDefinitions, { ...instance, target: "free" }).allowed).toBe(
      true,
    );
    const result = applyCommand(
      createSession(model),
      { type: "place", instance, placement: "free", baseRevision: model.revision },
      editPolicy,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.present.instances[0].transform).toEqual(instance.transform);
  });
});
