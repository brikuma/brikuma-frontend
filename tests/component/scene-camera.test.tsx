// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three-stdlib";
import {
  CameraRig,
  convertedProjection,
  modelBounds,
} from "../../src/features/editor/scene/scene-camera";
import { createAssemblyView, type AssemblyOffset } from "../../src/features/editor/assembly-view";
import { model } from "../../src/fixtures/scenes/masseria";
import { partDefinitions } from "../../src/fixtures/catalog";
import type { Model } from "../../src/core/model/public";

interface CameraState {
  camera: OrthographicCamera | PerspectiveCamera;
  controls: OrbitControls;
  size: { width: number; height: number };
  get: () => CameraState;
  set: (next: Pick<CameraState, "camera">) => void;
  invalidate: () => void;
}
const boundary = vi.hoisted(() => ({ state: null as CameraState | null }));
vi.mock("@react-three/fiber", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@react-three/fiber")>()),
  useThree: (select?: (state: CameraState) => unknown) =>
    select ? select(boundary.state!) : boundary.state!,
}));

beforeEach(() => {
  const camera = new OrthographicCamera(-400, 400, 300, -300, 0.1, 500);
  camera.position.set(28, 25, 34);
  boundary.state = {
    camera,
    controls: new OrbitControls(camera),
    size: { width: 800, height: 600 },
    get: () => boundary.state!,
    set: (next) => {
      boundary.state!.camera = next.camera;
      boundary.state!.controls.object = next.camera;
    },
    invalidate: vi.fn(),
  };
});
afterEach(() => {
  cleanup();
  boundary.state!.controls.dispose();
});

function projectedExtent(
  camera: OrthographicCamera | PerspectiveCamera,
  offsets: ReadonlyMap<string, AssemblyOffset>,
  visibleModel: Model = model,
) {
  camera.updateMatrixWorld();
  const maximum = new Vector3();
  for (const part of visibleModel.instances) {
    const box = modelBounds({ ...model, instances: [part] }, [], offsets);
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const point = new Vector3(x, y, z).project(camera);
          maximum.max(new Vector3(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z)));
        }
  }
  return maximum;
}

describe("Camera clipping for real assembly layouts", () => {
  it("frames a single Masseria layer at a readable scale instead of the entire separation grid", () => {
    const assembly = createAssemblyView(model, partDefinitions, undefined, "layers", 1);
    const props = {
      bounds: modelBounds(model, [], assembly.offsets),
      sceneId: "masseria-all-layers",
      view: "iso" as const,
      fitRequest: 1,
      zoom: 1,
      controls: { current: boundary.state!.controls },
      model,
      hidden: [],
      offsets: assembly.offsets,
      onFit: vi.fn(),
    };
    const { rerender } = render(<CameraRig {...props} />);
    const overviewZoom = boundary.state!.camera.zoom;
    const top = assembly.modules.at(-1)!;
    const visibleModel = {
      ...model,
      instances: model.instances.filter((part) => top.partIds.includes(part.id)),
    };
    const offsets = new Map(top.partIds.map((id) => [id, { x: 0, y: -top.bounds.min.y, z: 0 }]));
    const bounds = modelBounds(visibleModel, [], offsets);
    rerender(
      <CameraRig
        {...props}
        model={visibleModel}
        bounds={bounds}
        offsets={offsets}
        sceneId="masseria-top-layer"
        fitRequest={2}
      />,
    );
    expect(bounds.min.y).toBeCloseTo(0, 10);
    expect(boundary.state!.camera.zoom).toBeGreaterThan(overviewZoom * 5);
    const extent = projectedExtent(boundary.state!.camera, offsets, visibleModel);
    expect(extent.x).toBeLessThanOrEqual(1);
    expect(extent.y).toBeLessThanOrEqual(1);
    expect(extent.z).toBeLessThanOrEqual(1);
  });

  it("keeps every Masseria layer inside the fitted orthographic frustum and restores assembly", () => {
    const before = structuredClone(model);
    const assembly = createAssemblyView(model, partDefinitions, undefined, "layers", 1);
    expect(assembly.modules.length).toBeGreaterThan(80);
    const props = {
      bounds: modelBounds(model, [], assembly.offsets),
      sceneId: "masseria-layers",
      view: "iso" as const,
      fitRequest: 1,
      zoom: 1,
      controls: { current: boundary.state!.controls },
      model,
      hidden: [],
      offsets: assembly.offsets,
      onFit: vi.fn(),
    };
    const { rerender } = render(<CameraRig {...props} />);
    const camera = boundary.state!.camera;
    expect(camera.far).toBeGreaterThan(500);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
    const separated = projectedExtent(camera, assembly.offsets);
    expect(separated.x).toBeLessThanOrEqual(1);
    expect(separated.y).toBeLessThanOrEqual(1);
    expect(separated.z).toBeLessThanOrEqual(1);
    const expandedFar = camera.far;

    const offsets = new Map<string, AssemblyOffset>();
    rerender(
      <CameraRig
        {...props}
        bounds={modelBounds(model, [], offsets)}
        offsets={offsets}
        sceneId="masseria-assembled"
        fitRequest={2}
      />,
    );
    const restored = projectedExtent(camera, offsets);
    expect(restored.x).toBeLessThanOrEqual(1);
    expect(restored.y).toBeLessThanOrEqual(1);
    expect(restored.z).toBeLessThanOrEqual(1);
    expect(camera.far).toBeLessThan(expandedFar);
    expect(model).toEqual(before);
  });

  it("updates clipping after orbit controls move away and when changing projection", () => {
    const assembly = createAssemblyView(model, partDefinitions, undefined, "layers", 1);
    const bounds = modelBounds(model, [], assembly.offsets);
    const control = boundary.state!.controls;
    render(
      <CameraRig
        bounds={bounds}
        sceneId="masseria-layers"
        view="iso"
        fitRequest={1}
        zoom={1}
        controls={{ current: control }}
        model={model}
        hidden={[]}
        offsets={assembly.offsets}
        onFit={vi.fn()}
      />,
    );
    const camera = boundary.state!.camera;
    const fittedFar = camera.far;
    camera.position.sub(control.target).multiplyScalar(3).add(control.target);
    control.update();
    expect(camera.far).toBeGreaterThan(fittedFar);
    expect(projectedExtent(camera, assembly.offsets).z).toBeLessThanOrEqual(1);
    const perspective = convertedProjection(
      camera,
      "perspective",
      control.target,
      800,
      600,
      bounds,
    );
    expect(projectedExtent(perspective, assembly.offsets).z).toBeLessThanOrEqual(1);
    const orthographic = convertedProjection(
      perspective,
      "orthographic",
      control.target,
      800,
      600,
      bounds,
    );
    expect(projectedExtent(orthographic, assembly.offsets).z).toBeLessThanOrEqual(1);
  });
});
