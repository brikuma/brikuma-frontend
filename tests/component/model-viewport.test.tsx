// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelViewport } from "../../src/features/editor/components/model-viewport";
import type {
  CameraView,
  ModelViewportProps,
  PlacementPreview,
  ViewportTool,
} from "../../src/features/editor/viewport-types";

vi.mock("next/dynamic", () => ({
  default: () =>
    function Scene({
      view,
      tool,
      model,
      inspectionPartId,
      fitRequest,
      assemblyMode,
      assemblyAmount,
      exploded,
      projection,
      rotationPreview,
      placement,
      fitSelection,
      selected,
      selectedIds,
    }: ModelViewportProps & {
      view: CameraView;
      tool: ViewportTool;
      inspectionPartId: string | null;
      fitRequest: number;
      assemblyMode: string;
      assemblyAmount: number;
      exploded: boolean;
      projection: string;
      rotationPreview: number | null;
      fitSelection: boolean;
    }) {
      return (
        <div>
          <div data-testid="scene-camera">{`${view} · ${tool}`}</div>
          <div data-testid="scene-projection">{projection}</div>
          <div data-testid="scene-rotation-preview">{rotationPreview ?? "No rotation preview"}</div>
          <div data-testid="scene-inspection">{inspectionPartId ?? "Complete model"}</div>
          <div data-testid="scene-model-count">{model.instances.length}</div>
          <div data-testid="scene-fit-request">{fitRequest}</div>
          <div data-testid="scene-fit-target">
            {fitSelection ? (selectedIds ?? [selected]).join(",") : "Visible model"}
          </div>
          <div data-testid="scene-placement-rotation">
            {placement?.transform.rotation ?? "No placement"}
          </div>
          <div data-testid="scene-assembly">
            {exploded ? `${assemblyMode} ${assemblyAmount}` : "Assembled"}
          </div>
        </div>
      );
    },
}));

beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

describe("Specialist camera and rotation controls", () => {
  it("UX-KEY-001: placement R belongs to the parent and never cancels or commits the ghost", async () => {
    const user = userEvent.setup();
    const props = { ...selectedViewportProps(), onRotate: vi.fn(() => true) };
    function PlacementOwner() {
      const [pending, setPending] = useState<PlacementPreview | null>(placement);
      return (
        <div
          onKeyDown={(event) => {
            if (!event.defaultPrevented && event.key.toLowerCase() === "r" && pending) {
              event.preventDefault();
              setPending({ ...pending, transform: { ...pending.transform, rotation: 90 } });
            }
          }}
        >
          <ModelViewport
            {...props}
            placement={pending}
            onCancelPlacement={() => {
              props.onCancelPlacement?.();
              setPending(null);
            }}
          />
        </div>
      );
    }
    render(<PlacementOwner />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    fireEvent.keyDown(screen.getByTestId("model-viewport"), { key: "r" });
    expect(screen.getByTestId("scene-placement-rotation")).toHaveTextContent("90");
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    expect(props.onCancelPlacement).not.toHaveBeenCalled();
    expect(props.onRotate).not.toHaveBeenCalled();
    expect(props.model.instances).toHaveLength(2);
  });

  it("UX-KEY-002: Escape cancels one owned transient and consumes the key only when handled", async () => {
    const user = userEvent.setup();
    const parent = vi.fn();
    const props = {
      ...selectedViewportProps(),
      onRotate: vi.fn(() => true),
      onCancelPlacement: vi.fn(),
    };
    render(
      <div onKeyDown={parent}>
        <ModelViewport {...props} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    await user.click(screen.getByRole("button", { name: "Select through" }));
    await user.click(screen.getByRole("button", { name: "Rotate tool" }));
    await user.click(screen.getByRole("button", { name: "Preview +90°" }));
    props.onCancelPlacement.mockClear();
    fireEvent.keyDown(screen.getByTestId("model-viewport"), { key: "Escape" });
    expect(screen.getByTestId("scene-rotation-preview")).toHaveTextContent("No rotation preview");
    expect(screen.getByRole("button", { name: "Select through" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(parent).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId("model-viewport"), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Select through" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(parent).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId("model-viewport"), { key: "Escape" });
    expect(parent).toHaveBeenCalledOnce();
    expect(props.onRotate).not.toHaveBeenCalled();
    expect(props.onCancelPlacement).not.toHaveBeenCalled();
  });

  it("UX-KEY-003: numbered views are scoped, consume their event and leave the document untouched", async () => {
    const user = userEvent.setup();
    const parent = vi.fn();
    const props = selectedViewportProps();
    const before = structuredClone(props.model);
    render(
      <div onKeyDown={parent}>
        <ModelViewport {...props} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    const viewport = screen.getByTestId("model-viewport");
    for (const [key, name] of [
      ["1", "front"],
      ["2", "right"],
      ["3", "top"],
      ["0", "iso"],
    ]) {
      fireEvent.keyDown(viewport, { key });
      expect(screen.getByTestId("scene-camera")).toHaveTextContent(`${name} · select`);
    }
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("4");
    expect(parent).not.toHaveBeenCalled();
    for (const modifier of ["ctrlKey", "metaKey", "altKey"])
      fireEvent.keyDown(viewport, { key: "1", [modifier]: true });
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    expect(props.model).toEqual(before);
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it("UX-KEY-004: text descendants and consumed events do not trigger viewport shortcuts", async () => {
    const user = userEvent.setup();
    const props = { ...selectedViewportProps(), onRotate: vi.fn(() => true) };
    render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    const viewport = screen.getByTestId("model-viewport");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const text = document.createElement("span");
    editable.append(text);
    viewport.append(editable);
    for (const target of [text, screen.getByRole("combobox", { name: "Camera projection" })]) {
      for (const key of ["1", "g", "r", "Escape"]) fireEvent.keyDown(target, { key });
    }
    const consumed = document.createElement("button");
    consumed.addEventListener("keydown", (event) => event.preventDefault());
    viewport.append(consumed);
    fireEvent.keyDown(consumed, { key: "1" });
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("0");
    expect(props.onCancelPlacement).not.toHaveBeenCalled();
  });

  it("UX-KEY-005: dialog Escape closes only the dialog and preserves the underlying rotation preview", async () => {
    const user = userEvent.setup();
    render(<ModelViewport {...selectedViewportProps()} onRotate={vi.fn(() => true)} />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    await user.click(screen.getByRole("button", { name: "Rotate tool" }));
    await user.click(screen.getByRole("button", { name: "Preview +90°" }));
    const region = screen.getByRole("region", { name: "Interactive brick model: Untitled model" });
    fireEvent(
      region,
      new MouseEvent("pointerdown", { bubbles: true, button: 2, clientX: 10, clientY: 10 }),
    );
    fireEvent(
      region,
      new MouseEvent("pointerup", { bubbles: true, button: 2, clientX: 10, clientY: 10 }),
    );
    const dialog = screen.getByRole("dialog", { name: "Context commands" });
    fireEvent.keyDown(dialog, { key: "3" });
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · rotate");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Context commands" })).not.toBeInTheDocument();
    expect(screen.getByTestId("scene-rotation-preview")).toHaveTextContent("90");
  });

  it("UX-KEY-006: explicit tool requests are single-use and mutation tools stay disabled outside Build", async () => {
    const user = userEvent.setup();
    const props = { ...selectedViewportProps(), onRotate: vi.fn(() => true) };
    const { rerender } = render(
      <ModelViewport {...props} toolRequest={{ serial: 0, tool: "move" }} />,
    );
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    rerender(<ModelViewport {...props} toolRequest={{ serial: 1, tool: "move" }} />);
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · move");
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("0");
    rerender(
      <ModelViewport {...props} mode="inspect" toolRequest={{ serial: 2, tool: "rotate" }} />,
    );
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    fireEvent.keyDown(screen.getByTestId("model-viewport"), { key: "g" });
    fireEvent.keyDown(screen.getByTestId("model-viewport"), { key: "r" });
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    rerender(<ModelViewport {...props} mode="build" toolRequest={{ serial: 2, tool: "rotate" }} />);
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    expect(props.onMove).not.toHaveBeenCalled();
    expect(props.onRotate).not.toHaveBeenCalled();
  });

  it("UX-KEY-007: focus requests use the current selection exactly once; selection alone never reframes", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const { rerender } = render(<ModelViewport {...props} focusRequest={0} />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    rerender(<ModelViewport {...props} selected="brick-2" focusRequest={0} />);
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("0");
    rerender(
      <ModelViewport
        {...props}
        selected="brick-2"
        selectedIds={["brick-1", "brick-2"]}
        focusRequest={1}
      />,
    );
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("1");
    expect(screen.getByTestId("scene-fit-target")).toHaveTextContent("brick-1,brick-2");
    rerender(<ModelViewport {...props} selected="brick-1" focusRequest={1} />);
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("1");
    rerender(<ModelViewport {...props} selected={null} selectedIds={[]} focusRequest={2} />);
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("2");
    expect(screen.getByTestId("scene-fit-target")).toHaveTextContent("Visible model");
  });

  it.each(["ground", "free"] as const)(
    "UX-KEY-008: %s placement uses shared policy wording without a validation-success color",
    (target) => {
      render(<ModelViewport {...viewportProps()} placement={{ ...placement, target }} />);
      expect(screen.getByText(target === "ground" ? /· Grid$/ : /· Free position$/)).toBeVisible();
      expect(screen.getByLabelText("Placement feedback")).not.toHaveClass("text-success");
      expect(screen.getByLabelText("Placement feedback")).toHaveClass(
        target === "free" ? "text-warning" : "text-muted-foreground",
      );
    },
  );
  it("EDT-036: compact controls collapse optional tools without removing the single renderer or essential tools", async () => {
    const user = userEvent.setup();
    const props = { ...selectedViewportProps(), onRotate: vi.fn(() => true) };
    const { rerender } = render(<ModelViewport {...props} compactControls />);
    expect(screen.getByText("Camera & view options").closest("details")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByText("View tools").closest("details")).not.toHaveAttribute("open");
    for (const label of ["Select tool", "Move tool", "Rotate tool"])
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    await user.click(screen.getByText("Camera & view options"));
    expect(screen.getByRole("combobox", { name: "Camera projection" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    expect(screen.getAllByTestId("scene-camera")).toHaveLength(1);
    rerender(<ModelViewport {...props} compactControls={false} />);
    expect(screen.getByRole("combobox", { name: "Render quality" })).toBeVisible();
    expect(screen.getAllByTestId("scene-camera")).toHaveLength(1);
  });
  it("EDT-015/028: an early native contextmenu event cannot open a dialog during a secondary drag", () => {
    render(<ModelViewport {...selectedViewportProps()} />);
    const region = screen.getByRole("region", { name: "Interactive brick model: Untitled model" });
    fireEvent(
      region,
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 2,
        buttons: 2,
        clientX: 10,
        clientY: 10,
      }),
    );
    fireEvent.contextMenu(region, { button: 2 });
    expect(screen.queryByRole("dialog", { name: "Context commands" })).not.toBeInTheDocument();
    fireEvent(
      region,
      new MouseEvent("pointermove", { bubbles: true, buttons: 2, clientX: 20, clientY: 10 }),
    );
    fireEvent(
      region,
      new MouseEvent("pointerup", { bubbles: true, button: 2, clientX: 20, clientY: 10 }),
    );
    expect(screen.queryByRole("dialog", { name: "Context commands" })).not.toBeInTheDocument();
    fireEvent(
      region,
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 2,
        buttons: 2,
        clientX: 20,
        clientY: 10,
      }),
    );
    fireEvent.contextMenu(region, { button: 2 });
    fireEvent(
      region,
      new MouseEvent("pointerup", { bubbles: true, button: 2, clientX: 20, clientY: 10 }),
    );
    expect(screen.getByRole("dialog", { name: "Context commands" })).toBeVisible();
  });
  it("EDT-027: projection preference is inherited on first mode entry and restored per mode", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const { rerender } = render(<ModelViewport {...props} mode="build" />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Camera projection" }),
      "perspective",
    );
    rerender(<ModelViewport {...props} mode="present" />);
    expect(screen.getByTestId("scene-projection")).toHaveTextContent("perspective");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Camera projection" }),
      "orthographic",
    );
    rerender(<ModelViewport {...props} mode="build" />);
    expect(screen.getByTestId("scene-projection")).toHaveTextContent("perspective");
    rerender(<ModelViewport {...props} mode="present" />);
    expect(screen.getByTestId("scene-projection")).toHaveTextContent("orthographic");
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it("EDT-021: quarter-turn preview commits once and rejects a stale revision", async () => {
    const user = userEvent.setup();
    const props = { ...selectedViewportProps(), onRotate: vi.fn(() => true) };
    const { rerender } = render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    await user.click(screen.getByRole("button", { name: "Rotate tool" }));
    await user.click(screen.getByRole("button", { name: "Preview +90°" }));
    expect(screen.getByTestId("scene-rotation-preview")).toHaveTextContent("90");
    expect(props.onRotate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Apply rotation" }));
    expect(props.onRotate).toHaveBeenCalledExactlyOnceWith("brick-1", 90);
    await user.click(screen.getByRole("button", { name: "Preview −90°" }));
    rerender(<ModelViewport {...props} model={{ ...props.model, revision: "changed-r2" }} />);
    expect(screen.getByTestId("scene-rotation-preview")).toHaveTextContent("No rotation preview");
    expect(screen.getByRole("button", { name: "Apply rotation" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByText("Choose a quarter-turn preview")).toBeVisible();
  });

  it("EDT-026: an explicit assembled reset closes inspection even when Build was already active", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const lock = vi.fn();
    const { rerender } = render(
      <ModelViewport
        {...props}
        mode="build"
        assembledResetRequest={0}
        onEditingLockChange={lock}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Inspect selected brick" }));
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("brick-1");
    rerender(
      <ModelViewport
        {...props}
        mode="build"
        assembledResetRequest={1}
        onEditingLockChange={lock}
      />,
    );
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
    expect(lock).toHaveBeenLastCalledWith(false);
  });

  it("EDT-026: inspection editing lock is released on return to assembled view", async () => {
    const user = userEvent.setup();
    const lock = vi.fn();
    render(<ModelViewport {...selectedViewportProps()} onEditingLockChange={lock} />);
    expect(lock).toHaveBeenLastCalledWith(false);
    await user.click(screen.getByRole("button", { name: "Inspect selected brick" }));
    expect(lock).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole("button", { name: "Exit brick inspection" }));
    expect(lock).toHaveBeenLastCalledWith(false);
  });
});

function selectedViewportProps(): ModelViewportProps {
  const props = viewportProps();
  return {
    ...props,
    selected: "brick-1",
    model: {
      ...props.model,
      groups: [{ id: "base", name: "Base", protected: false }],
      instances: [
        {
          id: "brick-1",
          partId: "demo-brick-2x4",
          colorId: "ivory",
          groupId: "base",
          transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
        },
        {
          id: "brick-2",
          partId: "demo-brick-2x4",
          colorId: "ivory",
          groupId: "base",
          transform: { x: 4, y: 0.6, z: 0, rotation: 0 },
        },
      ],
    },
  };
}

describe("Selected brick inspection", () => {
  it("requires an existing selected brick", () => {
    const props = viewportProps();
    const { rerender } = render(<ModelViewport {...props} />);
    expect(screen.getByRole("button", { name: "Inspect selected brick" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Inspect selected brick" })).toHaveAttribute(
      "title",
      "Select a brick to inspect its underside",
    );
    rerender(<ModelViewport {...props} selected="missing-brick" />);
    expect(screen.getByRole("button", { name: "Inspect selected brick" })).toBeDisabled();
  });

  it("isolates through one existing scene, keeps the model intact and fits again on exit", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const originalModel = structuredClone(props.model);
    render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Inspect selected brick" }));
    expect(screen.getAllByTestId("scene-camera")).toHaveLength(1);
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("brick-1");
    expect(screen.getByTestId("scene-model-count")).toHaveTextContent("2");
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Inspect selected brick" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Inspecting one brick · drag to view underneath")).toBeVisible();
    expect(screen.getByRole("button", { name: "Show workspace grid" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Exit brick inspection" }));
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
    expect(screen.getByTestId("scene-fit-request")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Show workspace grid" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Exit brick inspection" })).not.toBeInTheDocument();
    expect(props.model).toEqual(originalModel);
    expect(props.onMove).not.toHaveBeenCalled();
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it.each(["Select tool", "Move tool"])(
    "returns to the complete model before using %s",
    async (label) => {
      const user = userEvent.setup();
      render(<ModelViewport {...selectedViewportProps()} />);
      await user.click(screen.getByRole("button", { name: "Inspect selected brick" }));
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
      expect(screen.getByTestId("scene-camera")).toHaveTextContent(
        label === "Move tool" ? "iso · move" : "iso · select",
      );
      expect(screen.getByRole("button", { name: "Inspect selected brick" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    },
  );

  it("ends inspection when placement starts and does not reenter when placement ends", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const { rerender } = render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Inspect selected brick" }));
    rerender(<ModelViewport {...props} placement={placement} />);
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
    expect(screen.getByRole("button", { name: "Inspect selected brick" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    rerender(<ModelViewport {...props} />);
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
    expect(screen.getByTestId("scene-model-count")).toHaveTextContent("2");
  });

  it("ends inspection when its selection is removed", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const { rerender } = render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Inspect selected brick" }));
    rerender(<ModelViewport {...props} selected={null} />);
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
    expect(screen.getByRole("button", { name: "Inspect selected brick" })).toBeDisabled();
    rerender(<ModelViewport {...props} />);
    expect(screen.getByTestId("scene-inspection")).toHaveTextContent("Complete model");
  });
});

describe("Authored assembly presentation", () => {
  it("does not scatter a free-form model without defined modules", () => {
    render(<ModelViewport {...selectedViewportProps()} />);
    expect(screen.getByRole("button", { name: "Exploded view" })).toBeDisabled();
  });

  it("separates roof access from assembly, scales separation and restores the unchanged model", async () => {
    const user = userEvent.setup();
    const props = selectedViewportProps();
    const before = structuredClone(props.model);
    props.assemblyView = {
      modelId: props.model.id,
      baselineRevision: props.model.baselineRevision,
      fixedPartIds: ["brick-1"],
      modules: [
        {
          id: "roof",
          name: "Complete roof",
          description: "Roof",
          partIds: ["brick-2"],
          offset: { x: 0, y: 4, z: 0 },
          views: ["roof", "modules"],
        },
      ],
    };
    render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Roof access" }));
    expect(screen.getByTestId("scene-assembly")).toHaveTextContent("roof 1");
    expect(screen.getByRole("button", { name: "Move tool" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show dimensions" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Exploded view" }));
    expect(screen.getByTestId("scene-assembly")).toHaveTextContent("modules 0.7");
    fireEvent.change(screen.getByRole("slider", { name: "Assembly separation" }), {
      target: { value: "100" },
    });
    expect(screen.getByTestId("scene-assembly")).toHaveTextContent("modules 1");
    await user.click(screen.getByRole("button", { name: "Reassemble" }));
    expect(screen.getByTestId("scene-assembly")).toHaveTextContent("Assembled");
    expect(screen.getByRole("button", { name: "Move tool" })).toBeEnabled();
    expect(props.model).toEqual(before);
    expect(props.onMove).not.toHaveBeenCalled();
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function viewportProps(): ModelViewportProps {
  return {
    model: {
      id: "blank",
      title: "Untitled model",
      baselineRevision: "blank-r1",
      revision: "blank-r1",
      instances: [],
      groups: [],
    },
    selected: null,
    onSelect: vi.fn(),
    hidden: [],
    onMove: vi.fn(() => true),
    onCancelPlacement: vi.fn(),
  };
}

const placement: PlacementPreview = {
  partId: "demo-brick-2x4",
  colorId: "ivory",
  transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
};

describe("Horizontal-grid editing camera", () => {
  it.each(["Front", "Right"])(
    "uses Isometric when placement starts from %s and prevents elevation selection",
    async (elevation) => {
      const user = userEvent.setup();
      const props = viewportProps();
      const { rerender } = render(<ModelViewport {...props} />);
      await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
      await user.click(screen.getByRole("button", { name: `${elevation} view` }));
      expect(screen.getByTestId("scene-camera")).toHaveTextContent(elevation.toLowerCase());

      rerender(<ModelViewport {...props} placement={placement} />);
      expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
      expect(screen.getByRole("button", { name: "Isometric view" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Isometric view for horizontal-grid editing",
      );
      for (const label of ["Front", "Right"]) {
        const button = screen.getByRole("button", { name: `${label} view` });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute(
          "title",
          "Finish or cancel placement to use elevation views",
        );
        await user.click(button);
        expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
      }

      rerender(<ModelViewport {...props} />);
      expect(screen.getByRole("button", { name: `${elevation} view` })).toBeEnabled();
      expect(screen.getByTestId("scene-camera")).toHaveTextContent(elevation.toLowerCase());
      expect(props.onMove).not.toHaveBeenCalled();
    },
  );

  it.each(["Front", "Right"])(
    "uses Isometric when Move starts from %s and keeps Top available",
    async (elevation) => {
      const user = userEvent.setup();
      render(<ModelViewport {...viewportProps()} />);
      await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
      await user.click(screen.getByRole("button", { name: `${elevation} view` }));
      await user.click(screen.getByRole("button", { name: "Move tool" }));
      expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · move");
      expect(screen.getByRole("status")).toHaveTextContent(
        "Isometric view for horizontal-grid editing",
      );
      for (const label of ["Front", "Right"]) {
        const button = screen.getByRole("button", { name: `${label} view` });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("title", "Use Select to view elevations");
        await user.click(button);
        expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · move");
      }

      await user.click(screen.getByRole("button", { name: "Top view" }));
      expect(screen.getByTestId("scene-camera")).toHaveTextContent("top · move");
      expect(screen.getByRole("status")).not.toHaveTextContent("Isometric");
      await user.click(screen.getByRole("button", { name: "Select tool" }));
      await user.click(screen.getByRole("button", { name: `${elevation} view` }));
      expect(screen.getByTestId("scene-camera")).toHaveTextContent(
        `${elevation.toLowerCase()} · select`,
      );
    },
  );

  it("preserves Top when placement starts and allows switching between Top and Isometric", async () => {
    const user = userEvent.setup();
    const props = viewportProps();
    const { rerender } = render(<ModelViewport {...props} />);
    await user.click(screen.getByRole("button", { name: "Activate interactive 3D" }));
    await user.click(screen.getByRole("button", { name: "Top view" }));
    rerender(<ModelViewport {...props} placement={placement} />);
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("top · select");
    await user.click(screen.getByRole("button", { name: "Isometric view" }));
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("iso · select");
    await user.click(screen.getByRole("button", { name: "Top view" }));
    expect(screen.getByTestId("scene-camera")).toHaveTextContent("top · select");
  });
});
