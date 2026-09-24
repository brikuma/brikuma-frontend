import { describe, expect, it } from "vitest";
import { applyCommand, createSession, deriveBom, type Model } from "../../src/core/model/public";
import { createAssemblyView, ZERO_ASSEMBLY_OFFSET } from "../../src/features/editor/assembly-view";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import type { AssemblyViewMetadata } from "../../src/fixtures/scene-types";
import { fixture as house } from "../../src/fixtures/scenes/masseria";
import { fixture as rover } from "../../src/fixtures/scenes/rover";
import { fixture as creature } from "../../src/fixtures/scenes/creature";
import { fixture as blank } from "../../src/fixtures/scenes/blank";

function plan(fixture = house, mode: "roof" | "modules" = "modules", amount = 1) {
  return createAssemblyView(fixture.model, partDefinitions, fixture.assemblyView, mode, amount);
}
const single: Model = {
  ...blank.model,
  instances: [
    {
      id: "example",
      groupId: "workspace",
      partId: "demo-brick-2x4",
      colorId: "teal",
      transform: { x: 0, y: 0.6, z: 0, rotation: 90 },
    },
  ],
};
const metadata: AssemblyViewMetadata = {
  modelId: single.id,
  baselineRevision: single.baselineRevision,
  fixedPartIds: [],
  modules: [
    {
      id: "module",
      name: "Example module",
      description: "An authored display module.",
      partIds: ["example"],
      offset: { x: 0, y: 0, z: 3 },
      views: ["modules"],
    },
  ],
};

describe("Authored assembly presentation", () => {
  it("opens only the complete main roof in roof-access mode", () => {
    const view = plan(house, "roof");
    expect(view.available).toBe(true);
    expect(view.modules.map((assemblyModule) => assemblyModule.id)).toEqual(["main-roof"]);
    expect(view.modules[0].partIds).toHaveLength(55);
    expect([...view.offsets.values()].filter((offset) => offset.y !== 0)).toHaveLength(55);
    for (const id of ["roof-0-0", "roof-bed-0--1", "ridge-0"])
      expect(view.offsets.get(id)).toEqual({ x: 0, y: 4, z: 0 });
    for (const id of ["tower-roof-0-0", "chimney-0", "chimney-cap", "entry-gate", "base-0-0"])
      expect(view.offsets.get(id)).toEqual(ZERO_ASSEMBLY_OFFSET);
    expect(view.caption).toContain("not a verified build order");
  });

  it("keeps doors, vines, cap and landing decorations with their owning modules", () => {
    const view = plan();
    expect(view.modules.map((assemblyModule) => assemblyModule.id)).toEqual([
      "entrance",
      "main-roof",
      "stairs",
      "tower-roof",
    ]);
    for (const id of ["entry-gate", "front-coping-0", "gate-lantern--3p5", "corner-climber-1-0"])
      expect(view.offsets.get(id), id).toEqual({ x: 0, y: 0, z: 4 });
    for (const id of ["stair-tread-0", "stair-parapet-0-0", "landing--4p5", "terrace-pot-0-soil"])
      expect(view.offsets.get(id), id).toEqual({ x: 6, y: 0, z: 0 });
    for (const id of ["tower-roof-0-0", "tower-roof-bed-0--1", "chimney-cap"])
      expect(view.offsets.get(id), id).toEqual({ x: 0, y: 3, z: 0 });
    for (const id of ["tree-trunk-low", "room-door", "pergola-post--8p5--0p5"])
      expect(view.offsets.get(id), id).toEqual(ZERO_ASSEMBLY_OFFSET);
  });

  it("gives every fixture part exactly one deterministic offset without changing the model", () => {
    for (const fixture of [house, rover, creature]) {
      const before = JSON.stringify(fixture.model);
      const bom = deriveBom(fixture.model);
      const view = plan(fixture);
      expect(view.available).toBe(true);
      expect(view.unassignedPartCount).toBe(0);
      expect(view.offsets.size).toBe(fixture.model.instances.length);
      const all = view.modules.flatMap((assemblyModule) => assemblyModule.partIds);
      expect(new Set(all).size).toBe(all.length);
      for (const assemblyModule of view.modules)
        for (const id of assemblyModule.partIds)
          expect(view.offsets.get(id)).toEqual(assemblyModule.offset);
      const reordered = createAssemblyView(
        {
          ...fixture.model,
          groups: [...fixture.model.groups].reverse(),
          instances: [...fixture.model.instances].reverse(),
        },
        partDefinitions,
        fixture.assemblyView,
      );
      expect([...reordered.offsets].sort()).toEqual([...view.offsets].sort());
      expect(reordered.modules).toEqual(view.modules);
      expect(JSON.stringify(fixture.model)).toBe(before);
      expect(deriveBom(fixture.model)).toEqual(bom);
    }
  });

  it("keeps the rover body and sensors together and pulls wheels along the axle", () => {
    const view = plan(rover);
    for (const id of ["frame--1-0", "camera-eye--1", "mast-0"])
      expect(view.offsets.get(id)).toEqual({ x: 0, y: 3, z: 0 });
    expect(view.offsets.get("wheel--1-0")).toEqual({ x: -3, y: 0, z: 0 });
    expect(view.offsets.get("wheel-1-0")).toEqual({ x: 3, y: 0, z: 0 });
    expect(view.offsets.get("chassis-0-0")).toEqual(ZERO_ASSEMBLY_OFFSET);
    const sculpture = plan(creature);
    expect(sculpture.offsets.get("eye-white--1")).toEqual(sculpture.offsets.get("head--1--1-0"));
    expect(sculpture.offsets.get("foot--1")).toEqual(ZERO_ASSEMBLY_OFFSET);
  });

  it("supports the authored terrace variant and ignores removed roof IDs", () => {
    const changed = applyCommand(
      createSession(house.model),
      { type: "apply-variant", variant: house.variant! },
      editPolicy,
    );
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    const view = createAssemblyView(
      changed.value.present,
      partDefinitions,
      house.assemblyView,
      "roof",
    );
    expect(view.modules[0].partIds).toHaveLength(20);
    expect(view.offsets.get("simple-roof-0-0")).toEqual({ x: 0, y: 4, z: 0 });
    expect(view.offsets.has("roof-0-0")).toBe(false);
    expect(view.unassignedPartCount).toBe(0);
  });

  it("scales all module offsets together and derives anchors from rotated current bounds", () => {
    const half = createAssemblyView(single, partDefinitions, metadata, "modules", 0.5);
    expect(half.offsets.get("example")).toEqual({ x: 0, y: 0, z: 1.5 });
    expect(half.modules[0].bounds).toEqual({
      min: { x: -1, y: 0, z: -2 },
      max: { x: 1, y: 1.4, z: 2 },
    });
    expect(half.modules[0].anchor).toEqual({ x: 0, y: 0.7, z: -2 });
    expect(half.modules[0].targetAnchor).toEqual({ x: 0, y: 0.7, z: -0.5 });
    for (const [amount, expected] of [
      [-5, 0],
      [0, 0],
      [2, 1],
      [NaN, 0],
      [Infinity, 0],
    ]) {
      const view = createAssemblyView(single, partDefinitions, metadata, "modules", amount);
      expect(view.amount).toBe(expected);
      expect(view.offsets.get("example")!.z).toBe(3 * expected);
    }
  });

  it("keeps local additions seated while retaining compatible authored modules", () => {
    const edited = {
      ...house.model,
      revision: "masseria-local-12",
      instances: [...house.model.instances, { ...house.model.instances[0], id: "local-added" }],
    };
    const view = createAssemblyView(edited, partDefinitions, house.assemblyView);
    expect(view.available).toBe(true);
    expect(view.offsets.get("local-added")).toEqual(ZERO_ASSEMBLY_OFFSET);
    expect(view.unassignedPartCount).toBe(1);
    expect(view.caption).toContain("1 unassigned local part stays in place");
  });

  it("fails safely for stale metadata, conflicting assignments and unknown geometry", () => {
    for (const changed of [
      { ...metadata, baselineRevision: "old-baseline" },
      { ...metadata, modelId: "another-model" },
      { ...metadata, fixedPartIds: ["example"] },
      { ...metadata, modules: [{ ...metadata.modules[0], offset: { x: NaN, y: 0, z: 0 } }] },
      { ...metadata, modules: [{ ...metadata.modules[0], offset: { x: 1000, y: 0, z: 0 } }] },
      { ...metadata, modules: [metadata.modules[0], { ...metadata.modules[0], id: "conflict" }] },
      { ...metadata, modules: [metadata.modules[0], metadata.modules[0]] },
      { ...metadata, modules: [{ ...metadata.modules[0], partIds: ["deleted"] }] },
    ]) {
      const view = createAssemblyView(single, partDefinitions, changed);
      expect(view.available).toBe(false);
      expect(view.offsets.get("example")).toEqual(ZERO_ASSEMBLY_OFFSET);
    }
    expect(createAssemblyView(single, [], metadata).available).toBe(false);
  });

  it("does not invent an assembly plan for blank or unassigned models", () => {
    expect(plan(blank).available).toBe(false);
    expect(createAssemblyView(single, partDefinitions, undefined).available).toBe(false);
    expect(plan(rover, "roof").available).toBe(false);
    expect(plan(creature, "roof").available).toBe(false);
    expect(plan(blank).offsets.size).toBe(0);
  });
});
