// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "../../src/features/editor/workbench";
import { SessionProvider } from "../../src/features/editor/state/session";
import { partDefinitions } from "../../src/fixtures/catalog";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("project=blank") }));
vi.mock("../../src/features/editor/components/model-viewport", () => ({
  ModelViewport: ({
    placement,
    hidden,
    model,
  }: {
    placement: { partId: string } | null;
    hidden: readonly string[];
    model: { instances: readonly unknown[] };
  }) => (
    <div>
      <div data-testid="pending-model-part">{placement?.partId ?? "No pending part"}</div>
      <div data-testid="hidden-model-groups">{hidden.join(",") || "No hidden groups"}</div>
      <div data-testid="canvas-model-count">{model.instances.length}</div>
    </div>
  ),
}));
beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes("1024") || query.includes("1280"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
afterEach(cleanup);

describe("Manual building through accessible controls", () => {
  it("places and duplicates every supported catalog part, including narrow details and thin slopes", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    for (const [index, definition] of partDefinitions.entries()) {
      await user.click(screen.getByRole("button", { name: `Add ${definition.name}` }));
      await user.click(screen.getByRole("button", { name: "Free position" }));
      await user.click(screen.getByRole("button", { name: "Place brick" }));
      expect(screen.getByTestId("piece-count")).toHaveTextContent(new RegExp(`^${index * 2 + 1}$`));
      await user.click(screen.getByRole("button", { name: "Rotate 90°" }));
      await user.click(screen.getByRole("button", { name: "Duplicate" }));
      expect(screen.getByTestId("piece-count")).toHaveTextContent(new RegExp(`^${index * 2 + 2}$`));
    }
  }, 45000);

  it("previews without changing the model, places at chosen coordinates, rotates, duplicates and undoes", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    expect(await screen.findByTestId("piece-count")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("0");
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("demo-brick-2x4");
    const x = screen.getByRole("spinbutton", { name: "Placement X" });
    await user.clear(x);
    await user.type(x, "2.5");
    await user.click(screen.getByRole("button", { name: "Free position" }));
    await user.click(screen.getByRole("button", { name: "Update preview" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("1");
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(2.5);
    await user.click(screen.getByRole("button", { name: "Rotate 90°" }));
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("2");
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(4.5);
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Redo local edit" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("2");
  });

  it("rejects an occupied snap placement without changing history, then permits Free placement", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    expect(await screen.findByTestId("piece-count")).toHaveTextContent(/^0$/);
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    await user.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByText("1 undoable changes")).toBeVisible();
    expect(screen.getAllByText("blank-local-1", { exact: true })[0]).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    expect(screen.getByRole("spinbutton", { name: "Placement X" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "Placement Y" })).toHaveValue(0.6);
    expect(screen.getByRole("spinbutton", { name: "Placement Z" })).toHaveValue(0);
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByRole("status")).toHaveTextContent("Occupied-volume conflict");
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^1$/);
    expect(screen.getByText("1 undoable changes")).toBeVisible();
    expect(screen.getAllByText("blank-local-1", { exact: true })[0]).toBeVisible();
    expect(screen.getByRole("button", { name: "Redo local edit" })).toBeDisabled();
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("demo-brick-2x4");

    await user.click(screen.getByRole("button", { name: "Free position" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByRole("status")).not.toHaveTextContent("Occupied-volume conflict");
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).toHaveValue(0.6);
    expect(screen.getByRole("spinbutton", { name: "Position Z" })).toHaveValue(0);
    await user.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByText("2 undoable changes")).toBeVisible();
    expect(screen.getAllByText("blank-local-2", { exact: true })[0]).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^1$/);
    expect(screen.getByText("1 undoable changes")).toBeVisible();
  });

  it("cancels a pending part without model or history changes", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await user.click(screen.getByRole("button", { name: "Cancel placement" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Undo local edit" })).toBeDisabled();
    expect(screen.queryByRole("spinbutton", { name: "Placement X" })).not.toBeInTheDocument();
  });

  it("places a thin roof detail exactly on the ground with a half-tenth height", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    expect(await screen.findByTestId("piece-count")).toHaveTextContent(/^0$/);
    await user.click(screen.getByRole("button", { name: "Add Roof tile slope 1 × 1" }));
    await user.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("spinbutton", { name: "Placement Y" })).toHaveValue(0.15);
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).toHaveValue(0.15);
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^0$/);
  });

  it("chooses color before placement, previews rotated dimensions and commits the chosen finish", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "New brick color: Deep teal" }));
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    expect(screen.getByRole("combobox", { name: "Pending brick color" })).toHaveValue("teal");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Pending brick color" }),
      "terracotta",
    );
    expect(screen.getByRole("button", { name: "New brick color: Terracotta" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Rotate pending brick" }));
    const dimensions = screen.getByLabelText("Placement dimensions");
    expect(within(dimensions).getByText("Width").nextElementSibling).toHaveTextContent("2");
    expect(within(dimensions).getByText("Depth").nextElementSibling).toHaveTextContent("4");
    await user.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Connect" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("piece-count")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByRole("combobox", { name: "Part color" })).toHaveValue("terracotta");
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    const selected = screen.getByLabelText("Selected part dimensions");
    expect(within(selected).getByText("Width").nextElementSibling).toHaveTextContent("2");
  });

  it("reveals added copies while preserving previously hidden physical members", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Structure" }));
    await user.click(screen.getByRole("button", { name: "Hide Free-form workspace" }));
    await user.click(screen.getByRole("button", { name: /^Parts$/ }));
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("hidden-model-groups")).toHaveTextContent("No hidden groups");
    await user.click(screen.getByRole("button", { name: "Structure" }));
    await user.click(screen.getByRole("button", { name: "Hide Free-form workspace" }));
    const originalId = (
      screen.getByRole("combobox", {
        name: "Choose a logical part",
      }) as HTMLSelectElement
    ).value;
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getByTestId("hidden-model-groups").textContent).toBe(originalId);
    expect(screen.getByRole("combobox", { name: "Choose a logical part" })).not.toHaveValue(
      originalId,
    );
    expect(screen.getByTestId("piece-count")).toHaveTextContent("2");
  });

  it("does not send modal keyboard events to the model behind the dialog", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await user.keyboard("r{Delete}{Control>}z{/Control}");
    expect(screen.getByTestId("piece-count")).toHaveTextContent("1");
    expect(screen.getByText("Rotation 0°")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Redo local edit" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0);
  });

  it("scopes movement shortcuts, preserves typing and applies tenth-stud coordinates on every axis", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    screen.getByRole("region", { name: /^Modeling workspace/ }).focus();
    await user.keyboard("{ArrowRight}r");
    expect(screen.getByText("Rotation 0°")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Rotate 90°" }));
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0.5);
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    const x = screen.getByRole("spinbutton", { name: "Position X" });
    await user.click(x);
    await user.keyboard("r");
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    await user.clear(x);
    await user.type(x, "3.7");
    const y = screen.getByRole("spinbutton", { name: "Position Y" });
    const z = screen.getByRole("spinbutton", { name: "Position Z" });
    await user.clear(y);
    await user.type(y, "0.7");
    await user.clear(z);
    await user.type(z, "-0.3");
    await user.click(screen.getByRole("button", { name: "Apply position" }));
    expect(screen.getByText("X 3.7 · Y 0.7 · Z -0.3")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0.5);
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).toHaveValue(0.6);
    expect(screen.getByRole("spinbutton", { name: "Position Z" })).toHaveValue(0);
  });
});
