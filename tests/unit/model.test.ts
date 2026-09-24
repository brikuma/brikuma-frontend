import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createModel,
  createSession,
  deriveBom,
  isInstructionCompatible,
  missingQuantity,
  previewVariant,
  redo,
  undo,
  type EditCommand,
  type ModelSession,
  type PartInstance,
  type Result,
} from "../../src/core/model/public";
import { editPolicy } from "../../src/fixtures/catalog";
import { fixture as blank } from "../../src/fixtures/scenes/blank";
import { fixture as masseria } from "../../src/fixtures/scenes/masseria";
import { fixture as rover } from "../../src/fixtures/scenes/rover";
import { fixture as creature } from "../../src/fixtures/scenes/creature";
import { parseProjectId } from "../../src/fixtures/projects";
import counts from "../../src/fixtures/scene-counts.json";

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const brick: PartInstance = {
  id: "local-brick-1",
  partId: "demo-brick-2x4",
  colorId: "teal",
  groupId: "workspace",
  transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
};

function edit(session: ModelSession, command: EditCommand): ModelSession {
  return value(applyCommand(session, command, editPolicy));
}

describe("FE-005 / FE-022: pure bounded model commands", () => {
  it("adds, recolors, translates and removes one logical brick with coherent quantities", () => {
    const original = createSession(blank.model);
    const added = edit(original, { type: "add", instance: brick });
    const colored = edit(added, {
      type: "recolor",
      id: brick.id,
      colorId: "terracotta",
    });
    const moved = edit(colored, {
      type: "translate",
      id: brick.id,
      delta: { x: 1, y: 1.2, z: -0.5 },
    });
    expect(moved.present.instances[0]).toMatchObject({
      colorId: "terracotta",
      transform: { x: 1, y: 1.8, z: -0.5 },
    });
    expect(deriveBom(moved.present)).toEqual([
      { partId: brick.partId, colorId: "terracotta", quantity: 1 },
    ]);
    expect(edit(moved, { type: "remove", id: brick.id }).present.instances).toHaveLength(0);
    expect(original.present.instances).toHaveLength(0);
    expect(added.present.instances[0].colorId).toBe("teal");
  });

  it("rejects duplicate part identity, unsupported colors and positions without mutation", () => {
    const session = edit(createSession(blank.model), {
      type: "add",
      instance: brick,
    });
    const snapshot = JSON.stringify(session);
    const commands: EditCommand[] = [
      { type: "add", instance: brick },
      { type: "recolor", id: brick.id, colorId: "unverified-color" },
      { type: "translate", id: brick.id, delta: { x: 0.25, y: 0, z: 0 } },
      { type: "translate", id: brick.id, delta: { x: 100, y: 0, z: 0 } },
      { type: "translate", id: brick.id, delta: { x: 0, y: -1, z: 0 } },
      { type: "translate", id: brick.id, delta: { x: Number.NaN, y: 0, z: 0 } },
    ];
    for (const command of commands)
      expect(applyCommand(session, command, editPolicy).ok).toBe(false);
    expect(JSON.stringify(session)).toBe(snapshot);
  });

  it("validates catalog identities and aggregate ownership at construction", () => {
    for (const modified of [
      { ...brick, partId: "manufacturer-unknown" },
      { ...brick, groupId: "another-model" },
      { ...brick, id: "" },
    ]) {
      expect(createModel({ ...blank.model, instances: [modified] }, editPolicy).ok).toBe(false);
    }
    expect(
      createModel(
        { ...blank.model, instances: [brick, { ...brick, id: "second" }] },
        { ...editPolicy, maxInstances: 1 },
      ),
    ).toMatchObject({ ok: false, error: { code: "piece-limit" } });
  });

  it("round-trips undo and redo and restores baseline compatibility", () => {
    const initial = createSession(blank.model);
    const edited = edit(initial, { type: "add", instance: brick });
    expect(isInstructionCompatible(edited.present, blank.model.baselineRevision)).toBe(false);
    const reverted = value(undo(edited));
    expect(reverted.present).toEqual(initial.present);
    expect(isInstructionCompatible(reverted.present, blank.model.baselineRevision)).toBe(true);
    expect(value(redo(reverted)).present).toEqual(edited.present);
  });

  it("bounds mementos and discards a redo branch without reusing a revision", () => {
    let session = createSession(blank.model);
    for (let index = 0; index < 5; index += 1)
      session = value(
        applyCommand(
          session,
          { type: "add", instance: { ...brick, id: `brick-${index}` } },
          { ...editPolicy, historyLimit: 2 },
        ),
      );
    expect(session.past).toHaveLength(2);
    const undone = value(undo(session));
    const branch = edit(undone, {
      type: "recolor",
      id: "brick-0",
      colorId: "ochre",
    });
    expect(branch.future).toHaveLength(0);
    expect(branch.present.revision).not.toBe(session.present.revision);
    expect(redo(branch)).toMatchObject({
      ok: false,
      error: { code: "empty-history" },
    });
  });

  it("reports missing selections and no-op commands as typed failures", () => {
    const empty = createSession(blank.model);
    expect(undo(empty).ok).toBe(false);
    expect(applyCommand(empty, { type: "remove", id: "missing" }, editPolicy)).toMatchObject({
      ok: false,
      error: { code: "unknown-instance" },
    });
    const added = edit(empty, { type: "add", instance: brick });
    expect(
      applyCommand(added, { type: "recolor", id: brick.id, colorId: brick.colorId }, editPolicy),
    ).toMatchObject({ ok: false, error: { code: "no-change" } });
  });
});

describe("FE-006 / FE-012: protection and compatible sample variants", () => {
  it("previews authoritative variant quantities without changing the source model", () => {
    const model = masseria.model;
    const before = JSON.stringify(model);
    const preview = previewVariant(model, masseria.variant!, editPolicy);
    expect(preview).toEqual({
      ok: true,
      value: { pieceCount: 1136, removedCount: 55, addedCount: 20 },
    });
    const applied = edit(createSession(model), {
      type: "apply-variant",
      variant: masseria.variant!,
    });
    expect(value(preview).pieceCount).toBe(applied.present.instances.length);
    expect(JSON.stringify(model)).toBe(before);
    expect(model.revision).toBe("masseria-r4");
  });

  it("reports stale and protected preview failures through the same edit rules", () => {
    const model = masseria.model;
    expect(
      previewVariant({ ...model, revision: "masseria-local-7" }, masseria.variant!, editPolicy),
    ).toMatchObject({ ok: false, error: { code: "revision-conflict" } });
    const protectedRoof = edit(createSession(model), {
      type: "set-protection",
      groupId: "roof",
      protected: true,
    }).present;
    const before = JSON.stringify(protectedRoof);
    expect(previewVariant(protectedRoof, masseria.variant!, editPolicy)).toMatchObject({
      ok: false,
      error: { code: "protected-group" },
    });
    expect(JSON.stringify(protectedRoof)).toBe(before);
  });
  it("rejects all edits into a protected facade without changing state", () => {
    const session = createSession(masseria.model);
    const facade = session.present.instances.find((part) => part.groupId === "facade")!;
    const before = JSON.stringify(session);
    for (const command of [
      { type: "remove", id: facade.id },
      { type: "recolor", id: facade.id, colorId: "teal" },
      { type: "translate", id: facade.id, delta: { x: 1, y: 0, z: 0 } },
      { type: "add", instance: { ...facade, id: "new-facade-brick" } },
    ] satisfies EditCommand[]) {
      expect(applyCommand(session, command, editPolicy)).toMatchObject({
        ok: false,
        error: { code: "protected-group" },
      });
    }
    expect(JSON.stringify(session)).toBe(before);
  });

  it("requires explicit unprotection but does not make instructions stale for a policy change", () => {
    const session = createSession(masseria.model);
    const unlocked = edit(session, {
      type: "set-protection",
      groupId: "facade",
      protected: false,
    });
    expect(unlocked.present.revision).toBe(session.present.revision);
    const facade = unlocked.present.instances.find((part) => part.groupId === "facade")!;
    expect(edit(unlocked, { type: "remove", id: facade.id }).present.instances.length).toBe(
      session.present.instances.length - 1,
    );
    expect(
      value(undo(unlocked)).present.groups.find((group) => group.id === "facade")?.protected,
    ).toBe(true);
  });

  it("applies the authored roof atomically, preserves facade, and can undo it", () => {
    const session = createSession(masseria.model);
    const variant = masseria.variant!;
    const applied = edit(session, { type: "apply-variant", variant });
    expect(applied.present.instances.length).toBe(
      session.present.instances.length - variant.removeIds.length + variant.additions.length,
    );
    expect(applied.present.instances.filter((part) => part.groupId === "facade")).toEqual(
      session.present.instances.filter((part) => part.groupId === "facade"),
    );
    expect(applied.past).toHaveLength(1);
    expect(value(undo(applied)).present).toEqual(session.present);
  });

  it("rejects a stale variant and a variant touching a protected group", () => {
    const session = createSession(masseria.model);
    const variant = masseria.variant!;
    const applied = edit(session, { type: "apply-variant", variant });
    expect(applyCommand(applied, { type: "apply-variant", variant }, editPolicy)).toMatchObject({
      ok: false,
      error: { code: "revision-conflict" },
    });
    const protectedRoof = edit(session, {
      type: "set-protection",
      groupId: "roof",
      protected: true,
    });
    const before = JSON.stringify(protectedRoof);
    expect(
      applyCommand(protectedRoof, { type: "apply-variant", variant }, editPolicy),
    ).toMatchObject({ ok: false, error: { code: "protected-group" } });
    expect(JSON.stringify(protectedRoof)).toBe(before);
  });
});

describe("FE-008 / FE-009: fixture and instruction integrity", () => {
  for (const fixture of [masseria, rover, creature, blank]) {
    it(`validates ${fixture.model.id} and derives one counted part per logical instance`, () => {
      expect(createModel(fixture.model, editPolicy).ok).toBe(true);
      expect(Object.entries(counts).find(([id]) => id === fixture.model.id)?.[1]).toBe(
        fixture.model.instances.length,
      );
      expect(deriveBom(fixture.model).reduce((count, line) => count + line.quantity, 0)).toBe(
        fixture.model.instances.length,
      );
      if (fixture.instructions) {
        const steps = fixture.instructions.steps;
        expect(steps.at(-1)?.visiblePartIds).toHaveLength(fixture.model.instances.length);
        expect(new Set(steps.flatMap((step) => step.newPartIds)).size).toBe(
          fixture.model.instances.length,
        );
        expect(new Set(steps.at(-1)?.visiblePartIds)).toEqual(
          new Set(fixture.model.instances.map((part) => part.id)),
        );
        expect(isInstructionCompatible(fixture.model, fixture.instructions.modelRevision)).toBe(
          true,
        );
      }
    });
  }

  it("keeps illustrative owned quantities from creating negative missing values", () => {
    expect(missingQuantity(3, 8)).toBe(0);
    expect(missingQuantity(8, 3)).toBe(5);
  });

  it("allows only known scene queries and reports an unknown value visibly", () => {
    expect(parseProjectId("blank")).toEqual({ id: "blank", invalid: false });
    expect(parseProjectId("../private")).toEqual({
      id: "masseria",
      invalid: true,
    });
    expect(parseProjectId(null)).toEqual({ id: "masseria", invalid: false });
  });
});
