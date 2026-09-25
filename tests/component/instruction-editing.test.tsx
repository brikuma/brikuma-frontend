// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import { Instructions } from "../../src/features/instructions/instructions";
import {
  encodeProjectSnapshot,
  parseProjectSnapshot,
  type ProjectSnapshot,
} from "../../src/core/model/public";
import { emptyProjectContext } from "../../src/adapters/project-context-file";
import { editPolicy } from "../../src/fixtures/catalog";
import { model as blank } from "../../src/fixtures/scenes/blank";

const navigation = vi.hoisted(() => ({ query: "project=blank" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
vi.mock("../../src/adapters/workspace-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/adapters/workspace-storage")>()),
  loadWorkspace: async () => [],
  saveWorkspaceProject: async (_id: string, _payload: unknown, version: number | null) =>
    (version ?? 0) + 1,
}));

afterEach(() => {
  cleanup();
  navigation.query = "project=blank";
});

function Harness({ importedSnapshot }: { importedSnapshot?: ProjectSnapshot } = {}) {
  const project = useProject();
  const [showInstructions, setShowInstructions] = useState(true);
  if (!project.model) return <p>Opening model</p>;
  return (
    <>
      {importedSnapshot && (
        <button
          onClick={() =>
            project.replaceProject({ snapshot: importedSnapshot, context: emptyProjectContext() })
          }
        >
          Open imported guide
        </button>
      )}
      {[
        { id: "left-base", label: "Add left base", x: 0 },
        { id: "right-base", label: "Add right base", x: 2 },
      ].map(({ id, label, x }) => (
        <button
          key={id}
          onClick={() =>
            project.command({
              type: "add",
              instance: {
                id,
                partId: "demo-plate-2x2",
                colorId: "ivory",
                groupId: "workspace",
                transform: { x, y: 0.2, z: 0, rotation: 0 },
              },
            })
          }
        >
          {label}
        </button>
      ))}
      <button
        onClick={() =>
          project.command({
            type: "add",
            instance: {
              id: "upper",
              partId: "demo-brick-1x1",
              colorId: "teal",
              groupId: "workspace",
              transform: { x: 0.5, y: 1, z: 0.5, rotation: 0 },
            },
          })
        }
      >
        Add upper brick
      </button>
      <button
        onClick={() => project.command({ type: "recolor", id: "upper", colorId: "terracotta" })}
      >
        Recolor model brick
      </button>
      <button onClick={() => project.history("undo")}>Undo model change</button>
      <button onClick={() => setShowInstructions((value) => !value)}>Switch route</button>
      <output data-testid="model-snapshot">{JSON.stringify(project.model)}</output>
      <output data-testid="instruction-snapshot">
        {JSON.stringify(project.draftInstructions)}
      </output>
      {showInstructions ? <Instructions /> : <p>Editor route</p>}
    </>
  );
}

async function openInstructions() {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Harness />
    </SessionProvider>,
  );
  await user.click(await screen.findByRole("button", { name: "Add left base" }));
  await user.click(screen.getByRole("button", { name: "Add right base" }));
  await user.click(screen.getByRole("button", { name: "Add upper brick" }));
  const snapshot = screen.getByTestId("model-snapshot").textContent;
  await user.click(screen.getByRole("button", { name: "Generate instructions" }));
  expect(screen.getByText(/3 pieces · 2 layers · 2 steps/)).toBeVisible();
  return { user, snapshot };
}

function drawing(name: string) {
  return screen.getByRole("img", { name: `Instruction drawing: ${name}` });
}

async function renameStep(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole("button", { name: "Edit step" }));
  const dialog = screen.getByRole("dialog", { name: "Edit instruction step" });
  await user.clear(within(dialog).getByRole("textbox", { name: "Step title" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Step title" }), title);
  await user.clear(within(dialog).getByRole("textbox", { name: "Step description" }));
  await user.type(
    within(dialog).getByRole("textbox", { name: "Step description" }),
    "Place the two plates side by side, with their long edges touching.",
  );
  await user.click(within(dialog).getByRole("button", { name: "Save step" }));
}

async function openArrangement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Arrange steps"));
}

describe("Editing a local instruction guide", () => {
  it("splits a maximally long imported step identity into a unique step that can be saved and reopened", async () => {
    const model = {
      ...blank,
      instances: Array.from({ length: 3 }, (_, index) => ({
        id: `base-${index}`,
        partId: "demo-plate-2x2",
        colorId: "ivory",
        groupId: "workspace",
        transform: { x: index * 2, y: 0.2, z: 0, rotation: 0 as const },
      })),
    };
    const imported = parseProjectSnapshot(
      {
        model,
        instructions: {
          sourceModel: model,
          edited: true,
          steps: [
            {
              id: "a".repeat(128),
              title: "Imported base",
              description: "",
              view: "top",
              newPartIds: ["base-0", "base-1"],
            },
            {
              id: "split-step-1",
              title: "Other piece",
              description: "",
              view: "top",
              newPartIds: ["base-2"],
            },
          ],
        },
      },
      editPolicy,
    );
    if (!imported.ok) throw new Error(imported.error.message);
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Harness importedSnapshot={imported.value} />
      </SessionProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Open imported guide" }));
    await openArrangement(user);
    await user.click(screen.getByRole("button", { name: "Split this step" }));
    const dialog = screen.getByRole("dialog", { name: "Split instruction step" });
    await user.click(within(dialog).getAllByRole("checkbox")[0]);
    await user.click(within(dialog).getByRole("button", { name: "Create following step" }));
    expect(screen.getByText("Step 2 of 3")).toBeVisible();
    const instructions = JSON.parse(screen.getByTestId("instruction-snapshot").textContent!);
    const snapshot = { model, instructions: { ...instructions, edited: true } };
    const encoded = encodeProjectSnapshot(snapshot);
    const reopened = parseProjectSnapshot(encoded, editPolicy);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(encodeProjectSnapshot(reopened.value)).toEqual(encoded);
    const steps = reopened.value.instructions!.plan.steps;
    expect(steps[0].id).toBe("a".repeat(128));
    expect(steps[2].id).toBe("split-step-1");
    expect(new Set(steps.map((step) => step.id)).size).toBe(3);
    expect(steps.every((step) => step.id.length <= 128)).toBe(true);
    expect(steps.flatMap((step) => step.newPartIds).sort()).toEqual(["base-0", "base-1", "base-2"]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("saves wording and each step's view across navigation without changing the model", async () => {
    const { user, snapshot } = await openInstructions();
    await user.click(screen.getByRole("button", { name: "3D view" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Edit step" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Edit instruction step" })).getByRole("button", {
        name: "Save step",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    await renameStep(user, "Build the base");
    expect(screen.getByRole("heading", { name: "Build the base", level: 2 })).toBeVisible();
    expect(
      screen.getByText("Place the two plates side by side, with their long edges touching."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Top view" }));
    expect(drawing("Top view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(drawing("3D view, 1 highlighted piece, 3 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(drawing("Top view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Switch route" }));
    await user.click(screen.getByRole("button", { name: "Switch route" }));
    expect(screen.getByRole("heading", { name: "Build the base", level: 2 })).toBeVisible();
    expect(drawing("Top view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    expect(screen.getByTestId("model-snapshot").textContent).toBe(snapshot);

    await user.click(screen.getByRole("button", { name: "Edit step" }));
    const dialog = screen.getByRole("dialog", { name: "Edit instruction step" });
    await user.clear(within(dialog).getByRole("textbox", { name: "Step title" }));
    await user.type(within(dialog).getByRole("textbox", { name: "Step title" }), "Discard this");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Build the base", level: 2 })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(drawing("3D view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(screen.queryByRole("heading", { name: "Build the base" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Redo instruction edit" }));
    expect(screen.getByRole("heading", { name: "Build the base", level: 2 })).toBeVisible();
    expect(screen.getByTestId("model-snapshot").textContent).toBe(snapshot);
  });

  it("moves the selected step and recalculates the assembled context with independent undo", async () => {
    const { user, snapshot } = await openInstructions();
    await renameStep(user, "Base section");
    await openArrangement(user);
    expect(screen.getByRole("button", { name: "Move step earlier" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move step later" }));
    expect(screen.getByText("Step 2 of 2")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Base section", level: 2 })).toBeVisible();
    expect(drawing("3D view, 2 highlighted pieces, 3 pieces shown")).toBeVisible();
    expect(screen.getByRole("button", { name: "Move step later" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move step earlier" }));
    expect(screen.getByText("Step 1 of 2")).toBeVisible();
    expect(drawing("3D view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(screen.getByText("Step 2 of 2")).toBeVisible();
    expect(drawing("3D view, 2 highlighted pieces, 3 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Redo instruction edit" }));
    expect(screen.getByText("Step 1 of 2")).toBeVisible();
    expect(screen.getByTestId("model-snapshot").textContent).toBe(snapshot);
  });

  it("merges and splits selected pieces without losing or duplicating any model piece", async () => {
    const { user, snapshot } = await openInstructions();
    await openArrangement(user);
    await user.click(screen.getByRole("button", { name: "Merge with next step" }));
    expect(screen.getByText("Step 1 of 1")).toBeVisible();
    expect(drawing("3D view, 3 highlighted pieces, 3 pieces shown")).toBeVisible();
    expect(screen.getByRole("button", { name: "Merge with next step" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Split this step" }));
    const dialog = screen.getByRole("dialog", { name: "Split instruction step" });
    expect(within(dialog).getByRole("button", { name: "Create following step" })).toBeDisabled();
    const pieces = within(dialog).getAllByRole("checkbox");
    expect(pieces).toHaveLength(3);
    const splitDrawing = within(dialog).getByRole("img", {
      name: "Instruction drawing: 3D view, 0 highlighted pieces, 3 pieces shown",
    });
    expect([...splitDrawing.querySelectorAll("text")].map((label) => label.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
    const numberMarkers = splitDrawing.querySelectorAll("circle");
    expect(Number(numberMarkers[1].getAttribute("cx"))).toBeGreaterThan(
      Number(numberMarkers[0].getAttribute("cx")),
    );
    const secondPlate = within(dialog).getByRole("checkbox", {
      name: "Piece 2: Plate 2 × 2 · Warm ivory",
    });
    await user.click(secondPlate);
    const highlighted = within(dialog).getByRole("img", {
      name: "Instruction drawing: 3D view, 1 highlighted piece, 3 pieces shown",
    });
    const partGroup = (id: string) =>
      [...highlighted.querySelectorAll("g")].find((group) =>
        group.querySelector("title")?.textContent?.endsWith(` · ${id}`),
      );
    expect(partGroup("right-base")).toHaveAttribute("opacity", "1");
    expect(partGroup("left-base")).toHaveAttribute("opacity", "0.3");
    await user.click(secondPlate);
    for (const piece of pieces) await user.click(piece);
    expect(within(dialog).getByRole("button", { name: "Create following step" })).toBeDisabled();
    for (const piece of pieces) await user.click(piece);
    await user.click(within(dialog).getByRole("checkbox", { name: /Brick 1 × 1 · Deep teal/ }));
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "Create following step" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Step 2 of 2")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Edit step" })).toHaveFocus();
    const finalDrawing = drawing("3D view, 1 highlighted piece, 3 pieces shown");
    expect(
      [...finalDrawing.querySelectorAll("g > title")].map((title) => title.textContent),
    ).toEqual(["Plate 2 × 2 · left-base", "Plate 2 × 2 · right-base", "Brick 1 × 1 · upper"]);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(drawing("3D view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(drawing("3D view, 3 highlighted pieces, 3 pieces shown")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(screen.getByText("Step 1 of 2")).toBeVisible();
    expect(drawing("3D view, 2 highlighted pieces, 2 pieces shown")).toBeVisible();
    expect(screen.getByTestId("model-snapshot").textContent).toBe(snapshot);
  });

  it("keeps an edited guide until the user explicitly replaces it", async () => {
    const { user, snapshot } = await openInstructions();
    await renameStep(user, "Keep this authored guide");
    await user.click(screen.getByRole("button", { name: "Regenerate instructions" }));
    let dialog = screen.getByRole("dialog", { name: "Replace edited instructions?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep my steps" }));
    expect(screen.getByRole("heading", { name: "Keep this authored guide" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Regenerate instructions" }));
    dialog = screen.getByRole("dialog", { name: "Replace edited instructions?" });
    await user.click(within(dialog).getByRole("button", { name: "Replace with generated steps" }));
    expect(
      screen.queryByRole("heading", { name: "Keep this authored guide" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo instruction edit" })).toBeDisabled();
    expect(screen.getByTestId("model-snapshot").textContent).toBe(snapshot);
  });

  it("preserves stale authored instructions and blocks edits until the source model is restored", async () => {
    const { user, snapshot } = await openInstructions();
    await renameStep(user, "Original assembly notes");
    await user.click(screen.getByRole("button", { name: "Recolor model brick" }));
    expect(screen.getByText(/These instructions are out of date/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Original assembly notes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Top view" })).toBeDisabled();
    await openArrangement(user);
    expect(screen.getByRole("button", { name: "Move step later" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Merge with next step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Split this step" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Deep teal")).toBeVisible();
    expect(screen.queryByText("Terracotta")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo model change" }));
    expect(screen.queryByText(/These instructions are out of date/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit step" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("heading", { name: "Original assembly notes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeEnabled();
    expect(screen.getByTestId("model-snapshot").textContent).toBe(snapshot);
  });

  it("also protects authored steps when generation is requested from the original sample guide", async () => {
    navigation.query = "project=masseria";
    const user = userEvent.setup();
    render(
      <SessionProvider>
        <Instructions />
      </SessionProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Generate instructions" }));
    await renameStep(user, "Courtyard foundation notes");
    await user.click(screen.getByRole("button", { name: "Original sample instructions" }));
    await user.click(screen.getByRole("button", { name: "Generate from current model" }));
    const dialog = screen.getByRole("dialog", { name: "Replace edited instructions?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep my steps" }));
    await user.click(screen.getByRole("button", { name: "Back to my instructions" }));
    expect(screen.getByRole("heading", { name: "Courtyard foundation notes" })).toBeVisible();
  });
});
