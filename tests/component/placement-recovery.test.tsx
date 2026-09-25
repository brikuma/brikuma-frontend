// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "../../src/features/editor/workbench";
import { SessionProvider, useProject } from "../../src/features/editor/state/session";
import { findStudContacts, type Model } from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";
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
  ModelViewport: ({ placement, model }: ModelViewportProps) => (
    <div>
      <div data-testid="placement-preview">{JSON.stringify(placement)}</div>
      <div data-testid="rendered-model">{JSON.stringify(model)}</div>
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
afterEach(() => cleanup());

function HistoryProbe() {
  const { entry } = useProject();
  return <div data-testid="undo-count">{entry?.session.past.length ?? 0}</div>;
}

async function openWorkbench() {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Workbench />
      <HistoryProbe />
    </SessionProvider>,
  );
  expect(await screen.findByTestId("piece-count")).toHaveTextContent(/^0$/);
  return user;
}
function preview(): PlacementPreview {
  return JSON.parse(screen.getByTestId("placement-preview").textContent!);
}
function model(): Model {
  return JSON.parse(screen.getByTestId("rendered-model").textContent!);
}
async function quarterTurn(user: ReturnType<typeof userEvent.setup>, keyboard: boolean) {
  if (keyboard) {
    screen.getByRole("region", { name: "Modeling workspace" }).focus();
    await user.keyboard("r");
  } else await user.click(screen.getByRole("button", { name: "Rotate pending brick" }));
}

describe("Recovering and rotating a pending brick", () => {
  it.each(["Brick 1 × 2", "Brick 1 × 3", "Brick 2 × 3", "Brick 2 × 4", "Plate 1 × 2"])(
    "keeps %s placeable through four floor turns without moving the original preview or editing history",
    async (name) => {
      const user = await openWorkbench();
      const originalModel = model();
      await user.click(screen.getByRole("button", { name: `Add ${name}` }));
      const initial = preview();
      const pending = screen.getByRole("region", { name: "Pending brick placement" });
      expect(within(pending).getByRole("button", { name: "Place brick" })).toBeEnabled();
      for (let turn = 1; turn <= 4; turn++) {
        await quarterTurn(user, turn % 2 === 0);
        expect(preview().transform.rotation).toBe((turn * 90) % 360);
        expect(within(pending).getByRole("button", { name: "Place brick" })).toBeEnabled();
        expect(model()).toEqual(originalModel);
        expect(screen.getByTestId("undo-count")).toHaveTextContent(/^0$/);
        expect(screen.getByRole("button", { name: "Undo local edit" })).toBeDisabled();
      }
      expect(preview()).toEqual(initial);
      expect(screen.getByText("Advanced placement").closest("details")).not.toHaveAttribute("open");
      await user.click(within(pending).getByRole("button", { name: "Place brick" }));
      expect(model().instances).toHaveLength(1);
      expect(model().instances[0].transform).toEqual(initial.transform);
      expect(screen.getByTestId("undo-count")).toHaveTextContent(/^1$/);
      await user.click(screen.getByRole("button", { name: "Undo local edit" }));
      expect(model()).toEqual(originalModel);
    },
  );

  it("rotates an attached rectangular brick on the same support and at the same height", async () => {
    const user = await openWorkbench();
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 6" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    const originalModel = model();
    const supportId = originalModel.instances[0].id;
    await user.click(screen.getByRole("button", { name: "Add Brick 1 × 2" }));
    const initial = preview();
    const definition = partDefinitions.find((part) => part.id === initial.partId)!;
    expect(initial.target).toBe("surface");
    for (let turn = 1; turn <= 4; turn++) {
      await quarterTurn(user, turn % 2 === 0);
      const current = preview();
      expect(current.transform.y).toBe(initial.transform.y);
      expect(current.transform.rotation).toBe((turn * 90) % 360);
      expect(current.target).toBe("surface");
      const contacts = findStudContacts(
        originalModel,
        partDefinitions,
        definition,
        current.transform,
      );
      expect(contacts.length).toBeGreaterThan(0);
      expect(contacts.every((contact) => contact.supportId === supportId)).toBe(true);
      expect(screen.getByRole("button", { name: "Place brick" })).toBeEnabled();
      expect(model()).toEqual(originalModel);
      expect(screen.getByTestId("undo-count")).toHaveTextContent(/^1$/);
    }
    expect(preview()).toEqual(initial);
  });

  it("recovers from an overlapping floor preview by attaching again with its chosen color and turn", async () => {
    const user = await openWorkbench();
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 6" }));
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    const originalModel = model();
    await user.click(screen.getByRole("button", { name: "Add Brick 1 × 2" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Pending brick color" }),
      "terracotta",
    );
    await quarterTurn(user, false);
    const attached = preview();
    await user.click(screen.getByRole("button", { name: "On the floor" }));
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    expect(screen.getByText(/This position overlaps another piece/)).toBeVisible();
    expect(model()).toEqual(originalModel);
    expect(screen.getByTestId("undo-count")).toHaveTextContent(/^1$/);

    await user.click(screen.getByRole("button", { name: "Attach to model" }));
    const recovered = preview();
    expect(recovered).toMatchObject({
      target: "surface",
      colorId: "terracotta",
      transform: { rotation: 90, y: attached.transform.y },
    });
    expect(screen.getByRole("button", { name: "Place brick" })).toBeEnabled();
    expect(screen.getByText(/studs? aligned/)).toBeVisible();
    expect(screen.getByText("Advanced placement").closest("details")).not.toHaveAttribute("open");
    expect(model()).toEqual(originalModel);
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(model().instances).toHaveLength(2);
    expect(model().instances[1]).toMatchObject({
      colorId: "terracotta",
      transform: recovered.transform,
    });
    expect(screen.getByTestId("undo-count")).toHaveTextContent(/^2$/);
    await user.click(screen.getByRole("button", { name: "Undo local edit" }));
    expect(model()).toEqual(originalModel);
    expect(screen.getByTestId("undo-count")).toHaveTextContent(/^1$/);
  });

  it.each(["buttons", "keyboard"])(
    "announces the current undo/redo result after duplication using %s",
    async (controls) => {
      const user = await openWorkbench();
      await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
      await user.click(screen.getByRole("button", { name: "Place brick" }));
      const originalModel = model();
      await user.click(screen.getByRole("button", { name: "Duplicate" }));
      const duplicated = model();
      expect(duplicated.instances).toHaveLength(2);
      expect(screen.getByRole("status")).toHaveTextContent("duplicated as a draft");
      if (controls === "keyboard") {
        screen.getByRole("region", { name: "Modeling workspace" }).focus();
        await user.keyboard("{Control>}z{/Control}");
      } else await user.click(screen.getByRole("button", { name: "Undo local edit" }));
      expect(model()).toEqual(originalModel);
      expect(screen.getByRole("status")).toHaveTextContent(/^Change undone\.$/);
      if (controls === "keyboard") await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
      else await user.click(screen.getByRole("button", { name: "Redo local edit" }));
      expect(model()).toEqual(duplicated);
      expect(screen.getByRole("status")).toHaveTextContent(/^Change restored\.$/);
    },
  );
});
