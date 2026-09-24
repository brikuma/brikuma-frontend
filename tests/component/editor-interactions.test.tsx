// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "../../src/features/editor/workbench";
import { SessionProvider } from "../../src/features/editor/state/session";
import type { ModelViewportProps } from "../../src/features/editor/viewport-types";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("project=blank") }));
vi.mock("../../src/features/editor/components/model-viewport", () => ({
  ModelViewport: (props: ModelViewportProps) => (
    <div>
      <output data-testid="viewport-selection">{props.selectedIds?.join(",")}</output>
      <output data-testid="viewport-focus">{props.focusRequest}</output>
      <output data-testid="viewport-tool">{props.toolRequest?.tool}</output>
      <output data-testid="viewport-rotation">{props.placement?.transform.rotation}</output>
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
function open() {
  render(
    <SessionProvider>
      <Workbench />
    </SessionProvider>,
  );
  return screen.findByTestId("piece-count");
}

describe("Editor command and inspector integration", () => {
  it("duplicates the full selection once, shows aggregate properties, and leaves field shortcuts alone", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    const workspace = screen.getByRole("region", { name: "Modeling workspace" });
    fireEvent.keyDown(workspace, { key: "a", ctrlKey: true });
    expect(screen.getByLabelText("Selection summary")).toHaveTextContent(
      "2 pieces · 1 part type · 1 color",
    );
    expect(screen.queryByText("Project overview")).not.toBeInTheDocument();
    expect(screen.getByTestId("viewport-selection")).toHaveTextContent("added-1,added-2");
    const color = screen.getByRole("combobox", { name: "Selection color" });
    fireEvent.keyDown(color, { key: "d", ctrlKey: true });
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    fireEvent.keyDown(workspace, { key: "d", ctrlKey: true });
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^4$/);
    expect(screen.getByTestId("viewport-selection")).toHaveTextContent("added-3,added-4");
    expect(screen.getByTestId("viewport-tool")).toHaveTextContent("move");
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    await user.click(screen.getByRole("button", { name: "Redo local edit" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^4$/);
  });

  it("rotates a pending preview without committing, preserves typed-field Escape, and records only committed recents", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    const workspace = screen.getByRole("region", { name: "Modeling workspace" });
    fireEvent.keyDown(workspace, { key: "r" });
    expect(screen.getByTestId("viewport-rotation")).toHaveTextContent("90");
    const input = screen.getByRole("spinbutton", { name: "Placement X" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByRole("region", { name: "Pending brick placement" })).toBeVisible();
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^0$/);
    fireEvent.keyDown(workspace, { key: "Escape" });
    await user.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.queryByRole("button", { name: "Add Brick 2 × 4" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All parts" }));
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await user.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.getByRole("button", { name: "Add Brick 2 × 4" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Structure" }));
    await user.click(screen.getByRole("button", { name: "Parts" }));
    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-pressed", "true");
  });

  it("selects and frames diagnostic IDs, preserves reports across panels, and blocks stale drill-in", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("button", { name: "Local project files" }));
    const dialog = screen.getByRole("dialog", { name: "Local project files" });
    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Study" }),
      "placement-lab",
    );
    await user.click(within(dialog).getByRole("button", { name: "Open study" }));
    await screen.findByRole("button", { name: "Show hidden parts (1)" });
    await user.click(screen.getByRole("button", { name: "Checks" }));
    await user.click(screen.getByRole("button", { name: "Run supported checks" }));
    await user.click(screen.getByRole("button", { name: /Reveal lab-obstacle \/ lab-conflict/ }));
    expect(screen.getByTestId("viewport-selection")).toHaveTextContent("lab-obstacle,lab-conflict");
    expect(screen.getByTestId("viewport-focus")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Selection" }));
    expect(screen.getByLabelText("Selection summary")).toHaveTextContent("2 pieces");
    await user.click(screen.getByRole("button", { name: "Restore view" }));
    expect(screen.getByRole("button", { name: "Show hidden parts (1)" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Build" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Choose a logical part" }),
      "lab-conflict",
    );
    await user.click(screen.getByRole("button", { name: "Move x positive" }));
    await user.click(screen.getByRole("button", { name: "Checks" }));
    expect(screen.getByText(/Stale: model revision changed/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Reveal lab-obstacle \/ lab-conflict/ }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Recalculate checks" }));
    expect(screen.queryByText(/Stale: model revision changed/)).not.toBeInTheDocument();
    await user.click(screen.getByText(/Not checked ·/));
    expect(screen.getByRole("button", { name: "Inspect unchecked lab-unsupported" })).toBeVisible();
  });
});
