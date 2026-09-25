import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createModel,
  createSession,
  deriveBom,
  findStudContacts,
  redo,
  undo,
  validatePlacement,
  type EditCommand,
  type EditingPolicy,
  type GridTransform,
  type Model,
  type ModelSession,
  type Result,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
function initial(): ModelSession {
  return createSession(
    value(
      createModel(
        {
          id: "relocation",
          title: "Mixed-piece relocation",
          baselineRevision: "relocation-r1",
          revision: "relocation-r1",
          groups: [
            { id: "body", name: "Body", protected: false },
            { id: "detail", name: "Detail", parentId: "body", protected: false },
          ],
          instances: [
            {
              id: "support",
              partId: "demo-brick-2x4",
              colorId: "ivory",
              groupId: "body",
              transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
            },
            {
              id: "moving",
              partId: "demo-brick-1x2",
              colorId: "teal",
              groupId: "detail",
              transform: { x: 0, y: 1.8, z: 0.5, rotation: 0 },
            },
            {
              id: "other",
              partId: "demo-plate-2x2",
              colorId: "terracotta",
              groupId: "body",
              transform: { x: 6, y: 0.2, z: 0, rotation: 0 },
            },
          ],
        },
        editPolicy,
      ),
    ),
  );
}
const destination: GridTransform = { x: 1, y: 1.8, z: 0.5, rotation: 0 };
function relocate(
  session: ModelSession,
  patch: Partial<Extract<EditCommand, { type: "relocate" }>> = {},
): Extract<EditCommand, { type: "relocate" }> {
  return {
    type: "relocate",
    id: "moving",
    transform: destination,
    placement: "connect",
    baseRevision: session.present.revision,
    ...patch,
  };
}
function rejectWithoutMutation(
  session: ModelSession,
  command: EditCommand,
  code: string,
  policy: EditingPolicy = editPolicy,
) {
  const before = structuredClone(session);
  expect(applyCommand(session, command, policy)).toMatchObject({ ok: false, error: { code } });
  expect(session).toEqual(before);
}

describe("Atomic placement of an existing part", () => {
  it("excludes only the source body and retains identity, finish, group, count and BOM in one undoable edit", () => {
    const session = initial();
    const before = structuredClone(session);
    const source = session.present.instances[1];
    const definition = partDefinitions.find((part) => part.id === source.partId)!;
    expect(
      validatePlacement(
        session.present,
        partDefinitions,
        definition,
        destination,
        "connect",
        editPolicy.bounds,
      ),
    ).toMatchObject({ ok: false, error: { code: "occupied-volume" } });
    const result = value(
      applyCommand(session, relocate(session), { ...editPolicy, maxInstances: 3 }),
    );
    expect(result.present.instances).toHaveLength(3);
    expect(result.present.instances[1]).toEqual({ ...source, transform: destination });
    expect(result.present.instances[0]).toEqual(session.present.instances[0]);
    expect(result.present.instances[2]).toEqual(session.present.instances[2]);
    expect(result.present.groups).toEqual(session.present.groups);
    expect(deriveBom(result.present)).toEqual(deriveBom(session.present));
    expect(
      findStudContacts(result.present, partDefinitions, definition, destination, source.id),
    ).toHaveLength(2);
    expect(result.past).toEqual([session.present]);
    expect(result.present.revision).toBe("relocation-local-1");
    expect(result.nextRevision).toBe(2);
    expect(value(undo(result)).present).toEqual(session.present);
    expect(value(redo(value(undo(result)))).present).toEqual(result.present);
    expect(session).toEqual(before);
  });

  it("can rotate and relocate an odd/even footprint to a valid connection with the same logical identity", () => {
    const session = initial();
    const transform: GridTransform = { x: 0.5, y: 1.8, z: 0, rotation: 90 };
    const result = value(applyCommand(session, relocate(session, { transform }), editPolicy));
    expect(result.present.instances[1]).toEqual({ ...session.present.instances[1], transform });
    expect(result.past).toHaveLength(1);
    expect(value(undo(result)).present).toEqual(session.present);
  });

  it.each(["hidden-obstacle", "unselected-obstacle"])(
    "still checks %s against the destination",
    (id) => {
      const original = initial().present;
      const model: Model = {
        ...original,
        instances: [
          ...original.instances,
          { ...original.instances[1], id, groupId: "body", transform: destination },
        ],
      };
      const session = createSession(value(createModel(model, editPolicy)));
      rejectWithoutMutation(session, relocate(session), "occupied-volume");
    },
  );

  it("cannot use its old position as its own studded support", () => {
    const original = initial().present;
    const source = {
      ...original.instances[1],
      transform: { x: 0, y: 0.6, z: 0.5, rotation: 0 as const },
    };
    const session = createSession({ ...original, instances: [source] });
    rejectWithoutMutation(
      session,
      relocate(session, { transform: { ...source.transform, y: 1.8 } }),
      "missing-connection",
    );
  });

  it("requires a supported connection instead of accepting an unattached destination", () => {
    const session = initial();
    rejectWithoutMutation(
      session,
      relocate(session, { transform: { ...destination, x: 20 } }),
      "missing-connection",
    );
    const source = { ...session.present.instances[1], partId: "demo-door-leaf" };
    const unsupported = createSession({ ...session.present, instances: [source] });
    rejectWithoutMutation(
      unsupported,
      relocate(unsupported, { transform: { ...destination, x: 20 } }),
      "unsupported-connector",
    );
  });

  it("rejects stale and unknown sources without changing history or model data", () => {
    const session = initial();
    rejectWithoutMutation(
      session,
      relocate(session, { baseRevision: "old-r1" }),
      "revision-conflict",
    );
    rejectWithoutMutation(session, relocate(session, { id: "missing" }), "unknown-instance");
    rejectWithoutMutation(session, relocate(session), "unknown-part", {
      ...editPolicy,
      parts: editPolicy.parts.filter((part) => part.id !== "demo-brick-1x2"),
    });
  });

  it.each(["body", "detail"])(
    "respects protection on the %s group before moving its part",
    (groupId) => {
      const model = initial().present;
      const session = createSession({
        ...model,
        groups: model.groups.map((group) => ({ ...group, protected: group.id === groupId })),
      });
      rejectWithoutMutation(session, relocate(session), "protected-group");
    },
  );

  it.each([
    { ...destination, x: 40.1 },
    { ...destination, y: -0.05 },
    { ...destination, z: Infinity },
    { ...destination, x: 0.25 },
  ])("rejects an invalid destination transform %j", (transform) => {
    const session = initial();
    rejectWithoutMutation(
      session,
      relocate(session, { transform, placement: "free" }),
      "invalid-transform",
    );
  });

  it("uses the strict floor grid while keeping an explicit free draft available", () => {
    const session = initial();
    const floor: GridTransform = { x: 8, y: 0.6, z: 0.5, rotation: 0 };
    const grounded = value(
      applyCommand(session, relocate(session, { transform: floor, placement: "grid" }), editPolicy),
    );
    expect(grounded.present.instances[1].transform).toEqual(floor);
    rejectWithoutMutation(
      session,
      relocate(session, { transform: { ...floor, x: 8.5 }, placement: "grid" }),
      "invalid-transform",
    );
    const overlapping = { ...destination, x: 0, y: 0.6 };
    rejectWithoutMutation(
      session,
      relocate(session, { transform: overlapping, placement: "grid" }),
      "occupied-volume",
    );
    const free = value(
      applyCommand(
        session,
        relocate(session, { transform: overlapping, placement: "free" }),
        editPolicy,
      ),
    );
    expect(free.present.instances[1].transform).toEqual(overlapping);
    expect(deriveBom(free.present)).toEqual(deriveBom(session.present));
    expect(free.past).toHaveLength(1);
  });

  it("treats unchanged placement as no change and preserves an existing redo branch", () => {
    const session = initial();
    const moved = value(applyCommand(session, relocate(session), editPolicy));
    const undone = value(undo(moved));
    rejectWithoutMutation(
      undone,
      relocate(undone, { transform: undone.present.instances[1].transform }),
      "no-change",
    );
    expect(undone.nextRevision).toBe(2);
    expect(undone.future).toEqual([moved.present]);
    const branched = value(
      applyCommand(undone, relocate(undone, { transform: { ...destination, x: -1 } }), editPolicy),
    );
    expect(branched.future).toEqual([]);
    expect(branched.present.revision).toBe("relocation-local-2");
  });

  it("retains full aggregate validation and the existing unrestricted transform contract", () => {
    const session = initial();
    rejectWithoutMutation(session, relocate(session), "piece-limit", {
      ...editPolicy,
      maxInstances: 2,
    });
    const transform = { ...destination, x: 20 };
    rejectWithoutMutation(session, relocate(session, { transform }), "missing-connection");
    const draft = value(
      applyCommand(session, { type: "set-transform", id: "moving", transform }, editPolicy),
    );
    expect(draft.present.instances[1].transform).toEqual(transform);
  });
});
