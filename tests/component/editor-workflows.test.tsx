// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EditorExperiment,
  EditorFiles,
  EditorReferences,
  EditorReplacement,
  EditorStepPreview,
  useEditorReferences,
} from "../../src/features/editor/components/editor-workflows";
import { generateBuildPlan, serializeProject } from "../../src/core/model/public";
import { serializeProjectPackage, type ProjectPackage } from "../../src/adapters/project-package";
import { emptyProjectContext } from "../../src/adapters/project-context-file";
import { editPolicy } from "../../src/fixtures/catalog";
import { fixture } from "../../src/fixtures/editor/placement-lab";

import { ProjectContextProvider } from "../../src/features/project-brief/project-context";

const createObjectURL = vi.fn(() => "blob:editor-reference");
const revokeObjectURL = vi.fn();
const OriginalURL = URL;
beforeEach(() => {
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 100, height: 80, close() {} })),
  );
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function projectFile(content = serializeProject(fixture.model)) {
  const file = new File([content], "scene.brikuma.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(content) });
  return file;
}

function imageFile(name: string) {
  return new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], name, {
    type: "image/png",
  });
}

describe("Editor local workflow HTML contracts", () => {
  it("EDT-042: preview/discard preserves input and protection changes make a proposal stale", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn(() => true),
      onPreview = vi.fn();
    const original = JSON.stringify(fixture.model);
    const props = {
      model: fixture.model,
      policy: editPolicy,
      selectedIds: ["lab-base-0-0"],
      onAccept,
      onPreview,
    };
    const view = render(<EditorExperiment {...props} />);
    await user.click(screen.getByRole("button", { name: "Preview local edit" }));
    expect(
      onPreview.mock.lastCall?.[0]?.instances.find(
        (part: { id: string }) => part.id === "lab-base-0-0",
      ).colorId,
    ).toBe("teal");
    expect(JSON.stringify(fixture.model)).toBe(original);
    expect(screen.getByText("Colors changed").nextElementSibling).toHaveTextContent("1");
    const protectedModel = {
      ...fixture.model,
      groups: fixture.model.groups.map((group) => ({ ...group, protected: group.id === "base" })),
    };
    view.rerender(<EditorExperiment {...props} model={protectedModel} />);
    expect(screen.getByRole("button", { name: "Accept edit" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Recalculate proposal" }));
    expect(screen.getByRole("alert")).toHaveTextContent("protected");
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onPreview).toHaveBeenLastCalledWith(null);
    expect(onAccept).not.toHaveBeenCalled();
  });
  it("EDT-043: offers only same-footprint replacements and preserves selected identity in command", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(() => true);
    render(
      <EditorReplacement
        model={fixture.model}
        policy={editPolicy}
        selectedId="lab-even-width"
        onCommand={onCommand}
      />,
    );
    expect(screen.getByRole("option", { name: "Plate 2 × 2" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Brick 2 × 4" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Replacement part"), "demo-tile-2x2");
    expect(screen.getByText(/Connectors: changed/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Replace selected part" }));
    expect(onCommand).toHaveBeenCalledWith({
      type: "replace-part",
      id: "lab-even-width",
      partId: "demo-tile-2x2",
    });
    await user.selectOptions(screen.getByLabelText("Replacement part"), "demo-round-2x2");
    expect(screen.getByText(/Connectors: unknown/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Replace selected part" })).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", { name: "Use this replacement as an unverified draft" }),
    );
    expect(screen.getByRole("button", { name: "Replace selected part" })).toBeEnabled();
  });
  it("EDT-044: handles decode failure and revokes every local image URL", async () => {
    const user = userEvent.setup();
    const view = render(<EditorReferences />, { wrapper: ProjectContextProvider });
    await user.upload(screen.getByLabelText("Choose local images"), imageFile("wall.png"));
    const image = screen.getByRole("img", { name: "Pinned reference: wall.png" });
    fireEvent.error(image);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be decoded");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:editor-reference");
    await user.upload(screen.getByLabelText("Choose local images"), imageFile("roof.png"));
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
  it("EDT-044: project-owned references survive panel closure and release at session unmount", async () => {
    function Panels() {
      const state = useEditorReferences();
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button onClick={() => setVisible((current) => !current)}>Toggle panel</button>
          {visible && <EditorReferences state={state} />}
        </>
      );
    }
    const user = userEvent.setup();
    const view = render(<Panels />, { wrapper: ProjectContextProvider });
    await user.upload(screen.getByLabelText("Choose local images"), imageFile("wall.png"));
    await user.click(screen.getByRole("button", { name: "Toggle panel" }));
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Toggle panel" }));
    expect(screen.getByRole("img", { name: "Pinned reference: wall.png" })).toBeVisible();
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });
  it("EDT-045: step changes emit stable IDs and stale revision restores assembled display", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const props = { model: fixture.model, sample: fixture.instructions, onView };
    const view = render(<EditorStepPreview {...props} />);
    await user.click(screen.getByRole("button", { name: "Open step preview" }));
    expect(onView.mock.lastCall?.[0].visibleIds).toEqual(
      fixture.instructions!.steps[0].visiblePartIds,
    );
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(onView.mock.lastCall?.[0].mutedIds).toEqual(
      fixture.instructions!.steps[0].visiblePartIds,
    );
    view.rerender(
      <EditorStepPreview
        {...props}
        model={{ ...fixture.model, revision: "edited-r2", instances: [] }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Step plan stale");
    expect(onView).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole("button", { name: "Exit step preview" }));
  });
  it("EDT-048: validates before prompting and never replaces dirty work until explicit confirmation", async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    render(<EditorFiles model={fixture.model} policy={editPolicy} dirty onLoad={onLoad} />);
    await user.upload(screen.getByLabelText("Load project file"), projectFile());
    expect(await screen.findByRole("dialog")).toHaveTextContent("Replace this local model?");
    expect(onLoad).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Keep current model" }));
    expect(onLoad).not.toHaveBeenCalled();
    await user.upload(screen.getByLabelText("Load project file"), projectFile("{broken"));
    expect(await screen.findByRole("alert")).toHaveTextContent("not valid JSON");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText("Load project file"), projectFile());
    await user.click(await screen.findByRole("button", { name: "Replace with file" }));
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(fixture.model));
  });
  it("restores a complete project only after confirmation, preserving authored instructions and brief references", async () => {
    const user = userEvent.setup();
    const generated = generateBuildPlan(fixture.model, editPolicy.parts);
    if (!generated.ok) throw new Error(generated.error.message);
    const context = emptyProjectContext();
    context.brief.subject = "Keep the local sculpture idea";
    context.references = [
      { id: 3, filename: "sketch-notes.pdf", type: "application/pdf", size: 100 },
    ];
    const backup: ProjectPackage = {
      snapshot: {
        model: fixture.model,
        instructions: {
          sourceModel: fixture.model,
          edited: true,
          plan: {
            ...generated.value,
            steps: generated.value.steps.map((step, index) =>
              index === 0
                ? {
                    ...step,
                    title: "Prepare the base",
                    description: "Keep these authored notes.",
                    view: "top",
                  }
                : step,
            ),
          },
        },
      },
      context,
    };
    const text = await serializeProjectPackage(backup);
    const onLoad = vi.fn();
    const onProjectLoad = vi.fn();
    render(
      <EditorFiles
        model={fixture.model}
        policy={editPolicy}
        dirty
        onLoad={onLoad}
        onProjectLoad={onProjectLoad}
      />,
    );
    await user.upload(screen.getByLabelText("Load project file"), projectFile(text));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "model, brief, references and instructions",
    );
    await user.click(screen.getByRole("button", { name: "Keep current model" }));
    expect(onProjectLoad).not.toHaveBeenCalled();
    expect(onLoad).not.toHaveBeenCalled();

    await user.upload(screen.getByLabelText("Load project file"), projectFile(text));
    await user.click(await screen.findByRole("button", { name: "Replace with file" }));
    expect(onProjectLoad).toHaveBeenCalledExactlyOnceWith(backup);
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Undo history starts here");
  });
});
