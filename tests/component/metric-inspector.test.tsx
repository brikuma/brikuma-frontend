// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Model } from "../../src/core/model/public";
import { SelectionInspector } from "../../src/features/editor/components/selection-inspector";
import { SelectionTools } from "../../src/features/editor/components/selection-tools";

afterEach(cleanup);
const model: Model = {
  id: "metric",
  title: "Metric study",
  revision: "r1",
  baselineRevision: "r1",
  groups: [{ id: "walls", name: "Walls", protected: false }],
  instances: [
    {
      id: "wall",
      partId: "demo-brick-2x4",
      colorId: "ivory",
      groupId: "walls",
      transform: { x: 2, y: 0.6, z: 0, rotation: 0 },
    },
  ],
};

describe("Centimeter inspection with canonical model commands", () => {
  it("shows metric dimensions by default and converts explicit position edits back to model units", async () => {
    const user = userEvent.setup(),
      command = vi.fn(() => true);
    render(
      <SelectionInspector model={model} selected="wall" onSelect={vi.fn()} command={command} />,
    );
    const dimensions = within(screen.getByLabelText("Selected part dimensions"));
    expect(dimensions.getByText("Width").nextElementSibling).toHaveTextContent("3.2 cm");
    expect(dimensions.getByText("Height").nextElementSibling).toHaveTextContent("0.96 cm");
    expect(screen.getByText("Advanced position").closest("details")).not.toHaveAttribute("open");
    await user.click(screen.getByText("Advanced position"));
    const height = screen.getByRole("spinbutton", { name: "Position Y" });
    expect(height).toHaveValue(0.48);
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(1.6);
    await user.clear(height);
    await user.type(height, "0.5");
    expect(screen.getByRole("button", { name: "Apply position" })).toBeDisabled();
    expect(command).not.toHaveBeenCalled();
    await user.clear(height);
    await user.type(height, "0.56");
    await user.click(screen.getByRole("button", { name: "Apply position" }));
    expect(command).toHaveBeenCalledExactlyOnceWith({
      type: "set-transform",
      id: "wall",
      transform: { x: 2, y: 0.7, z: 0, rotation: 0 },
    });
    expect(model.instances[0].transform.y).toBe(0.6);
  });
  it("converts a metric selection translation once without changing the rotation pivot", async () => {
    const user = userEvent.setup(),
      command = vi.fn(() => true);
    render(
      <SelectionTools
        model={model}
        ids={["wall"]}
        groupId={null}
        onGroup={vi.fn()}
        command={command}
        readOnly={false}
        onFocus={vi.fn()}
        onHide={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Rigid selection transform"));
    const x = screen.getByRole("spinbutton", { name: "Selection delta X" });
    await user.clear(x);
    await user.type(x, "1.6");
    await user.click(screen.getByRole("button", { name: "Apply rigid translation" }));
    expect(command).toHaveBeenCalledExactlyOnceWith({
      type: "translate-selection",
      ids: ["wall"],
      delta: { x: 2, y: 0, z: 0 },
    });
    expect(screen.getByText("Pivot: 1.6, 0.48, 0 cm · height axis")).toBeVisible();
  });
});
