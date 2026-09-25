// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProjectContextProvider,
  useProjectContext,
  useProjectContexts,
  type ProjectContexts,
} from "../../src/features/project-brief/project-context";
import {
  emptyProjectContext,
  type ProjectContextState,
} from "../../src/adapters/project-context-file";
import { ReferencePicker } from "../../src/features/project-brief/reference-picker";

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const decodeImage = vi.fn();
beforeEach(() => {
  decodeImage.mockReset().mockResolvedValue({ width: 100, height: 100, close: vi.fn() });
  vi.stubGlobal("createImageBitmap", decodeImage);
  let next = 0;
  createObjectURL.mockReset().mockImplementation(() => `blob:restored-${next++}`);
  revokeObjectURL.mockReset();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function restoredContext(subject: string, id = 4): ProjectContextState {
  return {
    ...emptyProjectContext(),
    brief: { ...emptyProjectContext().brief, subject },
    references: [
      {
        id,
        filename: `${subject}.png`,
        type: "image/png",
        size: pngBytes.length,
        blob: new Blob([pngBytes], { type: "image/png" }),
        url: "blob:discard-this-old-url",
        width: 100,
        height: 100,
        validated: true,
      },
    ],
    calibrations: {
      [id]: { first: { x: 0, y: 0 }, second: { x: 50, y: 0 }, length: 4, plane: "XZ" },
    },
  };
}

function Harness() {
  const blank = useProjectContext("blank");
  const rover = useProjectContext("rover");
  const contexts = useProjectContexts();
  return (
    <>
      <output aria-label="Context initialized">{String(contexts.initialized)}</output>
      <output aria-label="Reference preparation error">{blank.referenceError}</output>
      <output aria-label="Blank reference readiness">
        {blank.references
          .map((item) => `${item.id}:${String(item.validated)}:${item.width}x${item.height}`)
          .join(",")}
      </output>
      <output aria-label="Blank reference URLs">
        {blank.references.map((item) => item.url ?? "pending").join(",")}
      </output>
      <output aria-label="Rover reference URLs">
        {rover.references.map((item) => item.url ?? "pending").join(",")}
      </output>
      <output aria-label="Blank subject">{blank.brief.subject}</output>
      <output aria-label="Blank reference IDs">
        {blank.references.map((item) => item.id).join(",")}
      </output>
      <output aria-label="Blank calibration">{Object.keys(blank.calibrations).join(",")}</output>
      <button onClick={() => blank.removeReference(4)}>Remove blank reference</button>
      <button
        onClick={() =>
          blank.addReferences([new File([pngBytes], "next.png", { type: "image/png" })])
        }
      >
        Add another reference
      </button>
      <button
        onClick={() =>
          blank.addReferences([
            new File([pngBytes], "first.png", { type: "image/png" }),
            new File([pngBytes], "second.png", { type: "image/png" }),
          ])
        }
      >
        Add two references
      </button>
      <button
        onClick={() => contexts.replaceProjectContext("blank", restoredContext("Replacement", 20))}
      >
        Replace blank context
      </button>
      <button onClick={() => contexts.clearProjectContext("blank")}>Clear blank context</button>
    </>
  );
}

describe("Restoring local project reference ownership", () => {
  it("creates fresh URLs once in Strict Mode, keeps same IDs in separate slots isolated, and releases resources", async () => {
    const user = userEvent.setup();
    const initialProjects: ProjectContexts = {
      blank: restoredContext("Blank"),
      rover: restoredContext("Rover"),
    };
    const onChange = vi.fn();
    const view = render(
      <StrictMode>
        <ProjectContextProvider initialProjects={initialProjects} onChange={onChange}>
          <Harness />
        </ProjectContextProvider>
      </StrictMode>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Blank reference URLs")).toHaveTextContent("blob:restored-0"),
    );
    expect(screen.getByLabelText("Rover reference URLs")).toHaveTextContent("blob:restored-1");
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Blank calibration")).toHaveTextContent("4");
    await user.click(screen.getByRole("button", { name: "Remove blank reference" }));
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:restored-0");
    expect(screen.getByLabelText("Rover reference URLs")).toHaveTextContent("blob:restored-1");
    expect(screen.getByLabelText("Blank calibration")).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Add another reference" }));
    expect(screen.getByLabelText("Blank reference IDs")).toHaveTextContent(/^5$/);
    const latest = onChange.mock.calls.at(-1)?.[0] as ProjectContexts;
    expect(latest.blank?.references[0].blob).toBeInstanceOf(Blob);
    expect(initialProjects.blank?.references[0].url).toBe("blob:discard-this-old-url");
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(new Set(revokeObjectURL.mock.calls.map(([url]) => url)).size).toBe(3);
  });

  it("replaces one context with fresh ownership and updates allocation past imported identities", async () => {
    const user = userEvent.setup();
    const view = render(
      <ProjectContextProvider
        initialProjects={{ blank: restoredContext("Blank"), rover: restoredContext("Rover") }}
      >
        <Harness />
      </ProjectContextProvider>,
    );
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "Replace blank context" }));
    expect(screen.getByLabelText("Blank subject")).toHaveTextContent("Replacement");
    expect(screen.getByLabelText("Blank reference IDs")).toHaveTextContent(/^20$/);
    expect(screen.getByLabelText("Blank reference URLs")).toHaveTextContent("blob:restored-2");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:restored-0");
    await user.click(screen.getByRole("button", { name: "Add another reference" }));
    expect(screen.getByLabelText("Blank reference IDs")).toHaveTextContent(/^20,21$/);
    await user.click(screen.getByRole("button", { name: "Clear blank context" }));
    expect(screen.getByLabelText("Blank reference URLs")).toBeEmptyDOMElement();
    expect(screen.getByLabelText("Rover reference URLs")).toHaveTextContent("blob:restored-1");
    expect(revokeObjectURL).toHaveBeenCalledTimes(3);
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(4);
  });

  it("validates every uploaded image without a mounted preview and continues when the upload screen leaves", async () => {
    const user = userEvent.setup();
    const completions: ((bitmap: { width: number; height: number; close: () => void }) => void)[] =
      [];
    decodeImage.mockImplementation(() => new Promise((resolve) => completions.push(resolve)));
    const onChange = vi.fn();
    const view = render(
      <ProjectContextProvider onChange={onChange}>
        <Harness />
      </ProjectContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Context initialized")).toHaveTextContent("true"),
    );
    await user.click(screen.getByRole("button", { name: "Add two references" }));
    await waitFor(() => expect(decodeImage).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Blank reference readiness")).toHaveTextContent("0:false:");
    view.rerender(
      <ProjectContextProvider onChange={onChange}>
        <p>Model screen with no reference panel</p>
      </ProjectContextProvider>,
    );
    await act(async () => {
      completions.forEach((resolve) => resolve({ width: 200, height: 100, close: vi.fn() }));
    });
    await waitFor(() => {
      const latest = onChange.mock.calls.at(-1)?.[0] as ProjectContexts;
      expect(latest.blank?.references).toMatchObject([
        { filename: "first.png", validated: true, width: 200, height: 100 },
        { filename: "second.png", validated: true, width: 200, height: 100 },
      ]);
    });
  });

  it("ignores an old decode after the project context is replaced, even when its reference ID is reused", async () => {
    const user = userEvent.setup();
    let finish:
      ((bitmap: { width: number; height: number; close: () => void }) => void) | undefined;
    decodeImage.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    function ReplaceWithSameId() {
      const context = useProjectContext("blank");
      return (
        <button onClick={() => context.replaceProjectContext(restoredContext("Imported", 0))}>
          Import replacement
        </button>
      );
    }
    const onChange = vi.fn();
    render(
      <ProjectContextProvider onChange={onChange}>
        <Harness />
        <ReplaceWithSameId />
      </ProjectContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Context initialized")).toHaveTextContent("true"),
    );
    await user.click(screen.getByRole("button", { name: "Add another reference" }));
    await waitFor(() => expect(decodeImage).toHaveBeenCalledOnce());
    await user.click(screen.getByRole("button", { name: "Import replacement" }));
    const replacement = onChange.mock.calls.at(-1)?.[0] as ProjectContexts;
    const callsBeforeLateDecode = onChange.mock.calls.length;
    await act(async () => finish?.({ width: 900, height: 900, close: vi.fn() }));
    expect(screen.getByLabelText("Blank subject")).toHaveTextContent("Imported");
    expect(screen.getByLabelText("Blank reference readiness")).toHaveTextContent(
      /^0:true:100x100$/,
    );
    expect(onChange).toHaveBeenCalledTimes(callsBeforeLateDecode);
    expect(onChange.mock.calls.at(-1)?.[0]).toBe(replacement);
  });

  it("finishes restoration and retains backup image bytes when preview URL creation is unavailable", async () => {
    createObjectURL.mockImplementation(() => {
      throw new Error("Object URLs unavailable");
    });
    const original = restoredContext("Retained");
    const onChange = vi.fn();
    render(
      <ProjectContextProvider initialProjects={{ blank: original }} onChange={onChange}>
        <Harness />
        <ReferencePicker />
      </ProjectContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Context initialized")).toHaveTextContent("true"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("image data is retained");
    expect(screen.getByLabelText("Blank subject")).toHaveTextContent("Retained");
    expect(screen.getByLabelText("Blank reference URLs")).toHaveTextContent("pending");
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const latest = onChange.mock.calls.at(-1)?.[0] as ProjectContexts;
    expect(latest.blank?.references[0]).toMatchObject({
      blob: original.references[0].blob,
      validated: true,
    });
    expect(latest.blank?.references[0]).not.toHaveProperty("url");
    expect(latest.blank?.calibrations).toEqual(original.calibrations);
  });

  it("does not report a project change when an already measured restored preview loads", async () => {
    const onChange = vi.fn();
    const view = render(
      <ProjectContextProvider
        initialProjects={{ blank: restoredContext("Unchanged") }}
        onChange={onChange}
      >
        <ReferencePicker />
      </ProjectContextProvider>,
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const preview = view.container.querySelector("img");
    if (!preview) throw new Error("Expected restored image preview");
    Object.defineProperties(preview, {
      naturalWidth: { value: 100 },
      naturalHeight: { value: 100 },
    });
    fireEvent.load(preview);
    expect(onChange).toHaveBeenCalledOnce();
  });
});
