// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Model, PartInstance } from "../../src/core/model/public";
import { Inventory } from "../../src/features/parts/inventory";

let currentModel: Model;
vi.mock("@/features/editor/state/session", () => ({
  useProject: () => ({ id: "blank", model: currentModel, invalid: false, loadError: null }),
}));

function part(id: string, partId: string, x: number, y: number): PartInstance {
  return {
    id,
    partId,
    groupId: "assembly",
    colorId: "ivory",
    transform: { x, y, z: 0, rotation: 0 },
  };
}

beforeEach(() => {
  currentModel = {
    id: "blank",
    title: "Farmhouse study",
    revision: "r2",
    baselineRevision: "r1",
    groups: [{ id: "assembly", name: "Assembly", protected: false }],
    instances: [
      part("base", "demo-brick-1x1", 0, 0.6),
      part("upper", "demo-brick-1x1", 0, 1.8),
      part("floating-wall", "demo-brick-1x1", 5, 3),
      part("decorative-door", "demo-door-leaf", 10, 1),
    ],
  };
});
afterEach(cleanup);

describe("Scene inventory attachment review", () => {
  it("preserves exact quantities while exposing unconnected and unsupported instances per row", async () => {
    const user = userEvent.setup();
    render(<Inventory />);
    expect(screen.getByTestId("inventory-total")).toHaveTextContent("4 pieces");
    expect(screen.getByTestId("inventory-review-total")).toHaveTextContent("2");
    expect(screen.getByRole("columnheader", { name: "In scene" })).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "Required" })).not.toBeInTheDocument();
    expect(screen.getByText(/this is not a purchase list/)).toBeVisible();
    const brickRow = screen.getByRole("row", { name: /Brick 1 × 1/ });
    expect(within(brickRow).getByText("1 connected to ground")).toBeVisible();
    expect(within(brickRow).getByText("1 without a ground connection")).toBeVisible();
    expect(within(brickRow).getByText("1 on ground")).toBeVisible();
    expect(within(brickRow).getAllByRole("cell")[1]).toHaveTextContent("3");
    await user.click(within(brickRow).getByText("Review 1 instance"));
    expect(within(brickRow).getByText("floating-wall")).toBeVisible();
    const doorRow = screen.getByRole("row", { name: /Tower door leaf/ });
    expect(within(doorRow).getByText("1 connection not checked")).toBeVisible();
    await user.click(within(doorRow).getByText("Review 1 instance"));
    expect(within(doorRow).getByText("decorative-door")).toBeVisible();
  });

  it("filters rows needing review without changing scene totals, and refreshes after a repair", async () => {
    const user = userEvent.setup();
    currentModel = {
      ...currentModel,
      instances: [...currentModel.instances, part("base-plate", "demo-plate-1x1", 20, 0.2)],
    };
    const view = render(<Inventory />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Inventory view" }), "review");
    expect(screen.queryByRole("row", { name: /Plate 1 × 1/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("inventory-total")).toHaveTextContent("5 pieces");
    currentModel = {
      ...currentModel,
      revision: "r3",
      instances: currentModel.instances
        .filter((instance) => instance.id !== "decorative-door")
        .map((instance) =>
          instance.id === "floating-wall"
            ? { ...instance, transform: { ...instance.transform, y: 0.6 } }
            : instance,
        ),
    };
    view.rerender(<Inventory />);
    expect(screen.getByTestId("inventory-review-total")).toHaveTextContent("0");
    expect(screen.getByText("No parts match these filters.")).toBeVisible();
    expect(screen.getByTestId("inventory-total")).toHaveTextContent("4 pieces");
  });

  it("counts overlapping instances once each in the review total even when they touch the ground", () => {
    currentModel = {
      ...currentModel,
      instances: [part("one", "demo-brick-1x1", 0, 0.6), part("two", "demo-brick-1x1", 0, 0.6)],
    };
    render(<Inventory />);
    expect(screen.getByTestId("inventory-review-total")).toHaveTextContent("2");
    expect(
      within(screen.getByRole("region", { name: "Placement review" })).getByText(
        "2 with an overlap conflict",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("inventory-total")).toHaveTextContent("2 pieces");
  });
});
