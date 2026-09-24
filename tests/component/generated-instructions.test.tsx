// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import {
  EditorStepPreview,
  type StepView,
} from "../../src/features/editor/components/editor-steps";
import { Instructions } from "../../src/features/instructions/instructions";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("project=blank") }));
afterEach(cleanup);

function Harness({ onView }: { onView: (value: StepView | null) => void }) {
  const project = useProject();
  const [route, setRoute] = useState<"editor" | "instructions">("editor");
  if (!project.model || !project.entry) return <p>Opening model</p>;
  return (
    <>
      <button
        onClick={() =>
          project.command({
            type: "add",
            instance: {
              id: "base",
              partId: "demo-plate-2x2",
              colorId: "ivory",
              groupId: "workspace",
              transform: { x: 0, y: 0.2, z: 0, rotation: 0 },
            },
          })
        }
      >
        Add base
      </button>
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
        Recolor upper brick
      </button>
      <button onClick={() => setRoute(route === "editor" ? "instructions" : "editor")}>
        Switch route
      </button>
      <span data-testid="current-revision">{project.model.revision}</span>
      <span data-testid="current-count">{project.model.instances.length}</span>
      {route === "editor" ? (
        <EditorStepPreview
          model={project.model}
          sample={project.entry.fixture.instructions}
          draft={project.draftInstructions?.plan}
          onGenerate={project.generateInstructions}
          onView={onView}
        />
      ) : (
        <Instructions />
      )}
    </>
  );
}

async function openBuiltModel(onView = vi.fn()) {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Harness onView={onView} />
    </SessionProvider>,
  );
  await user.click(await screen.findByRole("button", { name: "Add base" }));
  await user.click(screen.getByRole("button", { name: "Add upper brick" }));
  return { user, onView };
}

describe("Generated local instructions", () => {
  it("generates from a user model and keeps exact steps when switching to the instruction route", async () => {
    const { user, onView } = await openBuiltModel();
    const revision = screen.getByTestId("current-revision").textContent;
    await user.click(screen.getByRole("button", { name: "Generate instructions" }));
    expect(onView).toHaveBeenLastCalledWith({ visibleIds: ["base"], mutedIds: [] });
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(onView).toHaveBeenLastCalledWith({ visibleIds: ["base", "upper"], mutedIds: ["base"] });
    await user.click(screen.getByRole("button", { name: "Switch route" }));
    expect(screen.getByText(/2 pieces · 2 layers · 2 steps/)).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Instruction drawing: 1 highlighted piece, 1 piece shown",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(
      screen.getByRole("img", {
        name: "Instruction drawing: 1 highlighted piece, 2 pieces shown",
      }),
    ).toBeVisible();
    expect(screen.getByText("Brick 1 × 1")).toBeVisible();
    expect(screen.getByTestId("current-revision")).toHaveTextContent(revision!);
    expect(screen.getByTestId("current-count")).toHaveTextContent("2");
  });

  it("keeps the old snapshot visibly stale until explicit regeneration updates it", async () => {
    const { user } = await openBuiltModel();
    await user.click(screen.getByRole("button", { name: "Generate instructions" }));
    await user.click(screen.getByRole("button", { name: "Switch route" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Deep teal")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Recolor upper brick" }));
    expect(screen.getByRole("status")).toHaveTextContent("These instructions are out of date");
    expect(screen.getByText("Deep teal")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Regenerate instructions" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Terracotta")).toBeVisible();
    expect(screen.queryByText("Deep teal")).not.toBeInTheDocument();
  });

  it("disassembles every step down to an empty preview without removing any model pieces", async () => {
    const { user, onView } = await openBuiltModel();
    await user.click(screen.getByRole("button", { name: "Generate instructions" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Direction" }), "disassemble");
    expect(onView).toHaveBeenLastCalledWith({ visibleIds: ["base", "upper"], mutedIds: ["base"] });
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(onView).toHaveBeenLastCalledWith({ visibleIds: ["base"], mutedIds: [] });
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(onView).toHaveBeenLastCalledWith({ visibleIds: [], mutedIds: [] });
    expect(screen.getByText(/Disassembly preview complete/)).toBeVisible();
    expect(screen.getByTestId("current-count")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: "Exit step preview" }));
    expect(onView).toHaveBeenLastCalledWith(null);
  });
});
