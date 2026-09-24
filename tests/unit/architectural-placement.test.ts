import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createSession,
  diagnosePlacement,
  findStudContacts,
  getPartConnections,
  getPlacementCandidates,
  hasSupportedDiagnosticGeometry,
  rotateVector,
  undo,
  validatePlacement,
  type Model,
  type PartInstance,
  type QuarterTurn,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

const definition = (id: string) => partDefinitions.find((part) => part.id === id)!;
function instance(id: string, partId: string, x: number, y: number, z = 0): PartInstance {
  return { id, partId, colorId: "ivory", groupId: "house", transform: { x, y, z, rotation: 0 } };
}
const base: Model = {
  id: "house",
  title: "Manual house",
  baselineRevision: "base",
  revision: "base",
  groups: [{ id: "house", name: "House", protected: false }],
  instances: [instance("base", "demo-plate-4x4", 0, 0.2)],
};
const door = definition("demo-door-assembly-1x2x4");

describe("Supported nominal architectural construction", () => {
  it.each([0, 90, 180, 270] as QuarterTurn[])(
    "mounts a framed door at %s degrees with real sill receivers and header studs",
    (rotation) => {
      const transform = { ...rotateVector({ x: 0, y: 2.8, z: 0.5 }, rotation), rotation };
      expect(getPartConnections(door).receivers).toHaveLength(2);
      expect(getPartConnections(door).studs).toHaveLength(2);
      expect(findStudContacts(base, partDefinitions, door, transform)).toHaveLength(2);
      expect(validatePlacement(base, partDefinitions, door, transform, "connect").ok).toBe(true);
      const candidates = getPlacementCandidates({
        model: base,
        definitions: partDefinitions,
        definition: door,
        transform,
        orientationPolicy: "keep",
      });
      expect(candidates.some((candidate) => candidate.diagnostic.status === "no-conflict")).toBe(
        true,
      );
    },
  );

  it.each(["demo-slope-2x4", "demo-slope-1x2", "demo-roof-bed"])(
    "supports %s receiver cavities through every quarter turn",
    (partId) => {
      const part = definition(partId);
      for (const rotation of [0, 90, 180, 270] as QuarterTurn[]) {
        const offset = rotateVector(
          { x: part.width % 2 ? 0.5 : 0, y: 0.4 + part.height / 2, z: part.depth % 2 ? 0.5 : 0 },
          rotation,
        );
        const transform = { ...offset, rotation };
        expect(hasSupportedDiagnosticGeometry(part)).toBe(true);
        expect(findStudContacts(base, partDefinitions, part, transform)).toHaveLength(
          part.width * part.depth,
        );
        expect(validatePlacement(base, partDefinitions, part, transform, "connect").ok).toBe(true);
        const candidates = getPlacementCandidates({
          model: base,
          definitions: partDefinitions,
          definition: part,
          transform,
          orientationPolicy: "keep",
        });
        expect(candidates.some((candidate) => candidate.diagnostic.status === "no-conflict")).toBe(
          true,
        );
      }
    },
  );

  it("builds four courses around a connected door, then mounts an actual header and roof", () => {
    const walls = [-1.5, 1.5].flatMap((x, side) =>
      Array.from({ length: 4 }, (_, course) =>
        instance(`wall-${side}-${course}`, "demo-brick-1x1", x, 1 + course * 1.2, 0.5),
      ),
    );
    const model = { ...base, instances: [...base.instances, ...walls] };
    const original = createSession(model);
    const result = applyCommand(
      original,
      {
        type: "place",
        baseRevision: model.revision,
        placement: "connect",
        instance: instance("door", door.id, 0, 2.8, 0.5),
      },
      editPolicy,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const header = instance("header", "demo-brick-1x2", 0, 5.8, 0.5);
    const withHeader = applyCommand(
      result.value,
      {
        type: "place",
        baseRevision: result.value.present.revision,
        placement: "connect",
        instance: header,
      },
      editPolicy,
    );
    expect(withHeader.ok).toBe(true);
    if (!withHeader.ok) throw new Error(withHeader.error.message);
    const roof = instance("roof", "demo-slope-2x4", 0, 7);
    expect(
      applyCommand(
        withHeader.value,
        {
          type: "place",
          baseRevision: withHeader.value.present.revision,
          placement: "connect",
          instance: roof,
        },
        editPolicy,
      ).ok,
    ).toBe(true);
    expect(undo(result.value)).toMatchObject({ ok: true, value: { present: model } });
    expect(original.present).toEqual(model);
  });

  it.each([0, 90, 180, 270] as QuarterTurn[])(
    "rejects a roof penetrating a wall at %s degrees without changing the document",
    (rotation) => {
      const wallPosition = rotateVector({ x: 0, y: 1, z: 0 }, rotation);
      const model = {
        ...base,
        instances: [
          ...base.instances,
          { ...instance("wall", "demo-brick-2x2", 0, 1), transform: { ...wallPosition, rotation } },
        ],
      };
      const session = createSession(model);
      const before = structuredClone(session);
      const result = applyCommand(
        session,
        {
          type: "place",
          baseRevision: model.revision,
          placement: "connect",
          instance: {
            ...instance("roof", "demo-slope-2x4", 0, 1),
            transform: { x: 0, y: 1, z: 0, rotation },
          },
        },
        editPolicy,
      );
      expect(result).toMatchObject({ ok: false, error: { code: "occupied-volume" } });
      expect(session).toEqual(before);
    },
  );

  it("rejects a wall through the mounted door leaf, including the apparently empty frame opening", () => {
    const mounted = instance("door", door.id, 0, 2.8, 0.5);
    const model = { ...base, instances: [...base.instances, mounted] };
    const transform = { x: 0, y: 1, z: 0.5, rotation: 0 as const };
    expect(
      diagnosePlacement(model, partDefinitions, definition("demo-brick-1x2"), transform)
        .conflictingIds,
    ).toContain("door");
    const session = createSession(model);
    const before = structuredClone(session);
    expect(
      applyCommand(
        session,
        {
          type: "place",
          placement: "connect",
          baseRevision: model.revision,
          instance: { ...instance("wall", "demo-brick-1x2", 0, 1, 0.5), transform },
        },
        editPolicy,
      ),
    ).toMatchObject({ ok: false, error: { code: "occupied-volume" } });
    expect(session).toEqual(before);
  });

  it("does not invent an attachment for a loose decorative door or a frame resting on smooth tiles", () => {
    const smooth = { ...base, instances: [instance("smooth", "demo-tile-2x2", 0, 0.2)] };
    const session = createSession(smooth);
    const before = structuredClone(session);
    for (const partId of ["demo-door-leaf", door.id]) {
      const part = definition(partId);
      const placed = instance("door", partId, 0, 0.4 + part.height / 2, 0.5);
      expect(
        applyCommand(
          session,
          { type: "place", placement: "connect", baseRevision: smooth.revision, instance: placed },
          editPolicy,
        ).ok,
      ).toBe(false);
      expect(session).toEqual(before);
    }
    expect(hasSupportedDiagnosticGeometry(definition("demo-door-leaf"))).toBe(false);
    expect(getPartConnections(definition("demo-door-leaf")).receivers).toEqual([]);
  });
});
