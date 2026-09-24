// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    }) {
      return (
        <div>
          <div data-testid="scene-camera">{`${view} · ${tool}`}</div>
          <div data-testid="scene-projection">{projection}</div>
          <div data-testid="scene-rotation-preview">{rotationPreview ?? "No rotation preview"}</div>
          <div data-testid="scene-inspection">{inspectionPartId ?? "Complete model"}</div>
          <div data-testid="scene-model-count">{model.instances.length}</div>
          <div data-testid="scene-fit-request">{fitRequest}</div>
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
