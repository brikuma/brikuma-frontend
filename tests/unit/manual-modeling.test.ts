import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createModel,
  createSession,
  deriveBom,
  redo,
  undo,
  type EditCommand,
  type EditingPolicy,
  type ModelSession,
  type Result,
} from "../../src/core/model/public";

const policy: EditingPolicy = {
  parts: [
    { id: "brick", name: "Brick", width: 4, height: 0.6, depth: 2, shape: "brick", studs: true },
  ],
  colors: ["ivory"],
  maxInstances: 3,
  historyLimit: 40,
  bounds: 40,
};
function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
function initial(): ModelSession {
  return createSession(
    value(
      createModel(
        {
          id: "study",
          title: "Study",
          revision: "study-r1",
          baselineRevision: "study-r1",
          groups: [{ id: "assembly", name: "Assembly", protected: false }],
          instances: [
            {
              id: "source",
              partId: "brick",
              colorId: "ivory",
              groupId: "assembly",
              transform: { x: 0, y: 0.3, z: 0, rotation: 0 },
            },
          ],
        },
        policy,
      ),
    ),
  );
}
function edit(session: ModelSession, command: EditCommand) {
  return value(applyCommand(session, command, policy));
}

describe("Manual modeling uses one protected, reversible model command per action", () => {
  it("supports precise tenth-stud detail placement without accepting arbitrary off-grid values", () => {
    const original = initial();
    const adjusted = edit(original, {
      type: "set-transform",
      id: "source",
      transform: { x: 0.1, y: 0.3, z: -0.2, rotation: 0 },
    });
    expect(adjusted.present.instances[0].transform).toEqual({
      x: 0.1,
      y: 0.3,
      z: -0.2,
      rotation: 0,
    });
    const rejected = applyCommand(
      adjusted,
      { type: "translate", id: "source", delta: { x: 0.025, y: 0, z: 0 } },
      policy,
    );
    expect(rejected.ok).toBe(false);
    expect(value(undo(adjusted)).present).toEqual(original.present);
  });
  it("rotates by quarter turns and restores exact transforms through undo and redo", () => {
    const original = initial();
    let session = original;
    for (const rotation of [90, 180, 270, 0]) {
      session = edit(session, { type: "rotate", id: "source", quarterTurns: 1 });
      expect(session.present.instances[0].transform.rotation).toBe(rotation);
    }
    session = edit(session, { type: "rotate", id: "source", quarterTurns: -1 });
    expect(session.present.instances[0].transform.rotation).toBe(270);
    expect(value(redo(value(undo(session)))).present).toEqual(session.present);
    expect(original.present.instances[0].transform.rotation).toBe(0);
    expect(session.past).toHaveLength(5);
  });

  it("commits an absolute grid position atomically and discards an old redo branch", () => {
    const moved = edit(initial(), {
      type: "set-transform",
      id: "source",
      transform: { x: 2.5, y: 1.1, z: -3, rotation: 90 },
    });
    expect(moved.present.instances[0].transform).toEqual({ x: 2.5, y: 1.1, z: -3, rotation: 90 });
    expect(moved.past).toHaveLength(1);
    const branch = edit(value(undo(moved)), { type: "rotate", id: "source", quarterTurns: 1 });
    expect(branch.future).toHaveLength(0);
    expect(branch.present.revision).not.toBe(moved.present.revision);
    expect(deriveBom(branch.present)).toEqual([{ partId: "brick", colorId: "ivory", quantity: 1 }]);
  });

  it("duplicates the complete part in one history step with a new explicit identity", () => {
    const original = initial();
    const copied = edit(original, {
      type: "duplicate",
      id: "source",
      newId: "copy",
      transform: { x: 4, y: 0.3, z: 0, rotation: 90 },
    });
    expect(copied.present.instances[1]).toEqual({
      ...original.present.instances[0],
      id: "copy",
      transform: { x: 4, y: 0.3, z: 0, rotation: 90 },
    });
    expect(copied.present.instances[0]).toEqual(original.present.instances[0]);
    expect(deriveBom(copied.present)[0].quantity).toBe(2);
    expect(copied.past).toHaveLength(1);
    expect(value(undo(copied)).present).toEqual(original.present);
    expect(value(redo(value(undo(copied)))).present).toEqual(copied.present);
  });

  it("rejects invalid positions, duplicate identities and exceeded limits without mutation", () => {
    const session = initial();
    const before = JSON.stringify(session);
    const commands: EditCommand[] = [
      { type: "set-transform", id: "source", transform: { x: 0.25, y: 0.3, z: 0, rotation: 0 } },
      { type: "set-transform", id: "source", transform: { x: 0, y: -0.1, z: 0, rotation: 0 } },
      {
        type: "duplicate",
        id: "source",
        newId: "source",
        transform: { x: 4, y: 0.3, z: 0, rotation: 0 },
      },
      {
        type: "duplicate",
        id: "source",
        newId: "copy",
        transform: { x: 41, y: 0.3, z: 0, rotation: 0 },
      },
    ];
    for (const command of commands) expect(applyCommand(session, command, policy).ok).toBe(false);
    expect(
      applyCommand(
        session,
        {
          type: "duplicate",
          id: "source",
          newId: "copy",
          transform: { x: 4, y: 0.3, z: 0, rotation: 0 },
        },
        { ...policy, maxInstances: 1 },
      ),
    ).toMatchObject({ ok: false, error: { code: "piece-limit" } });
    expect(JSON.stringify(session)).toBe(before);
  });

  it("protects rotation, numeric positioning and duplication, including history", () => {
    const session = edit(initial(), {
      type: "set-protection",
      groupId: "assembly",
      protected: true,
    });
    const before = JSON.stringify(session);
    for (const command of [
      { type: "rotate", id: "source", quarterTurns: 1 },
      { type: "set-transform", id: "source", transform: { x: 2, y: 0.3, z: 0, rotation: 0 } },
      {
        type: "duplicate",
        id: "source",
        newId: "copy",
        transform: { x: 4, y: 0.3, z: 0, rotation: 0 },
      },
    ] satisfies EditCommand[])
      expect(applyCommand(session, command, policy)).toMatchObject({
        ok: false,
        error: { code: "protected-group" },
      });
    expect(JSON.stringify(session)).toBe(before);
  });
});
