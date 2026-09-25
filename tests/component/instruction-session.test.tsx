// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import type { Model } from "../../src/core/model/public";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("project=blank"),
}));
vi.mock("../../src/fixtures/load-scene", () => ({
  loadScene: async () => ({ model, variant: null, instructions: null }),
}));
const model: Model = {
  id: "guide",
  title: "Guide test",
  baselineRevision: "guide-r1",
  revision: "guide-r1",
  groups: [{ id: "workspace", name: "Workspace", protected: false }],
  instances: [
    {
      id: "base-a",
      partId: "demo-brick-2x2",
      colorId: "ivory",
      groupId: "workspace",
      transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
    },
    {
      id: "base-b",
      partId: "demo-brick-2x2",
      colorId: "ivory",
      groupId: "workspace",
      transform: { x: 2, y: 0.6, z: 0, rotation: 0 },
    },
    {
      id: "upper",
      partId: "demo-brick-2x2",
      colorId: "teal",
      groupId: "workspace",
      transform: { x: 0, y: 1.8, z: 0, rotation: 0 },
    },
  ],
};
afterEach(cleanup);

function Controls() {
  const project = useProject();
  if (!project.model || !project.entry) return <p>Loading</p>;
  const first = project.draftInstructions?.plan.steps[0];
  return (
    <>
      <output data-testid="geometry">{JSON.stringify(project.model)}</output>
      <output data-testid="model-history">{project.entry.session.past.length}</output>
      <output data-testid="plan">{JSON.stringify(project.draftInstructions?.plan)}</output>
      <output data-testid="source">{JSON.stringify(project.draftInstructions?.sourceModel)}</output>
      <output data-testid="edited">{String(project.hasInstructionEdits)}</output>
      <output data-testid="message">{project.message}</output>
      <button onClick={() => project.generateInstructions()}>Generate test instructions</button>
      <button onClick={() => project.generateInstructions({ replaceEdited: true })}>
        Confirm replacement
      </button>
      <button
        disabled={!first}
        onClick={() =>
          project.editInstructions({
            type: "update-step",
            stepId: first!.id,
            title: "My base",
            description: "Start with the pair.",
            view: "top",
          })
        }
      >
        Edit first step
      </button>
      <button
        disabled={!first}
        onClick={() =>
          project.editInstructions({
            type: "split-step",
            stepId: first!.id,
            partIds: ["base-b"],
            newStepId: "base-second",
          })
        }
      >
        Split first step
      </button>
      <button
        disabled={!project.canUndoInstructions}
        onClick={() => project.instructionsHistory("undo")}
      >
        Undo instruction edit
      </button>
      <button
        disabled={!project.canRedoInstructions}
        onClick={() => project.instructionsHistory("redo")}
      >
        Redo instruction edit
      </button>
      <button
        onClick={() => project.command({ type: "recolor", id: "upper", colorId: "terracotta" })}
      >
        Recolor model
      </button>
      <button onClick={() => project.history("undo")}>Undo model edit</button>
      <button onClick={() => project.replaceModel(model)}>Replace model</button>
    </>
  );
}
function Routes() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(!open)}>Switch route</button>
      {open ? <Controls /> : <p>Workspace route</p>}
    </>
  );
}
async function open() {
  const user = userEvent.setup();
  render(<Routes />, { wrapper: SessionProvider });
  await user.click(await screen.findByRole("button", { name: "Generate test instructions" }));
  return user;
}

describe("Instruction editorial session", () => {
  it("retains edits and saved views through route remounts with separate model history", async () => {
    const user = await open();
    const geometry = screen.getByTestId("geometry").textContent;
    await user.click(screen.getByRole("button", { name: "Edit first step" }));
    await user.click(screen.getByRole("button", { name: "Split first step" }));
    const editedPlan = screen.getByTestId("plan").textContent;
    expect(editedPlan).toContain('"title":"My base"');
    expect(editedPlan).toContain('"view":"top"');
    expect(screen.getByTestId("model-history")).toHaveTextContent("0");
    expect(screen.getByTestId("geometry").textContent).toBe(geometry);
    await user.click(screen.getByRole("button", { name: "Switch route" }));
    await user.click(screen.getByRole("button", { name: "Switch route" }));
    expect(screen.getByTestId("plan").textContent).toBe(editedPlan);
    expect(screen.getByTestId("edited")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(screen.getByTestId("plan").textContent).not.toContain("base-second");
    expect(screen.getByTestId("plan").textContent).toContain('"title":"My base"');
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(screen.getByTestId("edited")).toHaveTextContent("false");
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Redo instruction edit" }));
    await user.click(screen.getByRole("button", { name: "Redo instruction edit" }));
    expect(screen.getByTestId("plan").textContent).toBe(editedPlan);
    expect(screen.getByTestId("geometry").textContent).toBe(geometry);
  });

  it("refuses accidental regeneration of edits and resets history after explicit replacement", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Edit first step" }));
    const editedPlan = screen.getByTestId("plan").textContent;
    await user.click(screen.getByRole("button", { name: "Generate test instructions" }));
    expect(screen.getByTestId("plan").textContent).toBe(editedPlan);
    expect(screen.getByTestId("message")).toHaveTextContent("Confirm replacement");
    await user.click(screen.getByRole("button", { name: "Confirm replacement" }));
    expect(screen.getByTestId("edited")).toHaveTextContent("false");
    expect(screen.getByTestId("plan").textContent).not.toContain("My base");
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo instruction edit" })).toBeDisabled();
  });

  it("retains a stale source, rejects new edits and allows model undo to restore editing", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Edit first step" }));
    const editedPlan = screen.getByTestId("plan").textContent;
    const source = screen.getByTestId("source").textContent;
    await user.click(screen.getByRole("button", { name: "Recolor model" }));
    await user.click(screen.getByRole("button", { name: "Split first step" }));
    expect(screen.getByTestId("plan").textContent).toBe(editedPlan);
    expect(screen.getByTestId("source").textContent).toBe(source);
    expect(screen.getByTestId("message")).toHaveTextContent("out of date");
    expect(screen.getByTestId("model-history")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Undo instruction edit" }));
    expect(screen.getByTestId("plan").textContent).not.toContain("My base");
    expect(screen.getByTestId("model-history")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Redo instruction edit" }));
    await user.click(screen.getByRole("button", { name: "Undo model edit" }));
    expect(screen.getByTestId("plan").textContent).toBe(editedPlan);
    await user.click(screen.getByRole("button", { name: "Split first step" }));
    expect(screen.getByTestId("plan").textContent).toContain("base-second");
    expect(screen.getByTestId("model-history")).toHaveTextContent("0");
  });

  it("clears the old document's guide and editorial history when replacing the model", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Edit first step" }));
    await user.click(screen.getByRole("button", { name: "Replace model" }));
    expect(screen.getByTestId("plan")).toBeEmptyDOMElement();
    expect(screen.getByTestId("edited")).toHaveTextContent("false");
    expect(screen.getByRole("button", { name: "Undo instruction edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo instruction edit" })).toBeDisabled();
  });
});
