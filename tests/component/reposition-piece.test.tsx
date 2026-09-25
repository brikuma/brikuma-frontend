// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "../../src/features/editor/workbench";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import {
  deriveBom,
  findStudContacts,
  isBuildPlanCurrent,
  type Model,
} from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";
import { model as blank } from "../../src/fixtures/scenes/blank";
import type {
  ModelViewportProps,
  PlacementPreview,
} from "../../src/features/editor/viewport-types";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("project=blank") }));
vi.mock("../../src/adapters/workspace-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/adapters/workspace-storage")>()),
  loadWorkspace: async () => [],
  saveWorkspaceProject: async (_id: string, _payload: unknown, version: number | null) =>
    (version ?? 0) + 1,
}));
vi.mock("../../src/features/editor/components/model-viewport", () => ({
  ModelViewport: ({ placement, model, onSelect }: ModelViewportProps) => (
    <div>
      <div data-testid="move-preview">{JSON.stringify(placement ?? null)}</div>
      <div data-testid="canonical-model">{JSON.stringify(model)}</div>
      {model.instances.map((part) => (
        <button key={part.id} onClick={() => onSelect(part.id)}>
          Select canvas piece {part.id}
        </button>
      ))}
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

const mixedModel: Model = {
  ...blank,
  title: "Mixed-piece study",
  groups: [
    ...blank.groups,
    { id: "detail", name: "Colored detail", parentId: "workspace", protected: false },
  ],
  instances: [
    {
      id: "support",
      partId: "demo-brick-2x4",
      colorId: "ivory",
      groupId: "workspace",
      transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
    },
    {
      id: "moving",
      partId: "demo-brick-1x2",
      colorId: "teal",
      groupId: "detail",
      transform: { x: 0, y: 1.8, z: 0.5, rotation: 0 },
    },
    {
      id: "other",
      partId: "demo-plate-2x2",
      colorId: "terracotta",
      groupId: "workspace",
      transform: { x: 6, y: 0.2, z: 0, rotation: 0 },
    },
  ],
};

function SessionProbe({ initialModel }: { initialModel: Model }) {
  const project = useProject();
  return (
    <div>
      <button disabled={!project.model} onClick={() => project.replaceModel(initialModel)}>
        Open test model
      </button>
      <button onClick={() => project.generateInstructions()}>Generate test guide</button>
      <div data-testid="model-history">{project.entry?.session.past.length ?? 0}</div>
      <div data-testid="guide-current">
        {project.model && project.draftInstructions
          ? String(isBuildPlanCurrent(project.model, project.draftInstructions.plan))
          : "No guide"}
      </div>
    </div>
  );
}
async function open(initialModel = mixedModel) {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Workbench />
      <SessionProbe initialModel={initialModel} />
    </SessionProvider>,
  );
  await screen.findByTestId("piece-count");
  await user.click(screen.getByRole("button", { name: "Open test model" }));
  await user.click(screen.getByRole("button", { name: "Select canvas piece moving" }));
  return user;
}
function model(): Model {
  return JSON.parse(screen.getByTestId("canonical-model").textContent!);
}
function preview(): PlacementPreview | null {
  return JSON.parse(screen.getByTestId("move-preview").textContent!);
}
async function keys(user: ReturnType<typeof userEvent.setup>, input: string) {
  screen.getByRole("region", { name: "Modeling workspace" }).focus();
  await user.keyboard(input);
}
async function expand(user: ReturnType<typeof userEvent.setup>, title: string) {
  const summary = screen.getByText(title, { exact: true });
  if (!summary.closest("details")?.open) await user.click(summary);
}

describe("Repositioning a placed piece", () => {
  it("previews over the old body, then commits one same-identity move and updates guide compatibility only on Apply", async () => {
    const user = await open();
    const original = model();
    await user.click(screen.getByRole("button", { name: "Generate test guide" }));
    expect(screen.getByTestId("guide-current")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "Move piece" }));
    const region = screen.getByRole("region", { name: "Reposition piece" });
    expect(
      within(region).queryByRole("checkbox", { name: "Repeat placement" }),
    ).not.toBeInTheDocument();
    expect(
      within(region).queryByRole("combobox", { name: "Pending brick color" }),
    ).not.toBeInTheDocument();
    expect(preview()).toMatchObject({
      editing: { instanceId: "moving", baseRevision: original.revision },
      colorId: "teal",
      target: "surface",
    });
    await keys(user, "{ArrowRight}");
    const transform = preview()!.transform;
    expect(transform).toEqual({ ...original.instances[1].transform, x: 1 });
    expect(within(region).getByRole("button", { name: "Apply move" })).toBeEnabled();
    expect(model()).toEqual(original);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    expect(screen.getByTestId("guide-current")).toHaveTextContent("true");
    const moveStatus = screen.getByRole("status");
    expect(moveStatus).toHaveTextContent("Move preview only");
    expect(moveStatus).not.toHaveTextContent("Local change applied");
    await keys(user, "{Enter}");
    const moved = model();
    expect(preview()).toBeNull();
    expect(moved.instances).toHaveLength(original.instances.length);
    expect(moved.instances[1]).toEqual({ ...original.instances[1], transform });
    expect(moved.groups).toEqual(original.groups);
    expect(deriveBom(moved)).toEqual(deriveBom(original));
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^1$/);
    expect(screen.getByTestId("guide-current")).toHaveTextContent("false");
    expect(moveStatus).toHaveTextContent("Piece moved");
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(model()).toEqual(original);
    expect(screen.getByTestId("guide-current")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "Redo local edit" }));
    expect(model()).toEqual(moved);
    expect(screen.getByTestId("guide-current")).toHaveTextContent("false");
  });

  it("previews an odd/even quarter turn on its original support before an explicit Apply", async () => {
    const user = await open();
    const original = model();
    await user.click(screen.getByRole("button", { name: "Rotate 90°" }));
    expect(screen.getByRole("region", { name: "Reposition piece" })).toBeVisible();
    const proposed = preview()!;
    expect(proposed.transform.rotation).toBe(90);
    expect(proposed.transform.y).toBe(original.instances[1].transform.y);
    expect(model()).toEqual(original);
    const definition = partDefinitions.find((part) => part.id === proposed.partId)!;
    const contacts = findStudContacts(
      original,
      partDefinitions,
      definition,
      proposed.transform,
      "moving",
    );
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts.every((contact) => contact.supportId === "support")).toBe(true);
    expect(screen.getByRole("button", { name: "Apply move" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Apply move" }));
    expect(model().instances[1]).toEqual({
      ...original.instances[1],
      transform: proposed.transform,
    });
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^1$/);
  });

  it("returns to the exact source pose after four turns and applying it creates no edit", async () => {
    const user = await open();
    const original = model();
    await keys(user, "r");
    const reposition = within(screen.getByRole("region", { name: "Reposition piece" }));
    for (let turn = 2; turn <= 4; turn++) {
      await user.click(reposition.getByRole("button", { name: "Rotate pending brick" }));
      expect(preview()!.transform.rotation).toBe((turn * 90) % 360);
      expect(model()).toEqual(original);
      expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    }
    expect(preview()!.transform).toEqual(original.instances[1].transform);
    await user.click(reposition.getByRole("button", { name: "Apply move" }));
    expect(preview()).toBeNull();
    expect(model()).toEqual(original);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    expect(screen.getByRole("status")).toHaveTextContent("Position unchanged");
  });

  it.each(["Cancel move", "Escape", "blur"])(
    "discards the proposal through %s without changing the original",
    async (action) => {
      const user = await open();
      const original = model();
      await user.click(screen.getByRole("button", { name: "Move piece" }));
      await keys(user, "{ArrowRight}");
      if (action === "Cancel move")
        await user.click(screen.getByRole("button", { name: "Cancel move" }));
      else if (action === "Escape") await keys(user, "{Escape}");
      else act(() => window.dispatchEvent(new Event("blur")));
      expect(preview()).toBeNull();
      expect(screen.queryByRole("region", { name: "Reposition piece" })).not.toBeInTheDocument();
      expect(model()).toEqual(original);
      expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    },
  );

  it("recovers Attach after a blocked floor preview without replacing the original piece", async () => {
    const user = await open();
    const original = model();
    await user.click(screen.getByRole("button", { name: "Rotate 90°" }));
    const reposition = within(screen.getByRole("region", { name: "Reposition piece" }));
    await user.click(reposition.getByRole("button", { name: "On the floor" }));
    expect(reposition.getByRole("button", { name: "Apply move" })).toBeDisabled();
    expect(screen.getByText(/This position overlaps another piece/)).toBeVisible();
    await keys(user, "{Enter}");
    expect(model()).toEqual(original);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    await user.click(reposition.getByRole("button", { name: "Attach to model" }));
    expect(preview()).toMatchObject({
      target: "surface",
      colorId: "teal",
      transform: { rotation: 90, y: 1.8 },
      editing: { instanceId: "moving" },
    });
    expect(reposition.getByRole("button", { name: "Apply move" })).toBeEnabled();
    await user.click(reposition.getByRole("button", { name: "Apply move" }));
    expect(model().instances.map((part) => part.id)).toEqual(
      original.instances.map((part) => part.id),
    );
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^1$/);
  });

  it("never offers the source itself as an attachment target", async () => {
    const solo: Model = {
      ...mixedModel,
      instances: [{ ...mixedModel.instances[1], transform: { x: 0, y: 0.6, z: 0.5, rotation: 0 } }],
    };
    const user = await open(solo);
    await user.click(screen.getByRole("button", { name: "Move piece" }));
    const reposition = within(screen.getByRole("region", { name: "Reposition piece" }));
    expect(reposition.getByRole("button", { name: "Attach to model" })).toBeDisabled();
    await expand(user, "Advanced placement");
    await user.click(reposition.getByRole("button", { name: "Connect" }));
    const height = reposition.getByRole("spinbutton", { name: "Placement Y" });
    await user.clear(height);
    await user.type(height, "1.44");
    await user.click(reposition.getByRole("button", { name: "Update preview" }));
    expect(reposition.getByRole("button", { name: "Apply move" })).toBeDisabled();
    await keys(user, "{Enter}");
    expect(model()).toEqual(solo);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
  });

  it("retains an unselected collision obstacle and permits an explicit Free draft only after switching policy", async () => {
    const source = {
      ...mixedModel.instances[1],
      transform: { ...mixedModel.instances[1].transform, x: -1 },
    };
    const obstacle = {
      ...mixedModel.instances[1],
      id: "obstacle",
      transform: { ...mixedModel.instances[1].transform, x: 1 },
    };
    const initialModel = { ...mixedModel, instances: [mixedModel.instances[0], source, obstacle] };
    const user = await open(initialModel);
    await user.click(screen.getByRole("button", { name: "Move piece" }));
    const reposition = within(screen.getByRole("region", { name: "Reposition piece" }));
    await keys(user, "{ArrowRight}{ArrowRight}");
    expect(reposition.getByRole("button", { name: "Apply move" })).toBeDisabled();
    await keys(user, "{Enter}");
    expect(model()).toEqual(initialModel);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    await expand(user, "Advanced placement");
    await user.click(reposition.getByRole("button", { name: "Free position" }));
    expect(screen.getByText("Free position · unverified draft")).toBeVisible();
    expect(reposition.getByRole("button", { name: "Apply move" })).toBeEnabled();
    await user.click(reposition.getByRole("button", { name: "Apply move" }));
    expect(model().instances[1].transform).toEqual(obstacle.transform);
    expect(model().instances[2]).toEqual(obstacle);
    expect(deriveBom(model())).toEqual(deriveBom(initialModel));
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^1$/);
  });

  it("locks other inspector edits while a move is pending", async () => {
    const user = await open();
    const original = model();
    const inspector = within(screen.getByRole("complementary", { name: "Project inspector" }));
    await expand(user, "Advanced position");
    await user.click(inspector.getByRole("button", { name: "Move piece" }));
    for (const name of [
      "Duplicate",
      "Rotate 90°",
      "Remove selected part",
      "Apply position",
      "Rotate as draft",
    ])
      expect(inspector.getByRole("button", { name })).toBeDisabled();
    expect(inspector.getByRole("combobox", { name: "Part color" })).toBeDisabled();
    await keys(user, "{Delete}{Control>}d{/Control}");
    expect(model()).toEqual(original);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    expect(screen.getByRole("region", { name: "Reposition piece" })).toBeVisible();
  });

  it("keeps a focused inspection read-only until returning to assembled Build", async () => {
    const user = await open();
    const original = model();
    await user.click(screen.getByRole("button", { name: "Focus lens" }));
    expect(screen.getByRole("button", { name: "Move piece" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate 90°" })).toBeDisabled();
    await keys(user, "r{ArrowRight}{Enter}");
    expect(preview()).toBeNull();
    expect(model()).toEqual(original);
    await user.click(screen.getByRole("button", { name: "Return to assembled Build" }));
    expect(screen.getByRole("button", { name: "Move piece" })).toBeEnabled();
  });

  it("excludes outside-scope supports from the reposition candidate list", async () => {
    const user = await open();
    const original = model();
    await user.click(screen.getByRole("button", { name: "Structure" }));
    await user.click(screen.getByRole("button", { name: "Select Colored detail" }));
    const selection = within(screen.getByRole("region", { name: "Selection commands" }));
    await expand(user, "Group & scope");
    await user.click(selection.getByRole("button", { name: "Enter group" }));
    await user.click(screen.getByRole("button", { name: "Select canvas piece moving" }));
    await user.click(screen.getByRole("button", { name: "Move piece" }));
    const reposition = within(screen.getByRole("region", { name: "Reposition piece" }));
    await expand(user, "Choose a surface from the list");
    const candidates = reposition.getByRole("list", { name: "Connector candidates" });
    expect(within(candidates).queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText(/No eligible targets nearby/)).toBeVisible();
    expect(model()).toEqual(original);
    expect(screen.getByTestId("model-history")).toHaveTextContent(/^0$/);
    await user.click(reposition.getByRole("button", { name: "Cancel move" }));
    expect(model()).toEqual(original);
  });
});
