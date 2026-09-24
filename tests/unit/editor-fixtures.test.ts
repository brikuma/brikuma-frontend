import { describe, expect, it } from "vitest";
import {
  createModel,
  diagnosePlacement,
  serializeProject,
  parseProject,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import { model as courtyard } from "../../src/fixtures/editor/courtyard-study";
import { model as lab } from "../../src/fixtures/editor/placement-lab";
import { createStressFixture } from "../../src/fixtures/editor/stress";
import { editorPartManifest } from "../../src/fixtures/editor/manifest";
import { loadEditorFixture } from "../../src/fixtures/editor";
import { referenceScale, validateEditorReference } from "../../src/adapters/local-reference";

describe("Editor original fixtures and local workflows", () => {
  it("EDT-002: declares a bounded original part subset with existing catalog references", () => {
    expect(editorPartManifest.basicPartIds.length).toBeGreaterThanOrEqual(12);
    expect(editorPartManifest.externalDependencies).toEqual([]);
    for (const id of editorPartManifest.basicPartIds)
      expect(
        partDefinitions.find((part) => part.id === id),
        id,
      ).toBeDefined();
  });
  it("EDT-001/049: loads a genuinely empty scene and deterministic counted stress fixtures", async () => {
    expect((await loadEditorFixture("empty")).model.instances).toHaveLength(0);
    for (const count of [1000, 5000] as const) {
      const first = createStressFixture(count).model;
      expect(first).toEqual(createStressFixture(count).model);
      expect(first.instances).toHaveLength(count);
      expect(new Set(first.instances.map((part) => part.id)).size).toBe(count);
      expect(createModel(first, editPolicy).ok).toBe(true);
    }
  });
  it("EDT-005/009: the lab distinguishes legal stacked contacts and a real overlap", () => {
    const legal = lab.instances.find((part) => part.id === "lab-legal-stack")!;
    const definition = partDefinitions.find((part) => part.id === legal.partId)!;
    expect(
      diagnosePlacement(lab, partDefinitions, definition, legal.transform, [legal.id]).status,
    ).toBe("no-conflict");
    const conflict = lab.instances.find((part) => part.id === "lab-conflict")!;
    expect(
      diagnosePlacement(lab, partDefinitions, definition, conflict.transform, [conflict.id])
        .conflictingIds,
    ).toContain("lab-obstacle");
  });
  it("EDT-048: original studies are valid and file round-trip preserves their canonical data", () => {
    for (const model of [courtyard, lab]) {
      expect(createModel(model, editPolicy).ok).toBe(true);
      const imported = parseProject(serializeProject(model), editPolicy);
      expect(imported.ok && imported.value).toEqual(model);
    }
    expect(courtyard.instances.length).toBeGreaterThanOrEqual(180);
    expect(courtyard.instances.length).toBeLessThanOrEqual(450);
    expect(courtyard.groups.find((group) => group.id === "facade")?.protected).toBe(true);
  });
  it("EDT-010: courtyard occupied geometry contains no unintended supported conflict", () => {
    for (const instance of courtyard.instances) {
      const definition = partDefinitions.find((part) => part.id === instance.partId)!;
      const result = diagnosePlacement(courtyard, partDefinitions, definition, instance.transform, [
        instance.id,
      ]);
      expect(result.conflictingIds, instance.id).toEqual([]);
    }
  });
  it("EDT-044: local image limits and declared manual scale reject invalid input", () => {
    expect(validateEditorReference({ type: "image/svg+xml", size: 4 }, 0)).toContain("PNG");
    expect(validateEditorReference({ type: "image/png", size: 0 }, 0)).toContain("empty");
    expect(validateEditorReference({ type: "image/png", size: 4 }, 6)).toContain("six");
    expect(
      referenceScale({
        first: { x: 10, y: 20 },
        second: { x: 110, y: 20 },
        length: 5,
        plane: "XZ",
      }),
    ).toBe(0.05);
    expect(
      referenceScale({ first: { x: 0, y: 0 }, second: { x: 0, y: 0 }, length: 5, plane: "XZ" }),
    ).toBeNull();
    expect(
      referenceScale({
        first: { x: 0, y: 0 },
        second: { x: 100, y: 0 },
        length: Infinity,
        plane: "XZ",
      }),
    ).toBeNull();
  });
});
