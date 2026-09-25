import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseProjectPackage,
  parseWorkspaceProject,
  PROJECT_PACKAGE_BYTES,
  serializeProjectPackage,
  snapshotWorkspaceProject,
  type ProjectPackage,
} from "../../src/adapters/project-package";
import { emptyProjectContext } from "../../src/adapters/project-context-file";
import {
  createBuildPlanSession,
  editBuildPlan,
  generateBuildPlan,
  isBuildPlanCurrent,
  serializeProject,
  type Model,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import { model as blank } from "../../src/fixtures/scenes/blank";

const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const closeBitmap = vi.fn();

beforeEach(() => {
  closeBitmap.mockClear();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 100, height: 80, close: closeBitmap })),
  );
});
afterEach(() => vi.unstubAllGlobals());

function project(): ProjectPackage {
  const source: Model = {
    ...blank,
    title: "Pocket sculpture",
    revision: "blank-local-2",
    instances: [
      {
        id: "base",
        groupId: "workspace",
        partId: "demo-plate-2x2",
        colorId: "ivory",
        transform: { x: 0, y: 0.2, z: 0, rotation: 0 },
      },
      {
        id: "top",
        groupId: "workspace",
        partId: "demo-brick-1x1",
        colorId: "teal",
        transform: { x: 0.5, y: 1, z: 0.5, rotation: 0 },
      },
    ],
  };
  const generated = generateBuildPlan(source, partDefinitions);
  if (!generated.ok) throw new Error(generated.error.message);
  const edited = editBuildPlan(createBuildPlanSession(generated.value), {
    type: "update-step",
    stepId: generated.value.steps[0].id,
    title: "Build the base",
    description: "Keep the plate flat.\nThe next piece sits on its corner.",
    view: "top",
  });
  if (!edited.ok) throw new Error(edited.error.message);
  const context = emptyProjectContext();
  context.brief.subject = "A small imaginary creature";
  context.brief.colors = "Cream and teal";
  context.references = [
    {
      id: 7,
      filename: "reference.png",
      type: "image/png",
      size: imageBytes.length,
      width: 100,
      height: 80,
      validated: true,
      blob: new Blob([imageBytes], { type: "image/png" }),
      url: "blob:previous-session",
    },
    { id: 8, filename: "notes.pdf", type: "application/pdf", size: 512 },
  ];
  context.calibrations[7] = {
    first: { x: 0, y: 0 },
    second: { x: 20, y: 0 },
    length: 5,
    plane: "XY",
  };
  return {
    snapshot: {
      model: {
        ...source,
        revision: "blank-local-3",
        instances: source.instances.map((part) =>
          part.id === "top" ? { ...part, colorId: "terracotta" } : part,
        ),
      },
      instructions: { sourceModel: source, plan: edited.value.present, edited: true },
    },
    context,
  };
}

describe("Complete local project packages", () => {
  it("round-trips model, stale authored guide, brief, image bytes and scale without browser URLs or history", async () => {
    const original = project();
    const text = await serializeProjectPackage(original);
    expect(text).not.toContain("blob:previous-session");
    expect(text).not.toContain('"visiblePartIds"');
    expect(text).not.toContain('"sourceSignature"');
    expect(text).not.toContain('"past"');
    expect(text).not.toContain('"validated"');
    const result = await parseProjectPackage(text, editPolicy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.snapshot.model).toEqual(original.snapshot.model);
    expect(result.value.snapshot.instructions).toEqual(original.snapshot.instructions);
    expect(
      isBuildPlanCurrent(result.value.snapshot.model, result.value.snapshot.instructions!.plan),
    ).toBe(false);
    expect(result.value.context.brief).toEqual(original.context.brief);
    expect(result.value.context.calibrations).toEqual(original.context.calibrations);
    expect(result.value.context.references[0]).toMatchObject({
      id: 7,
      filename: "reference.png",
      type: "image/png",
      width: 100,
      height: 80,
    });
    expect(result.value.context.references[0].url).toBeUndefined();
    expect(new Uint8Array(await result.value.context.references[0].blob!.arrayBuffer())).toEqual(
      imageBytes,
    );
    expect(result.value.context.references[1]).toEqual(original.context.references[1]);
    expect(closeBitmap).toHaveBeenCalledTimes(2);
    expect(original.context.references[0].url).toBe("blob:previous-session");
  });

  it("continues to accept geometry-only legacy files with an empty context and no invented guide", async () => {
    const original = project();
    const result = await parseProjectPackage(serializeProject(original.snapshot.model), editPolicy);
    expect(result).toEqual({
      ok: true,
      value: { snapshot: { model: original.snapshot.model }, context: emptyProjectContext() },
    });
  });

  it("retains Blob references and the separate baseline in an IndexedDB snapshot", async () => {
    const original = project();
    const saved = snapshotWorkspaceProject({ ...original, baseline: blank });
    expect(saved.context.references[0]).toHaveProperty("blob", original.context.references[0].blob);
    expect(saved.context.references[0]).not.toHaveProperty("url");
    expect(saved.context.references[0]).not.toHaveProperty("imageData");
    const result = await parseWorkspaceProject(structuredClone(saved), editPolicy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.baseline).toEqual(blank);
    expect(result.value.snapshot).toEqual(original.snapshot);
    expect(result.value.context.calibrations).toEqual(original.context.calibrations);
    expect(new Uint8Array(await result.value.context.references[0].blob!.arrayBuffer())).toEqual(
      imageBytes,
    );
  });

  it("retains a brief-only workspace without loading or inventing model geometry", async () => {
    const context = emptyProjectContext();
    context.brief.subject = "A free-form kinetic-looking sculpture";
    const result = await parseWorkspaceProject(snapshotWorkspaceProject({ context }), editPolicy);
    expect(result).toEqual({
      ok: true,
      value: { snapshot: undefined, baseline: undefined, context },
    });
  });

  it.each([
    ["empty", ""],
    ["malformed JSON", "{broken"],
    ["different format", '{"format":"other"}'],
    ["future schema", '{"format":"brikuma-project","schemaVersion":2}'],
  ])("rejects %s before replacement", async (_label, text) => {
    expect((await parseProjectPackage(text, editPolicy)).ok).toBe(false);
  });

  it("rejects extra package fields and incomplete or invalid contexts atomically", async () => {
    const raw = JSON.parse(await serializeProjectPackage(project()));
    for (const changed of [
      { ...raw, futureFlag: true },
      { ...raw, context: undefined },
      { ...raw, context: { ...raw.context, brief: {} } },
      {
        ...raw,
        context: {
          ...raw.context,
          references: [
            { ...raw.context.references[0], url: "https://invalid.example/reference.png" },
          ],
        },
      },
      {
        ...raw,
        context: {
          ...raw.context,
          references: [{ ...raw.context.references[0], imageData: "YmFk" }],
        },
      },
      {
        ...raw,
        snapshot: { ...raw.snapshot, instructions: { ...raw.snapshot.instructions, steps: [] } },
      },
    ]) {
      const result = await parseProjectPackage(JSON.stringify(changed), editPolicy);
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("value");
    }
  });

  it("rejects missing, unrelated, or instruction-bearing stored baselines", async () => {
    const original = project();
    const saved = snapshotWorkspaceProject({ ...original, baseline: blank });
    for (const changed of [
      { ...saved, baseline: undefined },
      { ...saved, snapshot: undefined },
      { ...saved, baseline: { model: { ...blank, id: "unrelated" } } },
      { ...saved, baseline: saved.snapshot },
      { ...saved, schemaVersion: 2 },
    ]) {
      expect((await parseWorkspaceProject(changed, editPolicy)).ok).toBe(false);
    }
  });

  it("rejects oversized input before parsing or decoding references", async () => {
    const result = await parseProjectPackage(" ".repeat(PROJECT_PACKAGE_BYTES + 1), editPolicy);
    expect(result).toEqual({
      ok: false,
      error: "Choose a nonempty project file no larger than 96 MiB.",
    });
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("reports missing local image bytes instead of exporting a broken backup", async () => {
    const value = project();
    value.context.references[0] = { ...value.context.references[0], blob: undefined };
    await expect(serializeProjectPackage(value)).rejects.toThrow(/missing.*local bytes/);
  });

  it.each([
    { subject: "x".repeat(10_001) },
    { subject: "Text with a control character\u0007" },
    { maxPieces: "1".repeat(101) },
  ])("rejects un-restorable brief data before both storage and portable backup", async (brief) => {
    const value = project();
    Object.assign(value.context.brief, brief);
    expect(() => snapshotWorkspaceProject({ ...value, baseline: blank })).toThrow("bounded text");
    await expect(serializeProjectPackage(value)).rejects.toThrow("bounded text");
  });
});
