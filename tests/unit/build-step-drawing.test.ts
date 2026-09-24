import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createModel, generateBuildPlan, getBuildLayers } from "../../src/core/model/public";
import { BuildStepDrawing } from "../../src/features/instructions/build-step-drawing";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import { model as blank } from "../../src/fixtures/scenes/blank";

describe("Large-model instruction schematics", () => {
  it("bounds a valid 5,000-piece draft without spreading all vertices into function arguments", () => {
    const source = {
      ...blank,
      instances: Array.from({ length: 5000 }, (_, index) => ({
        id: `plate-${index}`,
        partId: "demo-plate-4x4",
        colorId: "ivory",
        groupId: "workspace",
        transform: { x: 0, y: 0.2, z: 0, rotation: 0 as const },
      })),
    };
    expect(createModel(source, editPolicy).ok).toBe(true);
    const layers = getBuildLayers(source, partDefinitions);
    if (!layers.ok) throw new Error(layers.error.message);
    expect(layers.value).toHaveLength(1);
    expect(layers.value[0].partIds).toHaveLength(5000);
    const result = generateBuildPlan(source, partDefinitions);
    if (!result.ok) throw new Error(result.error.message);
    const drawing = BuildStepDrawing({ model: source, step: result.value.steps[0] });
    expect(drawing.props.viewBox.split(" ").map(Number).every(Number.isFinite)).toBe(true);
    const svg = renderToStaticMarkup(drawing);
    expect(svg.match(/<g /g)).toHaveLength(8);
    expect(svg).toContain("8 highlighted pieces, 8 pieces shown");
  });
});
