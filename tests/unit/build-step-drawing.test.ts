import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createModel, generateBuildPlan, getBuildLayers } from "../../src/core/model/public";
import { BuildStepDrawing } from "../../src/features/instructions/build-step-drawing";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";
import { model as blank } from "../../src/fixtures/scenes/blank";

const brick = (
  id: string,
  x: number,
  y: number,
  z: number,
  rotation = 0 as 0 | 90 | 180 | 270,
) => ({
  id,
  partId: "demo-brick-2x4",
  colorId: "ivory",
  groupId: "workspace",
  transform: { x, y, z, rotation },
});

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

  it("frames only the current step, independent of future pieces or distance from the origin", () => {
    const centered = { ...blank, instances: [brick("first", 0, 0.6, 0)] };
    const translated = {
      ...blank,
      instances: [brick("first", 70, 0.6, 70), brick("later", -70, 10.6, -70)],
    };
    const centeredPlan = generateBuildPlan(centered, partDefinitions);
    const translatedPlan = generateBuildPlan(translated, partDefinitions);
    if (!centeredPlan.ok || !translatedPlan.ok) throw new Error("Expected valid plans");
    const original = BuildStepDrawing({ model: centered, step: centeredPlan.value.steps[0] });
    const moved = BuildStepDrawing({ model: translated, step: translatedPlan.value.steps[0] });
    const originalBounds = original.props.viewBox.split(" ").map(Number);
    const movedBounds = moved.props.viewBox.split(" ").map(Number);
    expect(movedBounds[2]).toBeCloseTo(originalBounds[2]);
    expect(movedBounds[3]).toBeCloseTo(originalBounds[3]);
    const markup = renderToStaticMarkup(moved);
    expect(markup).toContain("first");
    expect(markup).not.toContain("later");
  });

  it("keeps higher additions visible over a wide earlier part, including at its far corner", () => {
    const source = {
      ...blank,
      instances: [brick("base", 0, 0.6, 0), brick("upper", -1, 1.8, -1)],
    };
    const plan = generateBuildPlan(source, partDefinitions);
    if (!plan.ok) throw new Error(plan.error.message);
    const step = plan.value.steps[1];
    const markup = renderToStaticMarkup(BuildStepDrawing({ model: source, step }));
    expect(markup.indexOf("· base")).toBeLessThan(markup.indexOf("· upper"));
    const overhead = BuildStepDrawing({ model: source, step, view: "top" });
    const overheadMarkup = renderToStaticMarkup(overhead);
    expect(overheadMarkup.match(/<polygon /g)).toHaveLength(2);
    expect(overheadMarkup).toContain('rx="5" ry="5"');
    expect(overheadMarkup).toContain("Top view");
  });

  it.each(["isometric", "top"] as const)(
    "focuses the current additions in %s view without losing the full-build context",
    (view) => {
      const current = brick("add-now", 30, 1.8, 30);
      const source = {
        ...blank,
        instances: [brick("earlier", -70, 0.6, 70), current],
      };
      const isolated = { ...blank, instances: [current] };
      const plan = generateBuildPlan(source, partDefinitions);
      const isolatedPlan = generateBuildPlan(isolated, partDefinitions);
      if (!plan.ok || !isolatedPlan.ok) throw new Error("Expected valid plans");
      const step = plan.value.steps[1];
      const focused = BuildStepDrawing({ model: source, step, view, focusAdditions: true });
      const whole = BuildStepDrawing({ model: source, step, view, focusAdditions: false });
      const additionOnly = BuildStepDrawing({
        model: isolated,
        step: isolatedPlan.value.steps[0],
        view,
      });
      const focusedBounds = focused.props.viewBox.split(" ").map(Number);
      const wholeBounds = whole.props.viewBox.split(" ").map(Number);
      const additionBounds = additionOnly.props.viewBox.split(" ").map(Number);
      focusedBounds.forEach((value: number, index: number) =>
        expect(value).toBeCloseTo(additionBounds[index]),
      );
      expect(wholeBounds[2]).toBeGreaterThan(focusedBounds[2] * 10);
      const focusedMarkup = renderToStaticMarkup(focused);
      expect(focusedMarkup).toContain("1 highlighted piece, 2 pieces shown");
      expect(focusedMarkup.match(/<g /g)).toHaveLength(2);
      expect(focusedMarkup).toContain("· earlier");
      expect(focusedMarkup).toContain("· add-now");
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "shows the two facing sides and top after a %s-degree rotation",
    (rotation) => {
      const source = { ...blank, instances: [brick("turned", 0, 0.6, 0, rotation)] };
      const plan = generateBuildPlan(source, partDefinitions);
      if (!plan.ok) throw new Error(plan.error.message);
      const markup = renderToStaticMarkup(
        BuildStepDrawing({ model: source, step: plan.value.steps[0] }),
      );
      expect(markup.match(/<polygon /g)).toHaveLength(3);
      expect(markup.match(/<ellipse /g)).toHaveLength(8);
    },
  );
});
