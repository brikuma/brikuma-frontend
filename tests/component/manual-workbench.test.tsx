// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "../../src/features/editor/workbench";
import { SessionProvider } from "../../src/features/editor/state/session";
import { partDefinitions } from "../../src/fixtures/catalog";
import { downloadLocalBlob } from "../../src/adapters/local-download";
import type { Model } from "../../src/core/model/public";
import type { PlacementPreview } from "../../src/features/editor/viewport-types";
import { useProjectContext } from "../../src/features/project-brief/project-context";
import { emptyProjectContext } from "../../src/adapters/project-context-file";
import { serializeProjectPackage } from "../../src/adapters/project-package";
import { model as blankModel } from "../../src/fixtures/scenes/blank";

vi.mock("../../src/adapters/local-download", () => ({ downloadLocalBlob: vi.fn() }));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("project=blank") }));
vi.mock("../../src/features/editor/components/model-viewport", () => ({
  ModelViewport: ({
    placement,
    hidden,
    model,
  }: {
    placement: PlacementPreview | null;
    hidden: readonly string[];
    model: Model;
  }) => (
    <div>
      <div data-testid="pending-model-part" data-height={placement?.transform.y}>
        {placement?.partId ?? "No pending part"}
      </div>
      <div data-testid="hidden-model-groups">{hidden.join(",") || "No hidden groups"}</div>
      <div data-testid="canvas-model-count">{model.instances.length}</div>
      <div data-testid="canvas-model-heights">
        {model.instances.map((part) => part.transform.y).join(",")}
      </div>
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
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function expand(user: ReturnType<typeof userEvent.setup>, label: string) {
  const summary = screen.queryByText(label, { exact: true });
  if (summary && !summary.closest("details")?.open) await user.click(summary);
}

describe("Manual building through accessible controls", () => {
  it("replaces reference drafts and errors with imported calibration when a backup reuses reference IDs", async () => {
    const user = userEvent.setup();
    let nextUrl = 0;
    const originalURL = URL;
    vi.stubGlobal(
      "URL",
      class extends originalURL {
        static createObjectURL = () => `blob:import-${nextUrl++}`;
        static revokeObjectURL = vi.fn();
      },
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 100, height: 100, close() {} })),
    );
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]);
    function context(filename: string, length: number) {
      return {
        ...emptyProjectContext(),
        references: [
          {
            id: 0,
            filename,
            type: "image/png",
            size: bytes.length,
            blob: new Blob([bytes], { type: "image/png" }),
            width: 100,
            height: 100,
            validated: true,
          },
        ],
        calibrations: {
          0: { first: { x: 0, y: 0 }, second: { x: 50, y: 0 }, length, plane: "XZ" as const },
        },
      };
    }
    function SeedReference() {
      const { replaceProjectContext } = useProjectContext("blank");
      return (
        <button onClick={() => replaceProjectContext(context("old.png", 2))}>Seed reference</button>
      );
    }
    const backup = await serializeProjectPackage({
      snapshot: { model: blankModel },
      context: context("imported.png", 4),
    });
    render(
      <SessionProvider>
        <Workbench />
        <SeedReference />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Seed reference" }));
    await user.click(screen.getByRole("button", { name: "References" }));
    await expand(user, "Manual reference scale");
    await user.clear(screen.getByLabelText("Known length (studs)"));
    await user.type(screen.getByLabelText("Known length (studs)"), "0");
    await user.selectOptions(screen.getByLabelText("Declared alignment"), "XY");
    await user.click(screen.getByRole("button", { name: "Declare scale" }));
    expect(
      within(screen.getByRole("region", { name: "Local reference board" })).getByRole("alert"),
    ).toHaveTextContent("positive known length");
    await expand(user, "Project tools");
    await user.click(screen.getByRole("button", { name: "Local project files" }));
    const file = new File([backup], "replacement.brikuma.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(backup) });
    await user.upload(screen.getByLabelText("Load project file", { exact: true }), file);
    await user.click(await screen.findByRole("button", { name: "Replace with file" }));
    expect(screen.getByRole("img", { name: "Pinned reference: imported.png" })).toBeVisible();
    await expand(user, "Manual reference scale");
    expect(screen.getByLabelText("Known length (studs)")).toHaveValue("4");
    expect(screen.getByLabelText("Anchor B X (px)")).toHaveValue("50");
    expect(screen.getByLabelText("Declared alignment")).toHaveValue("XZ");
    expect(
      within(screen.getByRole("region", { name: "Local reference board" })).queryByRole("alert"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Declare scale" }));
    expect(
      within(screen.getByRole("region", { name: "Local reference board" })).getByRole("status"),
    ).toHaveTextContent("0.08000 studs per pixel · XZ");
  });

  it("builds a two-brick stack and undoes it without opening numeric controls", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    expect(await screen.findByTestId("piece-count")).toHaveTextContent(/^0$/);
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 6" }));
    expect(screen.getByText("Advanced placement").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("spinbutton", { name: "Placement X" })).not.toBeVisible();
    expect(screen.getByRole("button", { name: "On the floor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Place brick" })).toBeEnabled();
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^0$/);
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("canvas-model-heights")).toHaveTextContent(/^0.6$/);
    expect(screen.getByText("Advanced position").closest("details")).not.toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 6" }));
    expect(screen.getByRole("button", { name: "Attach to model" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("pending-model-part")).toHaveAttribute("data-height", "1.8");
    expect(screen.getByText(/12 studs aligned/)).toBeVisible();
    expect(screen.getByText("Advanced placement").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("spinbutton", { name: "Placement Y" })).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Place brick" })).toBeEnabled();
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("canvas-model-heights")).toHaveTextContent(/^0.6$/);

    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^2$/);
    expect(screen.getByTestId("canvas-model-heights")).toHaveTextContent(/^0.6,1.8$/);
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByText("Advanced position").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("canvas-model-heights")).toHaveTextContent(/^0.6$/);
    expect(screen.getByRole("button", { name: "Redo local edit" })).toBeEnabled();
  });

  it("keeps compact parts controls beside the workspace and returns focus when closed", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 842 });
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    const toggle = await screen.findByRole("button", { name: "Parts & structure" });
    await user.click(toggle);
    const panel = screen.getByRole("complementary", { name: "Parts and structure" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Modeling workspace" })).toBeVisible();
    await user.click(within(panel).getByRole("button", { name: "Add Brick 2 × 4" }));
    await expand(user, "Advanced placement");
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("demo-brick-2x4");
    await user.click(within(panel).getByRole("button", { name: "Close panel" }));
    expect(toggle).toHaveFocus();
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("demo-brick-2x4");
  });

  it("waits for a fresh repeated position and keeps storage failure separate from a backup download", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await expand(user, "Advanced placement");
    await user.click(screen.getByRole("checkbox", { name: /Repeat placement/ }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    await user.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Free position" }));
    await user.click(screen.getByRole("button", { name: "Free position" }));
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    expect(screen.getByLabelText("Local save status")).toHaveTextContent("Not saved");
    await user.click(screen.getByRole("button", { name: "Download project" }));
    expect(downloadLocalBlob).toHaveBeenCalledWith(expect.any(Blob), "blank.brikuma.json");
    expect(screen.getByText(/Project backup requested/)).toBeVisible();
    expect(screen.getByLabelText("Local save status")).toHaveTextContent("Not saved");
    const x = screen.getByRole("spinbutton", { name: "Placement X" });
    await user.clear(x);
    await user.type(x, "3.2");
    await user.click(screen.getByRole("button", { name: "Update preview" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    expect(screen.getByLabelText("Local save status")).toHaveTextContent("Not saved");
    await user.click(screen.getByRole("button", { name: "Cancel placement" }));
    await user.click(screen.getByRole("button", { name: "Add Brick 1 × 1" }));
    await expand(user, "Advanced placement");
    expect(screen.getByRole("button", { name: "Connect" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each(partDefinitions)(
    "places, rotates as a draft and duplicates $name",
    async (definition) => {
      const user = userEvent.setup();
      render(
        <SessionProvider>
          <Workbench />
        </SessionProvider>,
      );
      await screen.findByTestId("piece-count");
      await user.click(screen.getByRole("button", { name: `Add ${definition.name}` }));
      await expand(user, "Advanced placement");
      await user.click(screen.getByRole("button", { name: "Free position" }));
      await user.click(screen.getByRole("button", { name: "Place brick" }));
      expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
      await expand(user, "Advanced position");
      await user.click(screen.getByRole("button", { name: "Rotate as draft" }));
      await user.click(screen.getByRole("button", { name: "Duplicate" }));
      expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    },
  );

  it("previews without changing the model, places at chosen coordinates, rotates, duplicates and undoes", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    expect(await screen.findByTestId("piece-count")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await expand(user, "Advanced placement");
    expect(screen.getByTestId("piece-count")).toHaveTextContent("0");
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("demo-brick-2x4");
    const x = screen.getByRole("spinbutton", { name: "Placement X" });
    await user.clear(x);
    await user.type(x, "2");
    await user.click(screen.getByRole("button", { name: "Free position" }));
    await user.click(screen.getByRole("button", { name: "Update preview" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByTestId("piece-count")).toHaveTextContent("1");
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(2);
    await user.click(screen.getByRole("button", { name: "Rotate as draft" }));
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("2");
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(3.6);
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
    await expand(user, "Advanced placement");
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    await user.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByText("1 undoable changes")).toBeVisible();
    expect(screen.getAllByText("blank-local-1", { exact: true })[0]).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await expand(user, "Advanced placement");
    expect(screen.getByRole("spinbutton", { name: "Placement X" })).toHaveValue(0);
    await user.click(screen.getByRole("button", { name: "On the floor" }));
    expect(screen.getByRole("spinbutton", { name: "Placement Y" })).toHaveValue(0.48);
    expect(screen.getByRole("spinbutton", { name: "Placement Z" })).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    expect(screen.getByText(/This position overlaps another piece/)).toBeVisible();
    expect(screen.getByTestId("canvas-model-count")).toHaveTextContent(/^1$/);
    expect(screen.getByText("1 undoable changes")).toBeVisible();
    expect(screen.getAllByText("blank-local-1", { exact: true })[0]).toBeVisible();
    expect(screen.getByRole("button", { name: "Redo local edit" })).toBeDisabled();
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("demo-brick-2x4");

    await user.click(screen.getByRole("button", { name: "Free position" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^2$/);
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByRole("status")).not.toHaveTextContent(
      "This position overlaps another piece",
    );
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).toHaveValue(0.48);
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
    await expand(user, "Advanced placement");
    await user.click(screen.getByRole("button", { name: "Cancel placement" }));
    expect(screen.getByTestId("piece-count")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Undo local edit" })).toBeDisabled();
    expect(screen.queryByRole("spinbutton", { name: "Placement X" })).not.toBeInTheDocument();
  });

  it("places a thin roof detail exactly on the ground with a 0.12 cm center height", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    expect(await screen.findByTestId("piece-count")).toHaveTextContent(/^0$/);
    await user.click(screen.getByRole("button", { name: "Add Roof tile slope 1 × 1" }));
    await expand(user, "Advanced placement");
    await user.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("spinbutton", { name: "Placement Y" })).toHaveValue(0.12);
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByTestId("piece-count")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("pending-model-part")).toHaveTextContent("No pending part");
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).toHaveValue(0.12);
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
    await expand(user, "More colors");
    await user.click(screen.getByRole("button", { name: "New brick color: Deep teal" }));
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await expand(user, "Advanced placement");
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
    expect(within(dimensions).getByText("Width").nextElementSibling).toHaveTextContent("1.6 cm");
    expect(within(dimensions).getByText("Depth").nextElementSibling).toHaveTextContent("3.2 cm");
    await user.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Connect" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("piece-count")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    expect(screen.getByRole("combobox", { name: "Part color" })).toHaveValue("terracotta");
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    const selected = screen.getByLabelText("Selected part dimensions");
    expect(within(selected).getByText("Width").nextElementSibling).toHaveTextContent("1.6 cm");
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
    await expand(user, "Advanced placement");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
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
    await expand(user, "Advanced placement");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    await expand(user, "Project tools");
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    await user.keyboard("r{Delete}{Control>}z{/Control}");
    expect(screen.getByTestId("piece-count")).toHaveTextContent("1");
    expect(screen.getByText("Rotation 0°")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Redo local edit" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0);
  });

  it("scopes movement shortcuts, preserves typing and applies centimeters on every axis", async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Workbench />
      </SessionProvider>,
    );
    await screen.findByTestId("piece-count");
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    await expand(user, "Advanced placement");
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    await expand(user, "Advanced position");
    screen.getByRole("region", { name: /^Modeling workspace/ }).focus();
    await user.keyboard("{ArrowRight}r");
    expect(screen.getByText("Rotation 0°")).toBeVisible();
    expect(screen.getByRole("region", { name: "Reposition piece" })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0);
    await user.click(screen.getByRole("button", { name: "Apply move" }));
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0.8);
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    const x = screen.getByRole("spinbutton", { name: "Position X" });
    await user.click(x);
    await user.keyboard("r");
    expect(screen.getByText("Rotation 90°")).toBeVisible();
    await user.clear(x);
    await user.type(x, "2.96");
    const y = screen.getByRole("spinbutton", { name: "Position Y" });
    const z = screen.getByRole("spinbutton", { name: "Position Z" });
    await user.clear(y);
    await user.type(y, "0.56");
    await user.clear(z);
    await user.type(z, "-0.24");
    await user.click(screen.getByRole("button", { name: "Apply position" }));
    expect(screen.getByText("X 2.96 · Y 0.56 · Z -0.24 cm")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(screen.getByRole("spinbutton", { name: "Position X" })).toHaveValue(0.8);
    expect(screen.getByRole("spinbutton", { name: "Position Y" })).toHaveValue(0.48);
    expect(screen.getByRole("spinbutton", { name: "Position Z" })).toHaveValue(0);
  });
});
