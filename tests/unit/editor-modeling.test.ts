import { describe, expect, it } from "vitest";
import {
  acceptExperiment,
  applyCommand,
  createModel,
  createSession,
  diagnoseModel,
  diagnosePlacement,
  fromLDrawPoint,
  getGroupInstanceIds,
  getPlacementCandidates,
  getReplacementFeedback,
  isGroupProtected,
  parseProject,
  previewExperiment,
  redo,
  rotateVector,
  serializeProject,
  snapGridTransform,
  undo,
  type EditCommand,
  type EditingPolicy,
  type Model,
  type PartDefinition,
  type PartInstance,
  type Result,
} from "../../src/core/model/public";

const brick: PartDefinition = {
  id: "brick",
  name: "Original brick 1 × 2",
  width: 2,
  height: 1.2,
  depth: 1,
  shape: "brick",
  studs: true,
};
const square: PartDefinition = { ...brick, id: "square", width: 2, depth: 2 };
const tile: PartDefinition = { ...brick, id: "tile", height: 0.4, shape: "plate", studs: false };
const unsupported: PartDefinition = { ...brick, id: "slope", shape: "slope", studs: false };
const odd: PartDefinition = { ...brick, id: "odd", width: 3 };
const policy: EditingPolicy = {
  parts: [brick, square, tile, unsupported, odd],
  colors: ["ivory", "teal"],
  maxInstances: 5000,
  bounds: 100,
  historyLimit: 40,
};
const part = (id: string, x = 0, y = 0.6): PartInstance => ({
  id,
  partId: "brick",
  colorId: "ivory",
  groupId: "root",
  transform: { x, y, z: 0, rotation: 0 },
});
const base: Model = {
  id: "study",
  title: "Original study",
  baselineRevision: "r1",
  revision: "r1",
  groups: [{ id: "root", name: "Root", protected: false }],
  instances: [part("first"), part("second", 3)],
};
function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
function edit(model: Model, command: EditCommand) {
  return applyCommand(createSession(model), command, policy);
}

describe("Specialist core: canonical values and atomic operations", () => {
  it("EDT-003: the LDraw basis is a proper rotation and quarter turns preserve axes", () => {
    expect(fromLDrawPoint({ x: 20, y: -24, z: 40 })).toEqual({ x: 1, y: 1.2, z: -2 });
    const x = fromLDrawPoint({ x: 20, y: 0, z: 0 }),
      y = fromLDrawPoint({ x: 0, y: 20, z: 0 }),
      z = fromLDrawPoint({ x: 0, y: 0, z: 20 });
    expect({
      x: x.y * y.z - x.z * y.y,
      y: x.z * y.x - x.x * y.z,
      z: x.x * y.y - x.y * y.x,
    }).toEqual(z);
    expect(rotateVector({ x: 1, y: 2, z: 3 }, 90)).toEqual({ x: 3, y: 2, z: -1 });
  });
  it("EDT-018 / EDT-025: a bulk rigid rotation makes one snapshot and round-trips exactly", () => {
    const changed = value(
      edit(base, {
        type: "rotate-selection",
        ids: ["first", "second"],
        pivot: { x: 0, y: 0.6, z: 0 },
        quarterTurns: 1,
      }),
    );
    expect(changed.past).toHaveLength(1);
    expect(changed.present.instances[1].transform).toEqual({ x: 0, y: 0.6, z: -3, rotation: 90 });
    expect(value(undo(changed)).present).toEqual(base);
    expect(value(redo(value(undo(changed)))).present).toEqual(changed.present);
    expect(
      edit(base, {
        type: "translate-selection",
        ids: ["first", "second"],
        delta: { x: 0, y: 0, z: 0 },
      }),
    ).toMatchObject({ ok: false, error: { code: "no-change" } });
  });
  it("EDT-021 / EDT-023: a protected descendant blocks every atomic mutation path", () => {
    const model: Model = {
      ...base,
      groups: [
        ...base.groups,
        { id: "child", parentId: "root", name: "Protected child", protected: true },
      ],
      instances: [base.instances[0], { ...base.instances[1], groupId: "child" }],
    };
    const before = JSON.stringify(model);
    const commands: EditCommand[] = [
      { type: "translate-selection", ids: ["first", "second"], delta: { x: 1, y: 0, z: 0 } },
      {
        type: "rotate-selection",
        ids: ["first", "second"],
        pivot: { x: 0, y: 0, z: 0 },
        quarterTurns: 1,
      },
      { type: "recolor-selection", ids: ["first", "second"], colorId: "teal" },
      { type: "remove-selection", ids: ["first", "second"] },
      { type: "replace-part", id: "second", partId: "tile" },
      {
        type: "create-group",
        group: { id: "new", name: "New", protected: false },
        ids: ["first", "second"],
      },
      { type: "move-to-group", ids: ["second"], groupId: "root" },
      { type: "reparent-group", groupId: "root", parentId: "child" },
    ];
    for (const command of commands)
      expect(edit(model, command)).toMatchObject({ ok: false, error: { code: "protected-group" } });
    expect(JSON.stringify(model)).toBe(before);
    const parentProtected = {
      ...model,
      groups: model.groups.map((group) => ({ ...group, protected: group.id === "root" })),
    };
    expect(isGroupProtected(parentProtected, "child")).toBe(true);
    expect(getGroupInstanceIds(model, "root")).toEqual(["first", "second"]);
  });
  it("EDT-023: empty protected descendants and protected ancestors cannot be bypassed", () => {
    const model: Model = {
      ...base,
      groups: [
        ...base.groups,
        { id: "empty", name: "Empty protected", parentId: "root", protected: true },
      ],
    };
    expect(edit(model, { type: "reparent-group", groupId: "root" })).toMatchObject({
      ok: false,
      error: { code: "protected-group" },
    });
    const lockedParent = {
      ...model,
      groups: model.groups.map((group) => ({ ...group, protected: true })),
    };
    expect(
      edit(lockedParent, { type: "set-protection", groupId: "empty", protected: false }),
    ).toMatchObject({ ok: false, error: { code: "protected-group" } });
  });
  it("EDT-022: finite rigid values reject NaN, Infinity, scales and reflected transforms", () => {
    for (const delta of [
      { x: NaN, y: 0, z: 0 },
      { x: 0, y: Infinity, z: 0 },
    ])
      expect(edit(base, { type: "translate-selection", ids: ["first"], delta }).ok).toBe(false);
    expect(
      edit(base, {
        type: "set-transform",
        id: "first",
        transform: { ...base.instances[0].transform, scale: -1 } as PartInstance["transform"],
      }).ok,
    ).toBe(false);
  });
  it("EDT-024: grouping preserves identity/world transforms and rejects cycles", () => {
    const grouped = value(
      edit(base, {
        type: "create-group",
        group: { id: "group", name: "New assembly", protected: false, parentId: "root" },
        ids: ["first"],
      }),
    );
    expect(grouped.present.instances[0].transform).toEqual(base.instances[0].transform);
    expect(grouped.present.instances[0].id).toBe("first");
    expect(
      edit(grouped.present, { type: "reparent-group", groupId: "root", parentId: "group" }),
    ).toMatchObject({ ok: false, error: { code: "group-cycle" } });
    expect(value(undo(grouped)).present).toEqual(base);
  });
});

describe("Specialist core: explainable bounded placement", () => {
  const model = { ...base, instances: [{ ...part("base"), partId: "square" }] };
  it("EDT-004 / EDT-005: odd anchors and legal studs use cavity-aware material checks", () => {
    const transform = { x: 0, y: 1.8, z: 0.5, rotation: 0 as const };
    expect(diagnosePlacement(model, policy.parts, brick, transform).status).toBe("no-conflict");
    const candidates = getPlacementCandidates({
      model,
      definitions: policy.parts,
      definition: odd,
      transform,
      orientationPolicy: "keep",
      sourceConnectorIndex: 1,
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].transform.x % 1).not.toBe(0);
    expect(candidates.every((candidate) => candidate.transform.rotation === 0)).toBe(true);
  });
  it("EDT-006 / EDT-009 / EDT-010: unsupported shapes remain unknown; hidden state cannot affect geometry", () => {
    expect(
      getPlacementCandidates({
        model,
        definitions: policy.parts,
        definition: unsupported,
        transform: part("p").transform,
        orientationPolicy: "keep",
      }),
    ).toEqual([]);
    expect(diagnosePlacement(model, policy.parts, unsupported, part("p").transform).status).toBe(
      "not-checked",
    );
    const overlapping = {
      ...model,
      instances: [...model.instances, part("hidden-obstacle", 0, 1.8)],
    };
    expect(
      diagnosePlacement(overlapping, policy.parts, brick, { x: 0, y: 1.8, z: 0, rotation: 0 })
        .conflictingIds,
    ).toContain("hidden-obstacle");
    expect(diagnoseModel(overlapping, policy.parts)).toEqual(
      diagnoseModel(overlapping, policy.parts),
    );
    expect(diagnoseModel(overlapping, policy.parts).physicalAssessment).toBe("not-evaluated");
  });
  it("EDT-007 / EDT-008: candidate ranking is deterministic and explicit orientation is preserved", () => {
    const query = {
      model,
      definitions: policy.parts,
      definition: brick,
      transform: { x: 0, y: 1.8, z: 0, rotation: 90 as const },
      orientationPolicy: "keep" as const,
    };
    expect(getPlacementCandidates(query)).toEqual(getPlacementCandidates(query));
    const candidates = getPlacementCandidates(query);
    expect(candidates.every((candidate) => candidate.rotationDelta === 0)).toBe(true);
    const locked = candidates[1];
    expect(getPlacementCandidates({ ...query, previousCandidateId: locked.id })[0].id).toBe(
      locked.id,
    );
    const aligned = getPlacementCandidates({ ...query, orientationPolicy: "align", limit: 32 });
    expect(aligned.some((candidate) => candidate.rotationDelta !== 0)).toBe(true);
  });
  it("EDT-004: grid anchors preserve odd/even phase and allow explicit raised grids", () => {
    const even = snapGridTransform(brick, { x: 0.1, y: 1.35, z: 0.1, rotation: 0 });
    expect(even).toEqual({ x: 0, y: 1.4, z: 0.5, rotation: 0 });
    const oddGrid = snapGridTransform(odd, { x: 0.1, y: 0.6, z: 0.1, rotation: 0 });
    expect(oddGrid.x).toBe(0.5);
    expect(
      edit(
        { ...base, instances: [] },
        {
          type: "place",
          instance: { ...part("grid"), transform: even },
          placement: "grid",
          baseRevision: base.revision,
        },
      ).ok,
    ).toBe(true);
    expect(
      edit(
        { ...base, instances: [] },
        {
          type: "place",
          instance: { ...part("grid"), transform: { ...even, x: 0.1 } },
          placement: "grid",
          baseRevision: base.revision,
        },
      ),
    ).toMatchObject({ ok: false, error: { code: "invalid-transform" } });
  });
  it("EDT-016 / EDT-017: strict placement revalidates revision and independent occupied volume", () => {
    const session = createSession(model),
      instance = {
        ...part("added", 0, 1.8),
        transform: { x: 0, y: 1.8, z: 0.5, rotation: 0 as const },
      };
    const placed = value(
      applyCommand(
        session,
        { type: "place", instance, placement: "connect", baseRevision: model.revision },
        policy,
      ),
    );
    expect(placed.present.instances).toHaveLength(2);
    expect(session.present.instances).toHaveLength(1);
    expect(
      applyCommand(
        placed,
        {
          type: "place",
          instance: { ...instance, id: "stale" },
          placement: "connect",
          baseRevision: model.revision,
        },
        policy,
      ),
    ).toMatchObject({ ok: false, error: { code: "revision-conflict" } });
    expect(
      applyCommand(
        session,
        {
          type: "place",
          instance: { ...instance, transform: model.instances[0].transform },
          placement: "connect",
          baseRevision: model.revision,
        },
        policy,
      ),
    ).toMatchObject({ ok: false, error: { code: "occupied-volume" } });
    expect(
      applyCommand(
        session,
        {
          type: "place",
          instance: { ...instance, transform: model.instances[0].transform },
          placement: "free",
          baseRevision: model.revision,
        },
        policy,
      ).ok,
    ).toBe(true);
  });
});

describe("Specialist core: experiments, replacement and explicit local files", () => {
  it("EDT-042: preview is immutable; stale/protection changes reject accept; acceptance is atomic", () => {
    const before = JSON.stringify(base),
      command: EditCommand = {
        type: "recolor-selection",
        ids: ["first", "second"],
        colorId: "teal",
      };
    const preview = value(previewExperiment(base, command, policy));
    expect(preview.impact.recoloredIds).toEqual(["first", "second"]);
    expect(preview.impact.partDelta).toBe(0);
    expect(JSON.stringify(base)).toBe(before);
    const accepted = value(acceptExperiment(createSession(base), preview, policy));
    expect(accepted.past).toHaveLength(1);
    expect(value(undo(accepted)).present).toEqual(base);
    const protectedSession = value(
      edit(base, { type: "set-protection", groupId: "root", protected: true }),
    );
    expect(acceptExperiment(protectedSession, preview, policy)).toMatchObject({
      ok: false,
      error: { code: "revision-conflict" },
    });
    expect(acceptExperiment(accepted, preview, policy)).toMatchObject({
      ok: false,
      error: { code: "revision-conflict" },
    });
  });
  it("EDT-043: replacement preserves identity/base height and reports connector changes/unknown", () => {
    expect(value(getReplacementFeedback(base, "first", "tile", policy))).toMatchObject({
      compatibleFootprint: true,
      connectors: "changed",
      heightDelta: -0.8,
    });
    expect(value(getReplacementFeedback(base, "first", "slope", policy)).connectors).toBe(
      "unknown",
    );
    const changed = value(edit(base, { type: "replace-part", id: "first", partId: "tile" }));
    expect(changed.present.instances[0]).toMatchObject({
      id: "first",
      partId: "tile",
      transform: { y: 0.2 },
    });
    expect(edit(base, { type: "replace-part", id: "first", partId: "square" })).toMatchObject({
      ok: false,
      error: { code: "incompatible-footprint" },
    });
  });
  it("EDT-048: file round-trip is exact and rejects unsafe/future/inconsistent data without mutation", () => {
    expect(value(parseProject(serializeProject(base), policy))).toEqual(base);
    const document = JSON.parse(serializeProject(base));
    expect(parseProject(JSON.stringify({ ...document, schemaVersion: 2 }), policy)).toMatchObject({
      ok: false,
      error: { code: "unsupported-version" },
    });
    const invalidModels = [
      { ...base, instances: [base.instances[0], base.instances[0]] },
      { ...base, instances: [{ ...base.instances[0], partId: "unknown" }] },
      { ...base, groups: [{ ...base.groups[0], parentId: "root" }] },
      { ...base, title: "bad\u0000label" },
      {
        ...base,
        instances: [
          { ...base.instances[0], transform: { ...base.instances[0].transform, scale: 2 } },
        ],
      },
    ];
    for (const model of invalidModels)
      expect(parseProject(JSON.stringify({ ...document, model }), policy).ok).toBe(false);
    expect(parseProject("{ broken", policy).ok).toBe(false);
    expect(parseProject(" ".repeat(5 * 1024 * 1024 + 1), policy).ok).toBe(false);
  });
  it("EDT-048: continuing a loaded local revision cannot reuse its revision identity", () => {
    const loaded = { ...base, revision: "study-local-7" };
    const session = value(edit(loaded, { type: "recolor", id: "first", colorId: "teal" }));
    expect(session.present.revision).toBe("study-local-8");
    expect(
      value(previewExperiment(loaded, { type: "remove", id: "first" }, policy)).impact.stepsStale,
    ).toBe(true);
  });
  it("EDT-025: forty seeded operations maintain unique identity and undo/redo exactness", () => {
    let session = createSession(value(createModel(base, policy)));
    for (let index = 0; index < 40; index++)
      session = value(
        applyCommand(
          session,
          {
            type: "translate-selection",
            ids: ["first", "second"],
            delta: { x: index % 2 ? -0.1 : 0.2, y: 0, z: 0 },
          },
          policy,
        ),
      );
    const final = session.present;
    for (let index = 0; index < 40; index++) session = value(undo(session));
    expect(session.present).toEqual(base);
    for (let index = 0; index < 40; index++) session = value(redo(session));
    expect(session.present).toEqual(final);
    expect(new Set(session.present.instances.map((part) => part.id)).size).toBe(2);
  });
});

it("EDT-048: rejects imported exhausted revision counters and never repeats a revision", () => {
  for (const counter of [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, 1e30]) {
    const input = { ...base, revision: `study-local-${counter}` };
    expect(parseProject(serializeProject(input), policy).ok).toBe(false);
    expect(createModel(input, policy).ok).toBe(false);
  }
  const session = { ...createSession(base), nextRevision: Number.MAX_SAFE_INTEGER - 1 };
  const result = applyCommand(
    session,
    { type: "translate", id: "first", delta: { x: 1, y: 0, z: 0 } },
    policy,
  );
  expect(result.ok).toBe(false);
  expect(session.present).toBe(base);
});
