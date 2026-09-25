// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import { useWorkspaceSaveStatus } from "../../src/features/editor/state/workspace-persistence";
import { useProjectContext } from "../../src/features/project-brief/project-context";
import { loadScene } from "../../src/fixtures/load-scene";
import type { SceneFixture } from "../../src/fixtures/scene-types";
import {
  loadWorkspace,
  saveWorkspaceProject,
  WorkspaceStorageError,
  type SavedWorkspaceProject,
} from "../../src/adapters/workspace-storage";
import {
  parseWorkspaceProject,
  snapshotWorkspaceProject,
} from "../../src/adapters/project-package";
import { emptyProjectContext } from "../../src/adapters/project-context-file";
import {
  applyBuildPlanEdit,
  generateBuildPlan,
  isBuildPlanCurrent,
  type Model,
  type Result,
} from "../../src/core/model/public";
import { editPolicy } from "../../src/fixtures/catalog";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("project=blank"),
}));
vi.mock("../../src/fixtures/load-scene", () => ({ loadScene: vi.fn() }));
vi.mock("../../src/adapters/workspace-storage", async (original) => ({
  ...(await original<typeof import("../../src/adapters/workspace-storage")>()),
  loadWorkspace: vi.fn(),
  saveWorkspaceProject: vi.fn(),
}));

const baseline: Model = {
  id: "tower",
  title: "My tower",
  baselineRevision: "tower-r1",
  revision: "tower-r1",
  groups: [{ id: "body", name: "Body", protected: false }],
  instances: [
    {
      id: "brick",
      partId: "demo-brick-2x2",
      colorId: "ivory",
      groupId: "body",
      transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
    },
  ],
};
function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function savedRow(): SavedWorkspaceProject {
  const context = emptyProjectContext();
  context.brief.subject = "A small garden tower";
  const generated = value(generateBuildPlan(baseline, editPolicy.parts));
  const plan = value(
    applyBuildPlanEdit(generated, {
      type: "update-step",
      stepId: generated.steps[0].id,
      title: "My first piece",
      view: "top",
    }),
  );
  const model: Model = {
    ...baseline,
    revision: "tower-local-3",
    instances: baseline.instances.map((part) => ({ ...part, colorId: "teal" })),
  };
  return {
    id: "blank",
    version: 7,
    payload: snapshotWorkspaceProject({
      baseline,
      context,
      snapshot: { model, instructions: { sourceModel: baseline, plan, edited: true } },
    }),
  };
}
beforeEach(() => {
  vi.mocked(loadWorkspace).mockReset().mockResolvedValue([]);
  vi.mocked(saveWorkspaceProject)
    .mockReset()
    .mockImplementation(async (_id, _payload, version) => (version ?? 0) + 1);
  vi.mocked(loadScene)
    .mockReset()
    .mockResolvedValue({ model: baseline, instructions: null, variant: null });
});
afterEach(cleanup);

function Controls() {
  const project = useProject();
  const context = useProjectContext("blank");
  const saving = useWorkspaceSaveStatus("blank");
  if (!project.model || !project.entry) return <p>Opening fixture</p>;
  return (
    <>
      <output aria-label="Save status">{saving.message}</output>
      <output aria-label="Current model">{JSON.stringify(project.model)}</output>
      <output aria-label="Model undo entries">{project.entry.session.past.length}</output>
      <output aria-label="Instruction title">
        {project.draftInstructions?.plan.steps[0].title}
      </output>
      <output aria-label="Instruction view">{project.draftInstructions?.plan.steps[0].view}</output>
      <output aria-label="Instructions edited">{String(project.hasInstructionEdits)}</output>
      <output aria-label="Instructions stale">
        {String(
          !!project.draftInstructions &&
            !isBuildPlanCurrent(project.model, project.draftInstructions.plan),
        )}
      </output>
      <output aria-label="Instruction source color">
        {project.draftInstructions?.sourceModel.instances[0].colorId}
      </output>
      <output aria-label="Instruction undo available">{String(project.canUndoInstructions)}</output>
      <output aria-label="Brief subject">{context.brief.subject}</output>
      <output aria-label="Metadata pending">{String(!!project.entry.needsMetadata)}</output>
      <output aria-label="Sample instruction revision">
        {project.entry.fixture.instructions?.revision}
      </output>
      <output aria-label="Assembly module">
        {project.entry.fixture.assemblyView?.modules[0]?.id}
      </output>
      <button onClick={() => project.command({ type: "recolor", id: "brick", colorId: "teal" })}>
        Make teal
      </button>
      <button
        onClick={() => project.command({ type: "recolor", id: "brick", colorId: "terracotta" })}
      >
        Make terracotta
      </button>
      <button onClick={() => project.command({ type: "recolor", id: "brick", colorId: "blue" })}>
        Make blue
      </button>
      <button onClick={() => project.history("undo")}>Undo model</button>
      <button
        onClick={() => context.setBrief((brief) => ({ ...brief, subject: "Updated tower brief" }))}
      >
        Edit brief
      </button>
    </>
  );
}

function BriefControls() {
  const context = useProjectContext("blank");
  const saving = useWorkspaceSaveStatus("blank");
  return (
    <>
      <output aria-label="Brief subject">{context.brief.subject}</output>
      <output aria-label="Save status">{saving.message}</output>
      <button onClick={() => context.setBrief((brief) => ({ ...brief, subject: "A moon garden" }))}>
        Start a brief
      </button>
    </>
  );
}

async function open() {
  const user = userEvent.setup();
  render(<Controls />, { wrapper: SessionProvider });
  await screen.findByRole("button", { name: "Make teal" });
  await waitFor(() =>
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Saved in this browser"),
  );
  await act(async () => {
    await Promise.resolve();
  });
  vi.mocked(saveWorkspaceProject).mockClear();
  return user;
}

async function writtenModel(call: number) {
  const result = await parseWorkspaceProject(
    vi.mocked(saveWorkspaceProject).mock.calls[call][1],
    editPolicy,
  );
  if (!result.ok || !result.value.snapshot) throw new Error("Expected a valid model save.");
  return result.value.snapshot.model;
}

describe("Browser workspace persistence", () => {
  it("reattaches matching sample metadata despite model property order without writing during restore", async () => {
    const differentlyOrderedModel: Model = {
      id: baseline.id,
      title: baseline.title,
      baselineRevision: baseline.baselineRevision,
      revision: baseline.revision,
      instances: baseline.instances,
      groups: baseline.groups,
    };
    expect(JSON.stringify(differentlyOrderedModel)).not.toBe(JSON.stringify(baseline));
    const fixture: SceneFixture = {
      model: differentlyOrderedModel,
      variant: null,
      instructions: {
        revision: "sample-guide-r7",
        modelRevision: baseline.revision,
        title: "Tower sample",
        steps: [
          {
            id: "sample-step",
            title: "Place the brick",
            description: "Place the first piece.",
            visiblePartIds: ["brick"],
            newPartIds: ["brick"],
            callout: "Start here",
            preview: "/previews/tower.svg",
          },
        ],
      },
      assemblyView: {
        modelId: baseline.id,
        baselineRevision: baseline.baselineRevision,
        modules: [
          {
            id: "roof",
            name: "Roof",
            description: "Lift the roof.",
            partIds: ["brick"],
            offset: { x: 0, y: 2, z: 0 },
            views: ["roof"],
          },
        ],
      },
    };
    vi.mocked(loadWorkspace).mockResolvedValue([savedRow()]);
    vi.mocked(loadScene).mockResolvedValue(fixture);
    render(<Controls />, { wrapper: SessionProvider });
    await waitFor(() =>
      expect(screen.getByLabelText("Sample instruction revision")).toHaveTextContent(
        "sample-guide-r7",
      ),
    );
    expect(screen.getByLabelText("Assembly module")).toHaveTextContent("roof");
    expect(screen.getByLabelText("Metadata pending")).toHaveTextContent("false");
    expect(screen.getByLabelText("Current model")).toHaveTextContent("tower-local-3");
    expect(screen.getByLabelText("Instruction title")).toHaveTextContent("My first piece");
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Saved in this browser");
    expect(saveWorkspaceProject).not.toHaveBeenCalled();
  });

  it("does not attach original metadata when the saved baseline differs despite the same identity", async () => {
    vi.mocked(loadWorkspace).mockResolvedValue([savedRow()]);
    vi.mocked(loadScene).mockResolvedValue({
      model: {
        ...baseline,
        instances: baseline.instances.map((part) => ({
          ...part,
          transform: { ...part.transform, x: 4 },
        })),
      },
      variant: null,
      instructions: {
        revision: "unrelated-guide",
        modelRevision: baseline.revision,
        title: "Different tower",
        steps: [],
      },
      assemblyView: {
        modelId: baseline.id,
        baselineRevision: baseline.baselineRevision,
        modules: [
          {
            id: "different-roof",
            name: "Different roof",
            description: "Other geometry",
            partIds: ["brick"],
            offset: { x: 0, y: 2, z: 0 },
            views: ["roof"],
          },
        ],
      },
    });
    render(<Controls />, { wrapper: SessionProvider });
    await waitFor(() =>
      expect(screen.getByLabelText("Metadata pending")).toHaveTextContent("false"),
    );
    expect(screen.getByLabelText("Sample instruction revision")).toBeEmptyDOMElement();
    expect(screen.getByLabelText("Assembly module")).toBeEmptyDOMElement();
    expect(screen.getByLabelText("Current model")).toHaveTextContent('"x":0');
    expect(screen.getByLabelText("Instruction title")).toHaveTextContent("My first piece");
    expect(saveWorkspaceProject).not.toHaveBeenCalled();
  });

  it("saves and restores a brief-only project without loading any scene geometry", async () => {
    const user = userEvent.setup();
    const view = render(<BriefControls />, { wrapper: SessionProvider });
    await user.click(await screen.findByRole("button", { name: "Start a brief" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Save status")).toHaveTextContent("Saved in this browser"),
    );
    expect(saveWorkspaceProject).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(saveWorkspaceProject).mock.calls[0][1];
    const parsed = await parseWorkspaceProject(payload, editPolicy);
    expect(parsed.ok && parsed.value.snapshot).toBeUndefined();
    expect(parsed.ok && parsed.value.context.brief.subject).toBe("A moon garden");
    view.unmount();
    vi.mocked(loadWorkspace).mockResolvedValue([{ id: "blank", version: 1, payload }]);
    render(<BriefControls />, { wrapper: SessionProvider });
    expect(await screen.findByLabelText("Brief subject")).toHaveTextContent("A moon garden");
    expect(loadScene).not.toHaveBeenCalled();
  });

  it("blocks fixture loading during hydration then restores model, stale edited guide and brief without undo history", async () => {
    const loading = deferred<SavedWorkspaceProject[]>();
    vi.mocked(loadWorkspace).mockReturnValue(loading.promise);
    render(<Controls />, { wrapper: SessionProvider });
    expect(screen.getByRole("status")).toHaveTextContent("Restoring your local workspace");
    expect(loadScene).not.toHaveBeenCalled();
    expect(saveWorkspaceProject).not.toHaveBeenCalled();
    await act(async () => loading.resolve([savedRow()]));
    expect(await screen.findByLabelText("Current model")).toHaveTextContent("tower-local-3");
    expect(screen.getByLabelText("Current model")).toHaveTextContent('"colorId":"teal"');
    expect(screen.getByLabelText("Instruction title")).toHaveTextContent("My first piece");
    expect(screen.getByLabelText("Instruction view")).toHaveTextContent("top");
    expect(screen.getByLabelText("Instructions edited")).toHaveTextContent("true");
    expect(screen.getByLabelText("Instructions stale")).toHaveTextContent("true");
    expect(screen.getByLabelText("Instruction source color")).toHaveTextContent("ivory");
    expect(screen.getByLabelText("Brief subject")).toHaveTextContent("A small garden tower");
    expect(screen.getByLabelText("Model undo entries")).toHaveTextContent("0");
    expect(screen.getByLabelText("Instruction undo available")).toHaveTextContent("false");
  });

  it("serializes in-flight writes and coalesces rapid edits to the latest project", async () => {
    const user = await open();
    const first = deferred<number>();
    vi.mocked(saveWorkspaceProject).mockImplementationOnce(() => first.promise);
    await user.click(screen.getByRole("button", { name: "Make teal" }));
    await user.click(screen.getByRole("button", { name: "Make terracotta" }));
    await user.click(screen.getByRole("button", { name: "Make blue" }));
    expect(saveWorkspaceProject).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Saving");
    expect((await writtenModel(0)).instances[0].colorId).toBe("teal");
    const version = vi.mocked(saveWorkspaceProject).mock.calls[0][2]!;
    await act(async () => first.resolve(version + 1));
    await waitFor(() => expect(saveWorkspaceProject).toHaveBeenCalledTimes(2));
    expect((await writtenModel(1)).instances[0].colorId).toBe("blue");
    expect(vi.mocked(saveWorkspaceProject).mock.calls[1][2]).toBe(version + 1);
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Saved in this browser");
  });

  it("persists a return to the saved baseline instead of an older queued edit", async () => {
    const user = await open();
    const first = deferred<number>();
    vi.mocked(saveWorkspaceProject).mockImplementationOnce(() => first.promise);
    await user.click(screen.getByRole("button", { name: "Make teal" }));
    await user.click(screen.getByRole("button", { name: "Make terracotta" }));
    await user.click(screen.getByRole("button", { name: "Undo model" }));
    await user.click(screen.getByRole("button", { name: "Undo model" }));
    expect(screen.getByLabelText("Current model")).toHaveTextContent('"colorId":"ivory"');
    expect(saveWorkspaceProject).toHaveBeenCalledTimes(1);
    const version = vi.mocked(saveWorkspaceProject).mock.calls[0][2]!;
    await act(async () => first.resolve(version + 1));
    await waitFor(() => expect(saveWorkspaceProject).toHaveBeenCalledTimes(2));
    expect(await writtenModel(1)).toEqual(baseline);
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Saved in this browser");
  });

  it("keeps edits open after quota failure and retries the latest model and brief", async () => {
    const user = await open();
    const first = deferred<number>();
    vi.mocked(saveWorkspaceProject).mockImplementationOnce(() => first.promise);
    await user.click(screen.getByRole("button", { name: "Make teal" }));
    await user.click(screen.getByRole("button", { name: "Make terracotta" }));
    await user.click(screen.getByRole("button", { name: "Edit brief" }));
    await act(async () =>
      first.reject(new WorkspaceStorageError("quota", "Browser storage is full.")),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Browser storage is full");
    expect(saveWorkspaceProject).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Retry local save" }));
    await waitFor(() => expect(saveWorkspaceProject).toHaveBeenCalledTimes(2));
    expect((await writtenModel(1)).instances[0].colorId).toBe("terracotta");
    const result = await parseWorkspaceProject(
      vi.mocked(saveWorkspaceProject).mock.calls[1][1],
      editPolicy,
    );
    expect(result.ok && result.value.context.brief.subject).toBe("Updated tower brief");
    expect(vi.mocked(saveWorkspaceProject).mock.calls[1][2]).toBe(
      vi.mocked(saveWorkspaceProject).mock.calls[0][2],
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tries a corrected document after a transient save failure without requiring a reload", async () => {
    const user = await open();
    vi.mocked(saveWorkspaceProject).mockRejectedValueOnce(
      new WorkspaceStorageError("quota", "Browser storage is full."),
    );
    await user.click(screen.getByRole("button", { name: "Make teal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Browser storage is full");
    await user.click(screen.getByRole("button", { name: "Edit brief" }));
    await waitFor(() => expect(saveWorkspaceProject).toHaveBeenCalledTimes(2));
    expect((await writtenModel(1)).instances[0].colorId).toBe("teal");
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Saved in this browser");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("never retries or overwrites a conflicting tab's record while keeping newer local edits", async () => {
    const user = await open();
    vi.mocked(saveWorkspaceProject).mockRejectedValueOnce(
      new WorkspaceStorageError(
        "conflict",
        "Another tab saved this project. The saved version was not overwritten.",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Make teal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Another tab saved");
    expect(screen.queryByRole("button", { name: "Retry local save" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Make terracotta" }));
    await user.click(screen.getByRole("button", { name: "Edit brief" }));
    expect(saveWorkspaceProject).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Current model")).toHaveTextContent('"colorId":"terracotta"');
    expect(screen.getByLabelText("Brief subject")).toHaveTextContent("Updated tower brief");
    expect(screen.getByLabelText("Save status")).not.toHaveTextContent("Saved in this browser");
  });

  it.each(["unavailable", "corrupt"] as const)(
    "does not write after an initial %s storage failure",
    async (code) => {
      vi.mocked(loadWorkspace).mockRejectedValue(
        new WorkspaceStorageError(code, "Saved projects could not be read."),
      );
      const user = userEvent.setup();
      render(<Controls />, { wrapper: SessionProvider });
      await user.click(await screen.findByRole("button", { name: "Make teal" }));
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Existing saved data has not been replaced",
      );
      expect(screen.queryByRole("button", { name: "Retry local save" })).not.toBeInTheDocument();
      expect(saveWorkspaceProject).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Current model")).toHaveTextContent('"colorId":"teal"');
    },
  );

  it("leaves a malformed saved project untouched and offers a backup for ongoing work", async () => {
    vi.mocked(loadWorkspace).mockResolvedValue([
      { id: "blank", version: 8, payload: { format: "unknown" } },
    ]);
    const user = userEvent.setup();
    render(<Controls />, { wrapper: SessionProvider });
    await user.click(await screen.findByRole("button", { name: "Make teal" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The saved copy is untouched");
    expect(screen.getByLabelText("Save status")).toHaveTextContent("Not saved");
    expect(saveWorkspaceProject).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Retry local save" })).not.toBeInTheDocument();
  });
});
