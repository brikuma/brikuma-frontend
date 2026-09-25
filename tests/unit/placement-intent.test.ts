import { describe, expect, it } from "vitest";
import {
  findStudContacts,
  validatePlacement,
  type GridTransform,
  type Model,
  type PartInstance,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import {
  rotatePlacementPreview,
  suggestAttachmentPreview,
  type PlacementIntentInput,
} from "../../src/features/editor/placement-intent";
import type { PlacementPreview } from "../../src/features/editor/viewport-types";

const definition = (id: string) => partDefinitions.find((part) => part.id === id)!;
function part(id: string, partId: string, transform: GridTransform): PartInstance {
  return { id, partId, colorId: "ivory", groupId: "build", transform };
}
function modelWith(instances: readonly PartInstance[] = []): Model {
  return {
    id: "mixed-build",
    title: "Mixed build",
    baselineRevision: "base",
    revision: "base",
    groups: [{ id: "build", name: "Build", protected: false }],
    instances,
  };
}
function input(
  model: Model,
  placement: PlacementPreview,
  eligibleTargetIds = model.instances.map((instance) => instance.id),
): PlacementIntentInput {
  return {
    model,
    definitions: partDefinitions,
    definition: definition(placement.partId),
    placement,
    eligibleTargetIds,
    bounds: editPolicy.bounds,
  };
}
function preview(
  transform: GridTransform,
  target: PlacementPreview["target"] = "surface",
  partId = "demo-brick-1x2",
): PlacementPreview {
  return { partId, colorId: "terracotta", target, transform };
}
function allowed(model: Model, placement: PlacementPreview) {
  return validatePlacement(
    model,
    partDefinitions,
    definition(placement.partId),
    placement.transform,
    placement.target === "surface" ? "connect" : placement.target === "ground" ? "grid" : "free",
    editPolicy.bounds,
  ).ok;
}

describe("Rotating a pending placement", () => {
  it.each([
    { x: 0, z: 0.5 },
    { x: -4, z: -3.5 },
    { x: 6, z: 2.5 },
  ])("keeps a 1 × 2 floor preview aligned without four-turn drift at $x/$z", ({ x, z }) => {
    const model = modelWith();
    const origin: GridTransform = { x, y: 0.6, z, rotation: 0 };
    const original = preview(origin, "ground");
    let pending = original;
    for (let turn = 1; turn <= 4; turn++) {
      pending = rotatePlacementPreview({ ...input(model, pending), origin });
      expect(pending.transform.rotation).toBe((turn * 90) % 360);
      expect(pending.transform.y).toBe(origin.y);
      expect(allowed(model, pending)).toBe(true);
      expect(Math.hypot(pending.transform.x - x, pending.transform.z - z)).toBeLessThanOrEqual(
        Math.SQRT1_2,
      );
    }
    expect(pending).toEqual(original);
    expect(model.instances).toHaveLength(0);
  });

  it.each(["demo-brick-2x2", "demo-brick-2x4"])(
    "preserves the center and existing grid height of %s",
    (partId) => {
      const origin: GridTransform = { x: -3, y: 1.4, z: 2, rotation: 0 };
      const pending = rotatePlacementPreview({
        ...input(modelWith(), preview(origin, "ground", partId)),
        origin,
      });
      expect(pending.transform).toEqual({ ...origin, rotation: 90 });
      expect(allowed(modelWith(), pending)).toBe(true);
    },
  );

  it("keeps Free placement at its intended center without adding a connection claim", () => {
    const origin: GridTransform = { x: -2.3, y: 0.75, z: 4.1, rotation: 270 };
    const original = preview(origin, "free");
    expect(rotatePlacementPreview({ ...input(modelWith(), original), origin })).toEqual({
      ...original,
      transform: { ...origin, rotation: 0 },
    });
  });

  it("aligns a narrow brick on a rotated support and returns to its original pose after four turns", () => {
    const model = modelWith([
      part("support", "demo-brick-2x4", { x: -0.5, y: 0.6, z: -0.5, rotation: 90 }),
    ]);
    const origin: GridTransform = { x: -0.5, y: 1.8, z: 0, rotation: 0 };
    const original = preview(origin);
    expect(allowed(model, original)).toBe(true);
    let pending = original;
    for (let turn = 0; turn < 4; turn++) {
      pending = rotatePlacementPreview({ ...input(model, pending), origin });
      expect(allowed(model, pending)).toBe(true);
      expect(pending.transform.y).toBe(origin.y);
      expect(
        findStudContacts(model, partDefinitions, definition(pending.partId), pending.transform).map(
          (contact) => contact.supportId,
        ),
      ).toContain("support");
    }
    expect(pending).toEqual(original);
  });

  it("considers every underside socket when the first socket's nearby alignment is occupied", () => {
    const model = modelWith([
      part("support", "demo-brick-1x1", { x: 0, y: 0.6, z: 0, rotation: 0 }),
      part("blocker", "demo-brick-1x1", { x: 0, y: 1.8, z: -1, rotation: 0 }),
    ]);
    const origin: GridTransform = { x: 0.5, y: 1.8, z: 0, rotation: 0 };
    const pending = rotatePlacementPreview({ ...input(model, preview(origin)), origin });
    expect(pending.transform.x).toBeCloseTo(0, 6);
    expect(pending.transform).toMatchObject({ y: 1.8, z: 0.5, rotation: 90 });
    expect(allowed(model, pending)).toBe(true);
  });

  it("retains a blocked rotated preview when every nearby alignment collides, including hidden geometry", () => {
    const model = modelWith([
      part("support", "demo-brick-1x1", { x: 0, y: 0.6, z: 0, rotation: 0 }),
      part("back", "demo-brick-1x1", { x: 0, y: 1.8, z: -1, rotation: 0 }),
      part("front", "demo-brick-1x1", { x: 0, y: 1.8, z: 1, rotation: 0 }),
    ]);
    const origin: GridTransform = { x: 0.5, y: 1.8, z: 0, rotation: 0 };
    const original = preview(origin);
    const before = structuredClone({ model, original });
    const pending = rotatePlacementPreview({
      ...input(model, original, ["support"]),
      origin,
    });
    expect(pending).toEqual({ ...original, transform: { ...origin, rotation: 90 } });
    expect(allowed(model, pending)).toBe(false);
    expect({ model, original }).toEqual(before);
  });

  it("does not search hidden, distant, or higher supports when rotating an attachment", () => {
    const model = modelWith([
      part("hidden", "demo-brick-1x1", { x: 0, y: 0.6, z: 0, rotation: 0 }),
      part("higher", "demo-brick-1x1", { x: 0.5, y: 1, z: 0.5, rotation: 0 }),
      part("distant", "demo-brick-2x4", { x: 10, y: 0.6, z: 0, rotation: 0 }),
    ]);
    const origin: GridTransform = { x: 0.5, y: 1.8, z: 0, rotation: 0 };
    const pending = rotatePlacementPreview({
      ...input(model, preview(origin), ["higher", "distant"]),
      origin,
    });
    expect(pending.transform).toEqual({ ...origin, rotation: 90 });
    expect(pending.target).toBe("surface");
    expect(allowed(model, pending)).toBe(false);
  });

  it("does not move an unattached preview onto another support merely because it was rotated", () => {
    const model = modelWith([
      part("support", "demo-brick-2x4", { x: 0, y: 0.6, z: 0, rotation: 0 }),
    ]);
    const origin: GridTransform = { x: 0, y: 2.2, z: 0.5, rotation: 0 };
    const pending = rotatePlacementPreview({ ...input(model, preview(origin)), origin });
    expect(pending.transform).toEqual({ ...origin, rotation: 90 });
    expect(allowed(model, pending)).toBe(false);
  });
});

describe("Recovering an explicit attachment intent", () => {
  const base = part("base", "demo-brick-2x4", { x: 0, y: 0.6, z: 0, rotation: 0 });

  it("recovers a floor preview onto a nearby support without changing its color or rotation", () => {
    const model = modelWith([base]);
    const original = preview({ x: 0, y: 0.6, z: 0, rotation: 90 }, "ground", "demo-brick-2x2");
    const before = structuredClone({ model, original });
    const attached = suggestAttachmentPreview(input(model, original));
    expect(attached).toMatchObject({
      partId: original.partId,
      colorId: original.colorId,
      target: "surface",
      transform: { y: 1.8, z: 0, rotation: 90 },
    });
    expect(attached.transform.x).toBeCloseTo(0, 6);
    expect(allowed(model, attached)).toBe(true);
    expect({ model, original }).toEqual(before);
  });

  it("keeps an already valid attachment exactly where the user put it", () => {
    const model = modelWith([base]);
    const original = preview({ x: 1, y: 1.8, z: 0.5, rotation: 180 });
    expect(allowed(model, original)).toBe(true);
    expect(suggestAttachmentPreview(input(model, original))).toEqual(original);
  });

  it("uses a nearby preferred support at its actual top without resetting a quarter turn", () => {
    const high = part("chosen", "demo-brick-2x4", { x: 2, y: 10.6, z: 0, rotation: 90 });
    const model = modelWith([base, high]);
    const original = preview({ x: 2, y: 0.6, z: 0, rotation: 270 }, "ground", "demo-brick-2x2");
    const attached = suggestAttachmentPreview({
      ...input(model, original),
      preferredTargetIds: ["chosen"],
    });
    expect(attached.transform).toEqual({ x: 2, y: 11.8, z: 0, rotation: 270 });
    expect(attached.colorId).toBe(original.colorId);
    expect(allowed(model, attached)).toBe(true);
  });

  it("does not use a hidden or horizontally distant preferred support", () => {
    const far = part("far", "demo-brick-2x4", { x: 100, y: 0.6, z: 0, rotation: 0 });
    const model = modelWith([base, far]);
    const original = preview({ x: 0, y: 0.6, z: 0, rotation: 90 }, "ground", "demo-brick-2x2");
    const attached = suggestAttachmentPreview({
      ...input(model, original, ["far"]),
      preferredTargetIds: ["base", "far"],
    });
    expect(attached).toEqual({ ...original, target: "surface" });
    expect(allowed(model, attached)).toBe(false);
  });

  it("keeps collisions with ineligible pieces in the check and leaves recovery visibly blocked", () => {
    const cover = part("hidden-cover", "demo-brick-2x6", { x: 0, y: 1.8, z: 0, rotation: 0 });
    const model = modelWith([base, cover]);
    const original = preview({ x: 0, y: 0.6, z: 0, rotation: 90 }, "ground", "demo-brick-2x2");
    const attached = suggestAttachmentPreview({
      ...input(model, original, ["base"]),
      preferredTargetIds: ["base"],
    });
    expect(attached).toEqual({ ...original, target: "surface" });
    expect(allowed(model, attached)).toBe(false);
  });
});
