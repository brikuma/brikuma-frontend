import { describe, expect, it } from "vitest";
import {
  acceptExperiment,
  assessAttachments,
  createArchitecturePreview,
  createSession,
  diagnoseModel,
  undo,
  type ArchitectureRequest,
  type Model,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

const empty: Model = {
  id: "building",
  title: "Building study",
  revision: "base",
  baselineRevision: "base",
  groups: [{ id: "assembly", name: "Building", protected: false }],
  instances: [],
};
const request: ArchitectureRequest = {
  layout: "house",
  section: "complete",
  width: 12,
  depth: 8,
  origin: { x: 0, z: 0 },
  wallColorId: "ivory",
  roofColorId: "terracotta",
  baseColorId: "sand",
  doorColorId: "sage",
  groupId: "assembly",
  idPrefix: "house",
};

describe("Local architectural construction", () => {
  it.each([
    { layout: "house" as const, width: 8, depth: 8 },
    { layout: "house" as const, width: 12, depth: 8 },
    { layout: "house" as const, width: 24, depth: 20 },
    { layout: "house" as const, width: 32, depth: 32 },
    { layout: "courtyard" as const, width: 24, depth: 20 },
    { layout: "courtyard" as const, width: 32, depth: 24 },
  ])("previews a connected, nonoverlapping $layout at $width × $depth without mutation", (size) => {
    const before = structuredClone(empty);
    const result = createArchitecturePreview(empty, editPolicy, { ...request, ...size });
    expect(result.ok, result.ok ? "" : result.error.message).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const proposed = result.value.experiment.proposed;
    expect(proposed.instances.length).toBeGreaterThan(60);
    expect(result.value.summary.addedCount).toBe(proposed.instances.length);
    expect(result.value.summary.connectedCount + result.value.summary.groundedCount).toBe(
      proposed.instances.length,
    );
    expect(empty).toEqual(before);
    const session = createSession(empty);
    const accepted = acceptExperiment(session, result.value.experiment, editPolicy);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error(accepted.error.message);
    expect(accepted.value.past).toHaveLength(1);
    expect(undo(accepted.value)).toMatchObject({ ok: true, value: { present: empty } });
  });

  it("builds foundation, walls and roof in separate assemblies as independently reversible stages", () => {
    const grouped = {
      ...empty,
      groups: ["foundation", "walls", "roof"].map((id) => ({ id, name: id, protected: false })),
    };
    let session = createSession(grouped);
    for (const section of ["foundation", "walls", "roof"] as const) {
      const preview = createArchitecturePreview(session.present, editPolicy, {
        ...request,
        layout: "courtyard",
        width: 32,
        depth: 24,
        section,
        groupId: section,
      });
      expect(preview.ok, preview.ok ? "" : preview.error.message).toBe(true);
      if (!preview.ok) throw new Error(preview.error.message);
      expect(
        Object.values(preview.value.summary.sections).filter((count) => count > 0),
      ).toHaveLength(1);
      expect(
        preview.value.experiment.proposed.instances
          .filter((instance) => preview.value.experiment.impact.addedIds.includes(instance.id))
          .every((instance) => instance.groupId === section),
      ).toBe(true);
      const result = acceptExperiment(session, preview.value.experiment, editPolicy);
      if (!result.ok) throw new Error(result.error.message);
      session = result.value;
    }
    expect(session.past).toHaveLength(3);
    expect(diagnoseModel(session.present, partDefinitions).conflicts).toEqual([]);
    expect(assessAttachments(session.present, partDefinitions).counts.unattached).toBe(0);
    expect(new Set(session.present.instances.map((part) => part.id)).size).toBe(
      session.present.instances.length,
    );
    const beforeRoof = undo(session);
    if (!beforeRoof.ok) throw new Error(beforeRoof.error.message);
    expect(beforeRoof.value.present.instances.some((instance) => instance.groupId === "roof")).toBe(
      false,
    );
    expect(
      beforeRoof.value.present.instances.some((instance) => instance.groupId === "walls"),
    ).toBe(true);
    expect(beforeRoof.value.present.groups).toEqual(grouped.groups);
  });

  it("rejects missing supports, overlaps, stale proposals and protected destinations", () => {
    expect(
      createArchitecturePreview(empty, editPolicy, { ...request, section: "roof" }),
    ).toMatchObject({ ok: false, error: { code: "missing-connection" } });
    const first = createArchitecturePreview(empty, editPolicy, request);
    if (!first.ok) throw new Error(first.error.message);
    expect(
      createArchitecturePreview(first.value.experiment.proposed, editPolicy, request),
    ).toMatchObject({ ok: false, error: { code: "occupied-volume" } });
    expect(
      acceptExperiment(
        createSession(first.value.experiment.proposed),
        first.value.experiment,
        editPolicy,
      ),
    ).toMatchObject({ ok: false, error: { code: "revision-conflict" } });
    const protectedModel = { ...empty, groups: [{ ...empty.groups[0], protected: true }] };
    expect(createArchitecturePreview(protectedModel, editPolicy, request)).toMatchObject({
      ok: false,
      error: { code: "protected-group" },
    });
    expect(protectedModel.instances).toEqual([]);
  });

  it("preserves an existing scene when adding another building at a separate origin", () => {
    const first = createArchitecturePreview(empty, editPolicy, request);
    if (!first.ok) throw new Error(first.error.message);
    const second = createArchitecturePreview(first.value.experiment.proposed, editPolicy, {
      ...request,
      width: 8,
      origin: { x: 16, z: 0 },
    });
    expect(second.ok, second.ok ? "" : second.error.message).toBe(true);
    if (!second.ok) throw new Error(second.error.message);
    expect(second.value.experiment.impact.removedIds).toEqual([]);
    for (const instance of first.value.experiment.proposed.instances)
      expect(second.value.experiment.proposed.instances).toContainEqual(instance);
  });

  it("rejects invalid dimensions, missing capabilities and overflowing model bounds", () => {
    expect(createArchitecturePreview(empty, editPolicy, { ...request, width: 11 })).toMatchObject({
      ok: false,
      error: { code: "invalid-transform" },
    });
    expect(
      createArchitecturePreview(empty, editPolicy, { ...request, layout: "courtyard" }),
    ).toMatchObject({ ok: false, error: { code: "invalid-transform" } });
    expect(
      createArchitecturePreview(
        empty,
        { ...editPolicy, parts: partDefinitions.filter((part) => part.shape !== "door-assembly") },
        request,
      ),
    ).toMatchObject({ ok: false, error: { code: "unknown-part" } });
    expect(
      createArchitecturePreview(empty, editPolicy, { ...request, origin: { x: 40, z: 0 } }),
    ).toMatchObject({ ok: false, error: { code: "invalid-transform" } });
  });
});
