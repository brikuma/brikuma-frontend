// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import { useProjectContext } from "../../src/features/project-brief/project-context";
import { Workspace } from "../../src/features/workspace/workspace";
import { loadScene } from "../../src/fixtures/load-scene";
import type { ProjectId } from "../../src/fixtures/projects";
import type { Model } from "../../src/core/model/public";

const route = vi.hoisted(() => ({ query: "project=blank" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(route.query),
}));
vi.mock("../../src/fixtures/load-scene", () => ({ loadScene: vi.fn() }));

const blank: Model = {
  id: "blank",
  title: "Untitled exploration",
  baselineRevision: "blank-r1",
  revision: "blank-r1",
  instances: [],
  groups: [{ id: "workspace", name: "Free-form workspace", protected: false }],
};
const imported: Model = {
  ...blank,
  id: "garden-study",
  title: "My garden bridge",
  baselineRevision: "garden-r7",
  revision: "garden-r7",
  instances: [
    {
      id: "bridge",
      partId: "demo-brick-2x4",
      colorId: "teal",
      groupId: "workspace",
      transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
    },
  ],
};

beforeEach(() => {
  route.query = "project=blank";
  vi.mocked(loadScene)
    .mockReset()
    .mockImplementation(async (id) => ({
      model:
        id === "blank"
          ? blank
          : {
              ...blank,
              id,
              title: "The courtyard house",
              baselineRevision: "masseria-r4",
              revision: "masseria-r4",
            },
      variant: null,
      instructions: null,
    }));
});
afterEach(cleanup);

function ModelControls() {
  const project = useProject();
  if (!project.model || !project.entry) return <p>Opening model</p>;
  return (
    <>
      <button
        onClick={() =>
          project.command({
            type: "add",
            instance: {
              id: `brick-${project.entry!.session.nextRevision}`,
              partId: "demo-brick-2x4",
              colorId: "teal",
              groupId: "workspace",
              transform: { x: project.model!.instances.length * 4, y: 0.6, z: 0, rotation: 0 },
            },
          })
        }
      >
        Add a test brick
      </button>
      <button onClick={() => project.history("undo")}>Undo test edit</button>
      <button onClick={() => project.replaceModel(imported)}>Load bridge into current slot</button>
    </>
  );
}

function BriefControls({ projectId }: { projectId: ProjectId }) {
  const context = useProjectContext(projectId);
  return (
    <>
      <label>
        Test project subject
        <input
          value={context.brief.subject}
          onChange={(event) =>
            context.setBrief((current) => ({ ...current, subject: event.target.value }))
          }
        />
      </label>
      <button
        onClick={() =>
          context.addReferences([new File(["notes"], "bridge.pdf", { type: "application/pdf" })])
        }
      >
        Add reference metadata
      </button>
      <button onClick={context.clearProjectContext}>Clear test project context</button>
    </>
  );
}

function Routes({ projectId = "blank" }: { projectId?: ProjectId }) {
  const [view, setView] = useState<"workspace" | "model" | "brief">("workspace");
  return (
    <>
      <button onClick={() => setView("workspace")}>Show workspace</button>
      <button onClick={() => setView("model")}>Show model</button>
      <button onClick={() => setView("brief")}>Show brief</button>
      {view === "workspace" && <Workspace />}
      {view === "model" && <ModelControls />}
      {view === "brief" && <BriefControls projectId={projectId} />}
    </>
  );
}

describe("Workspace session discovery", () => {
  it("shows current model quantities and revision after navigation and undo, with shared search and category filters", async () => {
    const user = userEvent.setup();
    render(<Routes />, { wrapper: SessionProvider });
    expect(await screen.findByRole("link", { name: "Start from scratch" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Continue working" })).not.toBeInTheDocument();
    expect(loadScene).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Show model" }));
    await user.click(await screen.findByRole("button", { name: "Add a test brick" }));
    await user.click(screen.getByRole("button", { name: "Add a test brick" }));
    await user.click(screen.getByRole("button", { name: "Show workspace" }));

    const current = screen.getByRole("region", { name: "Continue working" });
    expect(current).toHaveTextContent("2 pieces");
    expect(current).toHaveTextContent("blank-local-2");
    expect(
      within(current).getByRole("link", { name: "Resume Untitled exploration" }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/editor\/?\?project=blank$/));
    expect(screen.getByRole("link", { name: "Continue your model" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit project brief" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Start from scratch" })).not.toBeInTheDocument();

    const search = screen.getByRole("textbox", { name: "Search projects" });
    await user.type(search, "  UNTITLED  ");
    expect(screen.getByRole("link", { name: "Resume Untitled exploration" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open Field rover" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    expect(screen.getByRole("heading", { name: "No projects match yet." })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("link", { name: "Open Field rover" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Free-form" }));
    expect(screen.getByRole("link", { name: "Resume Untitled exploration" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open Field rover" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show model" }));
    await user.click(await screen.findByRole("button", { name: "Undo test edit" }));
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    expect(
      within(screen.getByRole("region", { name: "Continue working" })).getByText("1 piece", {
        exact: true,
      }),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Continue working" })).toHaveTextContent(
      "blank-local-1",
    );
    expect(loadScene).toHaveBeenCalledExactlyOnceWith("blank");
  });

  it("discovers brief-only and reference-only work without loading a scene and removes reverted context", async () => {
    const user = userEvent.setup();
    render(<Routes />, { wrapper: SessionProvider });
    await user.click(await screen.findByRole("button", { name: "Show brief" }));
    await user.type(screen.getByRole("textbox", { name: "Test project subject" }), "A moon garden");
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    const current = screen.getByRole("region", { name: "Continue working" });
    expect(current).toHaveTextContent("A moon garden");
    expect(
      within(current).getByRole("link", { name: "Continue brief for Untitled exploration" }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/new\/?\?project=blank$/));
    expect(screen.getByRole("link", { name: "Continue your brief" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/new\/?\?project=blank$/),
    );
    await user.type(screen.getByRole("textbox", { name: "Search projects" }), "moon garden");
    expect(
      screen.getByRole("link", { name: "Continue brief for Untitled exploration" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show brief" }));
    await user.clear(screen.getByRole("textbox", { name: "Test project subject" }));
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    expect(screen.queryByRole("region", { name: "Continue working" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start from scratch" })).toBeVisible();
    expect(screen.getByRole("link", { name: "New project" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Show brief" }));
    await user.click(screen.getByRole("button", { name: "Add reference metadata" }));
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    expect(
      screen.getByRole("link", { name: "Continue brief for Untitled exploration" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show brief" }));
    await user.click(screen.getByRole("button", { name: "Clear test project context" }));
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    expect(screen.queryByRole("region", { name: "Continue working" })).not.toBeInTheDocument();
    expect(loadScene).not.toHaveBeenCalled();
  });

  it("resumes an imported model by its existing route slot while showing its actual identity and quantities", async () => {
    route.query = "project=masseria";
    const user = userEvent.setup();
    render(<Routes projectId="masseria" />, { wrapper: SessionProvider });
    await user.click(await screen.findByRole("button", { name: "Show model" }));
    await user.click(await screen.findByRole("button", { name: "Load bridge into current slot" }));
    await user.click(screen.getByRole("button", { name: "Show workspace" }));

    const current = screen.getByRole("region", { name: "Continue working" });
    expect(within(current).getByText("1 piece", { exact: true })).toBeVisible();
    expect(current).toHaveTextContent("garden-r7");
    expect(current).toHaveTextContent("Free-form");
    expect(current).not.toHaveTextContent("Architecture");
    expect(within(current).getByRole("link", { name: "Resume My garden bridge" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/editor\/?\?project=masseria$/),
    );
    expect(current).not.toHaveTextContent("The courtyard house");
    expect(
      screen.queryByRole("link", { name: "Open The courtyard house" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Field rover" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start from scratch" })).toBeVisible();
    await user.type(screen.getByRole("textbox", { name: "Search projects" }), "garden bridge");
    expect(screen.getByRole("link", { name: "Resume My garden bridge" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open Field rover" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Architecture" }));
    expect(screen.queryByRole("link", { name: "Resume My garden bridge" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No projects match yet." })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Free-form" }));
    expect(screen.getByRole("link", { name: "Resume My garden bridge" })).toBeVisible();
    await user.clear(screen.getByRole("textbox", { name: "Search projects" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Search projects" }),
      "Limestone walls",
    );
    expect(screen.queryByRole("link", { name: "Resume My garden bridge" })).not.toBeInTheDocument();
    expect(loadScene).toHaveBeenCalledExactlyOnceWith("masseria");
  });

  it("keeps an original sample discoverable by its description after its brief and model are opened", async () => {
    route.query = "project=masseria";
    const user = userEvent.setup();
    render(<Routes projectId="masseria" />, { wrapper: SessionProvider });
    await user.type(
      await screen.findByRole("textbox", { name: "Search projects" }),
      "Limestone walls",
    );
    expect(screen.getByRole("link", { name: "Open The courtyard house" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show brief" }));
    await user.type(screen.getByRole("textbox", { name: "Test project subject" }), "A shaded roof");
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    await user.type(screen.getByRole("textbox", { name: "Search projects" }), "Limestone walls");
    expect(
      screen.getByRole("link", { name: "Continue brief for The courtyard house" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Open The courtyard house" }),
    ).not.toBeInTheDocument();
    expect(loadScene).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Show model" }));
    await screen.findByRole("button", { name: "Add a test brick" });
    await user.click(screen.getByRole("button", { name: "Show workspace" }));
    await user.type(screen.getByRole("textbox", { name: "Search projects" }), "Limestone walls");
    expect(screen.getByRole("link", { name: "Resume The courtyard house" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Open The courtyard house" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Continue working" })).toHaveTextContent(
      "Architecture",
    );
    expect(loadScene).toHaveBeenCalledExactlyOnceWith("masseria");
  });
});
