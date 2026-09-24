import { describe, expect, it } from "vitest";
import {
  findStudContacts,
  getPartConnections,
  type Model,
  type PartInstance,
  type QuarterTurn,
} from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";
import { placementFeedback } from "../../src/features/editor/placement-feedback";

const definition = (id: string) => partDefinitions.find((part) => part.id === id)!;
const base: PartInstance = {
  id: "base",
  partId: "demo-brick-2x4",
  groupId: "assembly",
  colorId: "ivory",
  transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
};
const model: Model = {
  id: "sample",
  title: "Sample",
  revision: "r1",
  baselineRevision: "r1",
  groups: [{ id: "assembly", name: "Assembly", protected: false }],
  instances: [base],
};
const pending = {
  partId: "demo-brick-1x1",
  colorId: "ivory",
  target: "surface" as const,
  transform: { x: 0.5, y: 1.8, z: 0.5, rotation: 0 as const },
};

describe("Stud connector geometry and placement", () => {
  it("uses only the two hollow arch piers and the supported roof-bed grid", () => {
    expect(getPartConnections(definition("demo-gate-arch")).receivers).toEqual([
      { x: -2, z: 0 },
      { x: 2, z: 0 },
    ]);
    expect(getPartConnections(definition("demo-roof-bed")).receivers).toHaveLength(8);
  });

  it("distinguishes a smooth tile's underside sockets from its absent top studs", () => {
    const profile = getPartConnections(definition("demo-tile-2x2"));
    expect(profile.studs).toHaveLength(0);
    expect(profile.receivers).toHaveLength(4);
    expect(getPartConnections(definition("demo-brick-2x4")).studs).toHaveLength(8);
  });
  it.each([
    "demo-leaf-sprig",
    "demo-gate-frame",
    "demo-window-panel",
    "demo-roof-tile",
    "demo-roof-ridge",
  ])("does not invent stud sockets for %s", (id) => {
    expect(getPartConnections(definition(id)).receivesStuds).toBe(false);
  });
  it.each([0, 90, 180, 270] as QuarterTurn[])(
    "matches real receiving sites after a %s degree turn",
    (rotation) => {
      const contacts = findStudContacts(model, partDefinitions, definition("demo-brick-1x2"), {
        x: rotation % 180 ? 0.5 : 0,
        y: 1.8,
        z: rotation % 180 ? 0 : 0.5,
        rotation,
      });
      expect(contacts).toHaveLength(2);
      expect(contacts.every((contact) => contact.supportId === "base")).toBe(true);
    },
  );
  it("rejects the half-stud false connection between four studs", () => {
    expect(
      placementFeedback(model, partDefinitions, {
        ...pending,
        transform: { ...pending.transform, x: 0, z: 0 },
      }),
    ).toMatchObject({ allowed: false, kind: "blocked", contacts: [] });
  });
  it("accepts a genuine aligned stud and reports its position", () => {
    expect(placementFeedback(model, partDefinitions, pending)).toMatchObject({
      allowed: true,
      kind: "connected",
      contacts: [{ x: 0.5, y: expect.closeTo(1.2), z: 0.5, supportId: "base" }],
    });
  });
  it("does not attach to a smooth tile or floating grid coordinate", () => {
    const smooth = {
      ...model,
      instances: [{ ...base, partId: "demo-tile-2x2", transform: { ...base.transform, y: 0.2 } }],
    };
    expect(
      placementFeedback(smooth, partDefinitions, {
        ...pending,
        transform: { ...pending.transform, y: 1 },
      }).allowed,
    ).toBe(false);
    expect(
      placementFeedback(model, partDefinitions, {
        ...pending,
        transform: { ...pending.transform, x: 20 },
      }).allowed,
    ).toBe(false);
  });
  it("blocks strict placement with unknown coverage when a custom detail occupies a socket", () => {
    const blocked = {
      ...model,
      instances: [
        ...model.instances,
        {
          id: "detail",
          partId: "demo-detail-1x1",
          colorId: "ivory",
          groupId: "assembly",
          transform: { ...pending.transform, y: 1.5 },
        },
      ],
    };
    expect(placementFeedback(blocked, partDefinitions, pending)).toMatchObject({
      allowed: false,
      message: "This connection cannot be checked. Choose a supported piece or another position.",
    });
  });
  it("keeps free-form placement explicit and does not mutate the model", () => {
    const before = structuredClone(model);
    expect(
      placementFeedback(model, partDefinitions, {
        ...pending,
        target: "free",
        transform: base.transform,
      }),
    ).toMatchObject({ allowed: true, kind: "free", contacts: [] });
    expect(model).toEqual(before);
  });
});
