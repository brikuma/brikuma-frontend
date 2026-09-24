// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectId } from "../../src/fixtures/projects";
import {
  ProjectContextProvider,
  useProjectContext,
} from "../../src/features/project-brief/project-context";
import { ReferencePicker } from "../../src/features/project-brief/reference-picker";
import {
  EditorReferences,
  useEditorReferences,
} from "../../src/features/editor/components/editor-references";

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();
const OriginalURL = URL;

beforeEach(() => {
  let counter = 0;
  createObjectURL.mockReset().mockImplementation(() => `blob:reference-${counter++}`);
  revokeObjectURL.mockReset();
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

function BriefFields({ projectId }: { projectId: ProjectId }) {
  const { brief, setBrief, clearProjectContext, hasContext } = useProjectContext(projectId);
  return (
    <>
      <label>
        Subject
        <input
          value={brief.subject}
          onChange={(event) => setBrief((current) => ({ ...current, subject: event.target.value }))}
        />
      </label>
      <label>
        Piece limit
        <input
          value={brief.maxPieces}
          onChange={(event) =>
            setBrief((current) => ({ ...current, maxPieces: event.target.value }))
          }
        />
      </label>
      <output aria-label="Context edited">{String(hasContext)}</output>
      <button onClick={clearProjectContext}>Clear project context</button>
      <ReferencePicker projectId={projectId} />
    </>
  );
}

function ReferenceEditor({ projectId }: { projectId: ProjectId }) {
  return <EditorReferences state={useEditorReferences(projectId)} />;
}

function Routes() {
  const [projectId, setProjectId] = useState<ProjectId>("blank");
  const [route, setRoute] = useState("brief");
  return (
    <>
      <button onClick={() => setProjectId("blank")}>Blank project</button>
      <button onClick={() => setProjectId("rover")}>Rover project</button>
      <button onClick={() => setRoute("brief")}>Brief route</button>
      <button onClick={() => setRoute("editor")}>Editor route</button>
      <button onClick={() => setRoute("other")}>Another route</button>
      {route === "brief" && <BriefFields key={projectId} projectId={projectId} />}
      {route === "editor" && <ReferenceEditor key={projectId} projectId={projectId} />}
    </>
  );
}

describe("Project context continuity", () => {
  it("keeps brief intent and an empty limit across routes, isolates projects, and clears on session replacement", async () => {
    const user = userEvent.setup();
    const view = render(<Routes />, { wrapper: ProjectContextProvider });
    expect(screen.getByLabelText("Context edited")).toHaveTextContent("false");
    await user.type(screen.getByLabelText("Subject"), "A quiet courtyard");
    await user.clear(screen.getByLabelText("Piece limit"));
    expect(screen.getByLabelText("Context edited")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "Another route" }));
    await user.click(screen.getByRole("button", { name: "Brief route" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("A quiet courtyard");
    expect(screen.getByLabelText("Piece limit")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.getByLabelText("Piece limit")).toHaveValue("500");
    await user.type(screen.getByLabelText("Subject"), "A lunar rover");
    await user.click(screen.getByRole("button", { name: "Blank project" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("A quiet courtyard");
    await user.click(screen.getByRole("button", { name: "Clear project context" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.getByLabelText("Context edited")).toHaveTextContent("false");
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("A lunar rover");
    view.unmount();
    render(<Routes />, { wrapper: ProjectContextProvider });
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("");
  });

  it("shares image and PDF metadata between routes and retains declared scale until explicit removal", async () => {
    const user = userEvent.setup();
    const view = render(<Routes />, { wrapper: ProjectContextProvider });
    await user.upload(screen.getByLabelText("Choose reference files"), [
      new File(["image"], "courtyard.png", { type: "image/png" }),
      new File(["pdf"], "notes.pdf", { type: "application/pdf" }),
    ]);
    expect(createObjectURL).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Editor route" }));
    expect(revokeObjectURL).not.toHaveBeenCalled();
    const image = screen.getByRole("img", { name: "Pinned reference: courtyard.png" });
    Object.defineProperties(image, {
      naturalWidth: { value: 200 },
      naturalHeight: { value: 100 },
    });
    fireEvent.load(image);
    await user.click(screen.getByText("Manual reference scale"));
    const calibrationValues = [
      ["Anchor A X (px)", "20"],
      ["Anchor A Y (px)", "10"],
      ["Anchor B X (px)", "140"],
      ["Anchor B Y (px)", "100"],
      ["Known length (studs)", "12"],
    ];
    for (const [label, value] of calibrationValues) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), value);
    }
    await user.selectOptions(screen.getByLabelText("Declared alignment"), "XY");
    await user.click(screen.getByRole("button", { name: "Declare scale" }));
    expect(screen.getByRole("status")).toHaveTextContent("0.08000 studs per pixel · XY");
    await user.click(screen.getByRole("button", { name: "notes.pdf" }));
    expect(screen.getByText(/PDF · filename only, not parsed/)).toBeVisible();
    expect(screen.queryByText("Manual reference scale")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Another route" }));
    await user.click(screen.getByRole("button", { name: "Editor route" }));
    expect(screen.getByRole("status")).toHaveTextContent("0.08000 studs per pixel · XY");
    await user.click(screen.getByText("Manual reference scale"));
    for (const [label, value] of calibrationValues)
      expect(screen.getByLabelText(label)).toHaveValue(value);
    expect(screen.getByLabelText("Declared alignment")).toHaveValue("XY");
    await user.selectOptions(screen.getByLabelText("Declared alignment"), "YZ");
    await user.click(screen.getByRole("button", { name: "Declare scale" }));
    expect(screen.getByRole("status")).toHaveTextContent("0.08000 studs per pixel · YZ");
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("notes.pdf")).not.toBeInTheDocument();
    await user.upload(
      screen.getByLabelText("Choose local images"),
      new File(["image"], "rover.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Blank project" }));
    await user.click(screen.getByRole("button", { name: "Brief route" }));
    expect(screen.getByText("notes.pdf")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Remove courtyard.png" }));
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:reference-0");
    await user.click(screen.getByRole("button", { name: "Editor route" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    expect(screen.getByRole("img", { name: "Pinned reference: rover.png" })).toBeVisible();
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenLastCalledWith("blob:reference-1");
  });

  it("keeps unsubmitted calibration edits with their own reference when changing the active image", async () => {
    const user = userEvent.setup();
    render(<ReferenceEditor projectId="blank" />, { wrapper: ProjectContextProvider });
    await user.upload(screen.getByLabelText("Choose local images"), [
      new File(["image"], "wall.png", { type: "image/png" }),
      new File(["image"], "roof.png", { type: "image/png" }),
    ]);
    await user.click(screen.getByText("Manual reference scale"));
    await user.clear(screen.getByLabelText("Known length (studs)"));
    await user.type(screen.getByLabelText("Known length (studs)"), "7");
    await user.selectOptions(screen.getByLabelText("Declared alignment"), "XY");
    await user.click(screen.getByRole("button", { name: "wall.png" }));
    expect(screen.getByLabelText("Known length (studs)")).toHaveValue("1");
    expect(screen.getByLabelText("Declared alignment")).toHaveValue("XZ");
    await user.clear(screen.getByLabelText("Known length (studs)"));
    await user.type(screen.getByLabelText("Known length (studs)"), "3");
    await user.click(screen.getByRole("button", { name: "roof.png" }));
    expect(screen.getByLabelText("Known length (studs)")).toHaveValue("7");
    expect(screen.getByLabelText("Declared alignment")).toHaveValue("XY");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("enforces the shared six-file limit even for consecutive additions in Strict Mode and clears only the selected project", async () => {
    function RapidAdd() {
      const context = useProjectContext("blank");
      return (
        <button
          onClick={() => {
            const files = Array.from(
              { length: 4 },
              (_, index) => new File(["image"], `image-${index}.png`, { type: "image/png" }),
            );
            context.addReferences(files);
            context.addReferences(files);
          }}
        >
          Add consecutive batches
        </button>
      );
    }
    const user = userEvent.setup();
    const view = render(
      <StrictMode>
        <ProjectContextProvider>
          <RapidAdd />
          <Routes />
        </ProjectContextProvider>
      </StrictMode>,
    );
    await user.click(screen.getByRole("button", { name: "Add consecutive batches" }));
    expect(screen.getAllByRole("img")).toHaveLength(6);
    expect(createObjectURL).toHaveBeenCalledTimes(6);
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    await user.upload(
      screen.getByLabelText("Choose reference files"),
      new File(["image"], "rover.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Blank project" }));
    await user.click(screen.getByRole("button", { name: "Clear project context" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledTimes(6);
    await user.click(screen.getByRole("button", { name: "Rover project" }));
    expect(screen.getByRole("img", { name: "rover.png" })).toBeVisible();
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(7);
    expect(new Set(revokeObjectURL.mock.calls.map(([url]) => url)).size).toBe(7);
  });
});
