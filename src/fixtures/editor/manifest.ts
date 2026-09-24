/** Original project-authored geometry. These are demonstration IDs, not manufactured part IDs. */
export const editorPartManifest = {
  version: "original-demo-2026-09-24-v1",
  provenance: "Original BRIKUMA demonstration geometry authored in this repository.",
  distribution:
    "No imported manufacturer geometry, competitor model, or external geometry dependency.",
  nominalUnit:
    "One stud pitch; 20 nominal LDraw units. Dimensions are not manufacturing tolerances.",
  sourceFiles: [
    "src/fixtures/catalog.ts",
    "src/features/editor/scene/brick-geometry.ts",
    "src/features/editor/scene/part-geometry.ts",
  ],
  basicPartIds: [
    "demo-brick-1x1",
    "demo-brick-1x2",
    "demo-brick-1x4",
    "demo-brick-2x2",
    "demo-brick-2x4",
    "demo-plate-1x1",
    "demo-plate-1x2",
    "demo-plate-1x3",
    "demo-plate-2x2",
    "demo-plate-2x4",
    "demo-plate-4x4",
    "demo-tile-1x1",
    "demo-tile-1x2",
    "demo-tile-1x4",
    "demo-tile-2x2",
    "demo-tile-2x4",
  ],
  externalDependencies: [],
} as const;
