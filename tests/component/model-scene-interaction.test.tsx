// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  useImperativeHandle,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOUSE, Ray, Vector3 } from "three";
import ModelScene, { type SceneProps } from "../../src/features/editor/scene/model-scene";
import type { PartBatch, PlacementGhost } from "../../src/features/editor/scene/part-batch";
import type { ScenePointer } from "../../src/features/editor/scene/part-batch";
import type { CameraRig } from "../../src/features/editor/scene/scene-camera";
import { model as blank } from "../../src/fixtures/scenes/blank";

const boundary = vi.hoisted(() => ({
  canvas: null as HTMLCanvasElement | null,
  gl: { domElement: null as HTMLCanvasElement | null },
  invalidate: vi.fn(),
  batch: null as ComponentProps<typeof PartBatch> | null,
  camera: null as ComponentProps<typeof CameraRig> | null,
  ghost: null as ComponentProps<typeof PlacementGhost> | null,
  controls: {
    enabled: true,
    mouseButtons: {} as Partial<Record<"LEFT" | "MIDDLE" | "RIGHT", MOUSE>>,
  },
}));

// Render the real scene interaction component without requiring WebGL. Only
// graphics hosts and leaf renderers are replaced; hooks and pointer handlers run.
vi.mock("react/jsx-runtime", async (importOriginal) => {
  const runtime = await importOriginal<typeof import("react/jsx-runtime")>();
  const graphics = new Set([
    "color",
    "ambientLight",
    "hemisphereLight",
    "primitive",
    "directionalLight",
    "mesh",
  ]);
  return {
    ...runtime,
    jsx: (type: Parameters<typeof runtime.jsx>[0], ...args: [unknown, string?]) =>
      typeof type === "string" && graphics.has(type) ? null : runtime.jsx(type, ...args),
    jsxs: (type: Parameters<typeof runtime.jsxs>[0], ...args: [unknown, string?]) =>
      typeof type === "string" && graphics.has(type) ? null : runtime.jsxs(type, ...args),
  };
});
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => <>{children}</>,
  useThree: () => ({ gl: boundary.gl, invalidate: boundary.invalidate }),
}));
vi.mock("@react-three/drei", () => ({
  Environment: () => null,
  Grid: () => null,
  Lightformer: () => null,
  Line: ({ points }: { points: readonly (readonly number[])[] }) => (
    <span data-testid="assembly-guide" data-points={JSON.stringify(points)} />
  ),
  OrbitControls: ({
    ref,
    enabled,
    mouseButtons,
  }: {
    ref: React.Ref<typeof boundary.controls>;
    enabled: boolean;
    mouseButtons: typeof boundary.controls.mouseButtons;
  }) => {
    useImperativeHandle(ref, () => boundary.controls);
    useLayoutEffect(() => {
      boundary.controls.enabled = enabled;
      boundary.controls.mouseButtons = mouseButtons;
    }, [enabled, mouseButtons]);
    return null;
  },
}));
vi.mock("../../src/features/editor/scene/scene-camera", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/features/editor/scene/scene-camera")>()),
  CameraRig: (props: ComponentProps<typeof CameraRig>) => {
    boundary.camera = props;
    return null;
  },
}));
vi.mock("../../src/features/editor/scene/studio-contact-shadow", () => ({
  StudioContactShadow: () => null,
}));
vi.mock("../../src/features/editor/scene/studio-effects", () => ({ StudioEffects: () => null }));
vi.mock("../../src/features/editor/scene/model-dimensions", () => ({
  ModelDimensions: () => null,
}));
vi.mock("../../src/features/editor/scene/scene-output", () => ({
  SceneOutput: ({ partCount }: { partCount: number }) => (
    <output data-testid="canonical-part-count">{partCount}</output>
  ),
}));
vi.mock("../../src/features/editor/scene/connection-markers", () => ({
  ConnectionMarkers: () => null,
}));
vi.mock("../../src/features/editor/scene/part-batch", () => ({
  PartBatch: (props: ComponentProps<typeof PartBatch>) => {
    boundary.batch = props;
    return <div data-testid="drag-preview">{props.drag?.transform.x ?? "No preview"}</div>;
  },
  PartOutline: () => null,
  PlacementGhost: (props: ComponentProps<typeof PlacementGhost>) => {
    boundary.ghost = props;
    return <output data-testid="placement-valid">{String(props.valid)}</output>;
  },
  previewTransform: (part: { transform: unknown }) => part.transform,
}));

beforeEach(() => {
  boundary.batch = null;
  boundary.ghost = null;
  boundary.canvas = document.createElement("canvas");
  boundary.gl.domElement = boundary.canvas;
  document.body.append(boundary.canvas);
  boundary.canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 300, bottom: 300 }) as DOMRect;
  const captures = new Set<number>();
  boundary.canvas.setPointerCapture = vi.fn((id) => captures.add(id));
  boundary.canvas.releasePointerCapture = vi.fn((id) => captures.delete(id));
  boundary.canvas.hasPointerCapture = (id) => captures.has(id);
  boundary.controls.enabled = true;
  boundary.controls.mouseButtons = {};
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  boundary.canvas?.remove();
  vi.unstubAllGlobals();
});

function props(): SceneProps {
  return {
    model: {
      ...blank,
      instances: [
        {
          id: "brick-1",
          partId: "demo-brick-2x4",
          colorId: "ivory",
          groupId: "workspace",
          transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
        },
      ],
    },
    selected: "brick-1",
    hidden: [],
    placement: null,
    inspectionPartId: null,
    exploded: false,
    assemblyMode: "layers",
    assemblyAmount: 0,
    zoom: 1,
    quality: "low",
    view: "iso",
    fitRequest: 0,
    showGrid: false,
    showDimensions: false,
    tool: "move",
    onFailure: vi.fn(),
    onReady: vi.fn(),
    onHover: vi.fn(),
    onSelect: vi.fn(),
    onMove: vi.fn(),
  };
}

function pointer(kind: "down" | "move" | "up", x: number) {
  const event = {
    button: 0,
    pointerId: 7,
    pointerType: "mouse",
    clientX: 50 + x * 10,
    clientY: 50,
    target: boundary.canvas,
    ray: new Ray(new Vector3(x, 10, 0), new Vector3(0, -1, 0)),
    stopPropagation: vi.fn(),
  } as unknown as ScenePointer;
  act(() => boundary.batch!.onPointer(kind, event, boundary.batch!.parts[0]));
}

function clickPart(part: SceneProps["model"]["instances"][number], x = 0) {
  const event = {
    delta: 0,
    point: new Vector3(x, 0, 0),
    ray: new Ray(new Vector3(x, 10, 0), new Vector3(0, -1, 0)),
    intersections: [],
    stopPropagation: vi.fn(),
  } as unknown as Parameters<ComponentProps<typeof PartBatch>["onPick"]>[0];
  act(() => boundary.batch!.onPick(event, part));
}

describe("Single-piece reposition gestures", () => {
  it("ignores out-of-scope attachment surfaces while allowing an eligible surface", () => {
    const initial = props();
    const allowed = initial.model.instances[0];
    const outside = { ...allowed, id: "outside", transform: { ...allowed.transform, x: 8 } };
    initial.model = { ...initial.model, instances: [allowed, outside] };
    const onPlace = vi.fn(() => true);
    const onPlacementChange = vi.fn();
    render(
      <ModelScene
        {...initial}
        tool="select"
        placement={{
          partId: "demo-brick-1x1",
          colorId: "ivory",
          target: "surface",
          transform: { x: 0.5, y: 1.8, z: 0.5, rotation: 0 },
        }}
        placementTargetIds={[allowed.id]}
        onPlacementChange={onPlacementChange}
        onPlace={onPlace}
      />,
    );
    clickPart(outside, 8);
    expect(onPlacementChange).not.toHaveBeenCalled();
    expect(onPlace).not.toHaveBeenCalled();
    clickPart(allowed);
    expect(onPlace).toHaveBeenCalledExactlyOnceWith({ x: 0.5, y: 1.8, z: 0.5, rotation: 0 });
    expect(onPlacementChange).toHaveBeenCalledExactlyOnceWith({
      x: 0.5,
      y: 1.8,
      z: 0.5,
      rotation: 0,
    });
  });

  it.each(["move", "rotate"] as const)(
    "uses the initiating %s click only to start a preview, then applies on a later click",
    (tool) => {
      const initial = props();
      const source = initial.model.instances[0];
      initial.model = {
        ...initial.model,
        instances: [source, { ...source, id: "other", transform: { ...source.transform, x: 4 } }],
      };
      const before = structuredClone(initial.model);
      const onPlace = vi.fn(() => true);
      const onReposition = vi.fn();
      function Harness() {
        const [placement, setPlacement] = useState<SceneProps["placement"]>(null);
        return (
          <ModelScene
            {...initial}
            tool={tool}
            placement={placement}
            onPlace={onPlace}
            onReposition={(id, rotate) => {
              onReposition(id, rotate);
              setPlacement({
                partId: source.partId,
                colorId: source.colorId,
                transform: { ...source.transform, rotation: rotate ? 90 : 0 },
                target: "ground",
                editing: { instanceId: id, baseRevision: initial.model.revision },
              });
              return true;
            }}
          />
        );
      }
      render(<Harness />);
      pointer("down", 0);
      pointer("up", 0);
      clickPart(source);
      expect(onReposition).toHaveBeenCalledExactlyOnceWith(source.id, tool === "rotate");
      expect(onPlace).not.toHaveBeenCalled();
      expect(initial.onMove).not.toHaveBeenCalled();
      expect(boundary.batch!.parts.map((part) => part.id)).toEqual(["other"]);
      expect(screen.getByTestId("canonical-part-count")).toHaveTextContent("2");
      expect(boundary.camera!.model.instances).toHaveLength(2);
      clickPart(initial.model.instances[1], 8);
      expect(onPlace).toHaveBeenCalledExactlyOnceWith({
        x: 8,
        y: 0.6,
        z: 0,
        rotation: tool === "rotate" ? 90 : 0,
      });
      expect(initial.model).toEqual(before);
    },
  );

  it("never falls back to an unrestricted drag when the reposition handler refuses a piece", () => {
    const initial = props();
    const onReposition = vi.fn(() => false);
    render(<ModelScene {...initial} onReposition={onReposition} />);
    pointer("down", 0);
    pointer("move", 2);
    pointer("up", 2);
    expect(screen.getByTestId("drag-preview")).toHaveTextContent("No preview");
    expect(initial.onMove).not.toHaveBeenCalled();
    clickPart(initial.model.instances[0]);
    expect(onReposition).toHaveBeenCalledOnce();
    expect(initial.onMove).not.toHaveBeenCalled();
    expect(initial.model.instances[0].transform.x).toBe(0);
  });

  it("hides only the editing source, excludes it from feedback and targets, and restores it on cancel", () => {
    const initial = props();
    const base = initial.model.instances[0];
    const source = { ...base, id: "top", transform: { ...base.transform, y: 1.8 } };
    initial.model = { ...initial.model, instances: [base, source] };
    const placement: NonNullable<SceneProps["placement"]> = {
      partId: source.partId,
      colorId: source.colorId,
      transform: source.transform,
      target: "surface",
      editing: { instanceId: source.id, baseRevision: initial.model.revision },
    };
    const onPlace = vi.fn(() => true);
    const { rerender } = render(
      <ModelScene {...initial} placement={placement} onPlace={onPlace} />,
    );
    expect(boundary.batch!.parts.map((part) => part.id)).toEqual([base.id]);
    expect(screen.getByTestId("placement-valid")).toHaveTextContent("true");
    expect(screen.getByTestId("canonical-part-count")).toHaveTextContent("2");
    clickPart(source);
    expect(onPlace).not.toHaveBeenCalled();

    rerender(
      <ModelScene
        {...initial}
        placement={{ ...placement, target: "ground", transform: base.transform }}
        onPlace={onPlace}
      />,
    );
    expect(screen.getByTestId("placement-valid")).toHaveTextContent("false");
    clickPart(base);
    expect(onPlace).not.toHaveBeenCalled();

    rerender(<ModelScene {...initial} onPlace={onPlace} />);
    expect(boundary.batch!.parts.map((part) => part.id)).toEqual([base.id, source.id]);
    expect(screen.queryByTestId("placement-valid")).not.toBeInTheDocument();
    expect(initial.model.instances[1]).toBe(source);
  });

  it("cancels an existing-piece preview on pointer cancellation and refuses stale pointer targets", () => {
    const initial = props();
    const source = initial.model.instances[0];
    const support = { ...source, id: "support", transform: { ...source.transform, x: 4 } };
    initial.model = { ...initial.model, instances: [source, support] };
    const placement: NonNullable<SceneProps["placement"]> = {
      partId: source.partId,
      colorId: source.colorId,
      transform: source.transform,
      target: "ground",
      editing: { instanceId: source.id, baseRevision: initial.model.revision },
    };
    const onCancelPlacement = vi.fn();
    const onPlace = vi.fn(() => true);
    const onPlacementChange = vi.fn();
    const { rerender } = render(
      <ModelScene
        {...initial}
        placement={placement}
        onPlace={onPlace}
        onPlacementChange={onPlacementChange}
        onCancelPlacement={onCancelPlacement}
      />,
    );
    act(() => boundary.canvas!.dispatchEvent(new Event("pointercancel")));
    expect(onCancelPlacement).toHaveBeenCalledOnce();
    expect(initial.onMove).not.toHaveBeenCalled();
    rerender(
      <ModelScene
        {...initial}
        model={{ ...initial.model, revision: "changed" }}
        placement={placement}
        onPlace={onPlace}
        onPlacementChange={onPlacementChange}
      />,
    );
    clickPart(support, 8);
    expect(onPlacementChange).not.toHaveBeenCalled();
    expect(onPlace).not.toHaveBeenCalled();
    expect(screen.getByTestId("placement-valid")).toHaveTextContent("false");
  });
});

describe("Scene drag interruption", () => {
  it.each(["select", "rotate"] as const)(
    "cancels the visible drag when switching to %s and lets the next move complete",
    (tool) => {
      const initial = props();
      const { rerender } = render(<ModelScene {...initial} />);
      pointer("down", 0);
      pointer("move", 2);
      expect(screen.getByTestId("drag-preview")).toHaveTextContent("2");
      expect(boundary.controls.enabled).toBe(false);

      rerender(<ModelScene {...initial} tool={tool} />);
      expect(screen.getByTestId("drag-preview")).toHaveTextContent("No preview");
      expect(boundary.controls.enabled).toBe(true);
      expect(boundary.canvas!.releasePointerCapture).toHaveBeenCalledWith(7);
      pointer("up", 2);
      expect(initial.onMove).not.toHaveBeenCalled();
      expect(initial.model.instances[0].transform.x).toBe(0);

      rerender(<ModelScene {...initial} />);
      pointer("down", 0);
      pointer("move", 1);
      pointer("up", 1);
      expect(initial.onMove).toHaveBeenCalledExactlyOnceWith("brick-1", { x: 1, y: 0, z: 0 });
      expect(screen.getByTestId("drag-preview")).toHaveTextContent("No preview");
      expect(boundary.controls.enabled).toBe(true);
    },
  );
});

describe("Assembly guide visibility", () => {
  function layeredProps(): SceneProps {
    const initial = props();
    return {
      ...initial,
      selected: null,
      tool: "select",
      exploded: true,
      assemblyAmount: 1,
      model: {
        ...initial.model,
        instances: [0, 1, 2].map((index) => ({
          ...initial.model.instances[0],
          id: `brick-${index + 1}`,
          transform: { x: 0, y: 0.6 + index * 1.2, z: 0, rotation: 0 },
        })),
      },
    };
  }

  it("fits only the isolated layer on the floor, then restores visibility and canonical geometry", () => {
    const initial = layeredProps();
    const before = structuredClone(initial.model);
    const sceneProps = {
      ...initial,
      hidden: ["brick-3"],
      focusIds: ["brick-1"],
      presentationIds: ["brick-1"],
      section: { axis: "y" as const, offset: 0.2 },
    };
    const { rerender } = render(<ModelScene {...sceneProps} assemblyFocusId="layer-3" />);
    expect(boundary.batch!.parts.map((part) => part.id)).toEqual(["brick-3"]);
    expect(boundary.batch!.section).toBeNull();
    expect(boundary.camera!.model.instances.map((part) => part.id)).toEqual(["brick-3"]);
    expect(boundary.camera!.bounds.min.toArray()).toEqual([-2, expect.closeTo(0, 10), -1]);
    expect(boundary.camera!.bounds.max.x).toBe(2);
    expect(boundary.camera!.bounds.max.y).toBeCloseTo(1.4);
    expect(boundary.camera!.bounds.max.z).toBe(1);
    expect(boundary.batch!.offsets.get("brick-3")).toEqual({ x: 0, y: -2.4, z: 0 });
    expect(screen.queryAllByTestId("assembly-guide")).toHaveLength(0);

    rerender(
      <ModelScene {...sceneProps} assemblyFocusId="layer-2" fitSelection selected="brick-1" />,
    );
    expect(boundary.camera!.model.instances.map((part) => part.id)).toEqual(["brick-2"]);
    expect(boundary.camera!.bounds.min.y).toBeCloseTo(0, 10);
    expect(boundary.camera!.bounds.max.y).toBeCloseTo(1.4);
    rerender(<ModelScene {...sceneProps} />);
    expect(boundary.camera!.model.instances).toHaveLength(3);
    expect(boundary.camera!.bounds.max.x).toBeGreaterThan(2);
    rerender(<ModelScene {...sceneProps} exploded={false} />);
    expect(boundary.batch!.parts.map((part) => part.id)).toEqual(["brick-1"]);
    expect(boundary.batch!.section).toEqual(sceneProps.section);
    expect(boundary.camera!.model.instances.map((part) => part.id)).toEqual(["brick-1"]);
    expect(boundary.batch!.offsets.get("brick-1")).toEqual({ x: 0, y: 0, z: 0 });
    expect(initial.model).toEqual(before);
    expect(initial.onMove).not.toHaveBeenCalled();
    expect(initial.onSelect).not.toHaveBeenCalled();
  });

  it("traces only selected layers and removes every guide when selection clears", () => {
    const initial = layeredProps();
    const before = structuredClone(initial.model);
    const { rerender } = render(<ModelScene {...initial} />);
    expect(screen.queryAllByTestId("assembly-guide")).toHaveLength(0);
    rerender(<ModelScene {...initial} selected="brick-2" />);
    const secondLayerGuide = screen.getByTestId("assembly-guide").getAttribute("data-points");
    rerender(<ModelScene {...initial} selected="brick-3" />);
    expect(screen.getByTestId("assembly-guide")).not.toHaveAttribute(
      "data-points",
      secondLayerGuide,
    );
    rerender(<ModelScene {...initial} selected="brick-3" selectedIds={["brick-2", "brick-3"]} />);
    expect(screen.getAllByTestId("assembly-guide")).toHaveLength(2);
    rerender(<ModelScene {...initial} selected="brick-3" selectedIds={[]} />);
    expect(screen.queryAllByTestId("assembly-guide")).toHaveLength(0);
    expect(initial.model).toEqual(before);
    expect(initial.onMove).not.toHaveBeenCalled();
  });

  it.each(["roof", "modules"] as const)(
    "retains all authored %s guides without selecting a piece",
    (assemblyMode) => {
      const initial = layeredProps();
      render(
        <ModelScene
          {...initial}
          assemblyMode={assemblyMode}
          assemblyView={{
            modelId: initial.model.id,
            baselineRevision: initial.model.baselineRevision,
            fixedPartIds: ["brick-1"],
            modules: initial.model.instances.slice(1).map((part, index) => ({
              id: `module-${index + 1}`,
              name: `Module ${index + 1}`,
              description: "Authored section",
              partIds: [part.id],
              offset: { x: 0, y: 4 + index, z: 0 },
              views: ["roof", "modules"],
            })),
          }}
        />,
      );
      expect(screen.getAllByTestId("assembly-guide")).toHaveLength(2);
    },
  );
});
