import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createSession,
  getSelectionBounds,
  redo,
  undo,
  type EditCommand,
  type Model,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

const model: Model = {
  id: "selection",
  title: "Selection study",
  baselineRevision: "selection-r1",
  revision: "selection-r1",
  groups: [
    { id: "base", name: "Base", protected: false },
    { id: "child", name: "Child", protected: false, parentId: "base" },
  ],
  instances: [
    {
      id: "first",
      partId: "demo-brick-2x4",
      colorId: "teal",
      groupId: "base",
      transform: { x: 0, y: 0.6, z: 0, rotation: 90 },
    },
    {
      id: "second",
      partId: "demo-tile-2x2",
      colorId: "terracotta",
      groupId: "child",
      transform: { x: 4, y: 0.2, z: 1, rotation: 0 },
    },
  ],
};
const duplicate: Extract<EditCommand, { type: "duplicate-selection" }> = {
  type: "duplicate-selection",
  ids: ["first", "second"],
  newIds: ["copy-first", "copy-second"],
  delta: { x: 6, y: 0, z: 0 },
};

describe("Atomic selection duplication", () => {
  it("duplicates all selected identities rigidly in one history entry and restores exact states", () => {
    const session = createSession(model);
    const before = JSON.stringify(session);
    const result = applyCommand(session, duplicate, editPolicy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.past).toEqual([model]);
    expect(result.value.present.instances).toHaveLength(4);
    expect(result.value.present.instances.slice(2)).toEqual(
      model.instances.map((part, index) => ({
        ...part,
        id: duplicate.newIds[index],
        transform: { ...part.transform, x: part.transform.x + 6 },
      })),
    );
    expect(new Set(result.value.present.instances.map((part) => part.id)).size).toBe(4);
    const restored = undo(result.value);
    if (!restored.ok) throw new Error(restored.error.message);
    expect(restored.value.present).toEqual(model);
    const redone = redo(restored.value);
    if (!redone.ok) throw new Error(redone.error.message);
    expect(redone.value.present).toEqual(result.value.present);
    expect(JSON.stringify(session)).toBe(before);
  });
  it("blocks the complete duplicate when any source inherits protection", () => {
    const session = createSession({
      ...model,
      groups: model.groups.map((group) => ({ ...group, protected: group.id === "base" })),
    });
    const before = JSON.stringify(session);
    expect(applyCommand(session, duplicate, editPolicy)).toMatchObject({
      ok: false,
      error: { code: "protected-group" },
    });
    expect(JSON.stringify(session)).toBe(before);
  });
  it.each([
    { ids: [] },
    { ids: ["first", "first"] },
    { ids: ["first", "missing"] },
    { newIds: ["one"] },
    { newIds: ["same", "same"] },
    { newIds: ["first", "fresh"] },
    { newIds: ["", "fresh"] },
    { delta: { x: Infinity, y: 0, z: 0 } },
    { delta: { x: 0, y: NaN, z: 0 } },
    { delta: { x: 0.01, y: 0, z: 0 } },
    { delta: { x: 0, y: -2, z: 0 } },
    { delta: { x: editPolicy.bounds + 1, y: 0, z: 0 } },
  ])("rejects invalid identities/transforms without partial changes: %j", (change) => {
    const session = createSession(model);
    const before = JSON.stringify(session);
    expect(applyCommand(session, { ...duplicate, ...change }, editPolicy).ok).toBe(false);
    expect(JSON.stringify(session)).toBe(before);
  });
  it("rejects the whole duplicate at the piece limit", () => {
    const session = createSession(model);
    expect(applyCommand(session, duplicate, { ...editPolicy, maxInstances: 3 }).ok).toBe(false);
    expect(session.present.instances).toHaveLength(2);
    expect(session.past).toHaveLength(0);
  });
  it("clears the redo branch after a new duplicate", () => {
    const first = applyCommand(createSession(model), duplicate, editPolicy);
    if (!first.ok) throw new Error(first.error.message);
    const previous = undo(first.value);
    if (!previous.ok) throw new Error(previous.error.message);
    const branch = applyCommand(
      previous.value,
      { ...duplicate, newIds: ["other-first", "other-second"] },
      editPolicy,
    );
    if (!branch.ok) throw new Error(branch.error.message);
    expect(branch.value.future).toHaveLength(0);
    expect(branch.value.present.revision).not.toBe(first.value.present.revision);
  });
});

describe("Nominal selected body bounds", () => {
  it("accounts for quarter turns and collective spacing, excluding stud decoration", () => {
    expect(getSelectionBounds(model, partDefinitions, ["first", "second"])).toEqual({
      width: 6,
      depth: 4,
      height: 1.2,
    });
    expect(getSelectionBounds(model, partDefinitions, ["first"])).toEqual({
      width: 2,
      depth: 4,
      height: 1.2,
    });
  });
  it("reports unavailable for empty, missing or unresolved parts", () => {
    expect(getSelectionBounds(model, partDefinitions, [])).toBeNull();
    expect(getSelectionBounds(model, partDefinitions, ["missing"])).toBeNull();
    expect(getSelectionBounds(model, [], ["first"])).toBeNull();
  });
});
