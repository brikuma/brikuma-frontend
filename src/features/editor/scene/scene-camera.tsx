import { ZERO_ASSEMBLY_OFFSET, type AssemblyOffset } from "../assembly-view";
import { useLayoutEffect, useRef, type ComponentRef, type RefObject } from "react";
import { applyProps, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Box3, OrthographicCamera, PerspectiveCamera, Vector3, type Camera } from "three";
import type { Model } from "@/core/model/public";
import { partDefinitions } from "@/fixtures/catalog";
import type { CameraAction, CameraProjection, CameraView, EditorMode } from "../viewport-types";
import { STUD_HEIGHT } from "./brick-geometry";

export function modelBounds(
  model: Model,
  hidden: readonly string[],
  offsets: ReadonlyMap<string, AssemblyOffset>,
) {
  const box = new Box3();
  for (const part of model.instances) {
    if (hidden.includes(part.groupId) || hidden.includes(part.id)) continue;
    const definition = partDefinitions.find((candidate) => candidate.id === part.partId);
    if (!definition) continue;
    const turned = part.transform.rotation % 180 !== 0;
    const halfX = (turned ? definition.depth : definition.width) / 2;
    const halfZ = (turned ? definition.width : definition.depth) / 2;
    const { x, y, z } = part.transform;
    const offset = offsets.get(part.id) ?? ZERO_ASSEMBLY_OFFSET;
    box.expandByPoint(
      new Vector3(x + offset.x - halfX, y + offset.y - definition.height / 2, z + offset.z - halfZ),
    );
    box.expandByPoint(
      new Vector3(
        x + offset.x + halfX,
        y + offset.y + definition.height / 2 + (definition.studs ? STUD_HEIGHT : 0),
        z + offset.z + halfZ,
      ),
    );
  }
  if (box.isEmpty()) box.set(new Vector3(-6, 0, -6), new Vector3(6, 1, 6));
  return box;
}
export function CameraRig({
  bounds,
  sceneId,
  view,
  fitRequest,
  zoom,
  controls,
  dimensions = false,
  inspection = false,
  model,
  hidden,
  offsets,
  onFit,
  projection = "orthographic",
  mode = "build",
  cameraAction,
  frozen = false,
}: {
  bounds: Box3;
  sceneId: string;
  view: CameraView;
  fitRequest: number;
  zoom: number;
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>;
  dimensions?: boolean;
  inspection?: boolean;
  model: Model;
  hidden: readonly string[];
  offsets: ReadonlyMap<string, AssemblyOffset>;
  onFit: () => void;
  projection?: CameraProjection;
  mode?: EditorMode;
  cameraAction?: CameraAction;
  frozen?: boolean;
}) {
  const { size, invalidate, get, set, camera } = useThree();
  const registeredControls = useThree((state) => state.controls);
  const lastFit = useRef("");
  const lastZoom = useRef(1);
  const modeViews = useRef(new Map<EditorMode, { camera: Camera; target: Vector3 }>());
  const previousMode = useRef(mode);
  const restoringMode = useRef(false);
  const pendingTarget = useRef<Vector3 | null>(null);
  const lastCameraAction = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (frozen) return;
    const camera = get().camera;
    const control = controls.current;
    if (!control) return;
    if (previousMode.current !== mode) {
      modeViews.current.set(previousMode.current, {
        camera: camera.clone(),
        target: control.target.clone(),
      });
      const saved = modeViews.current.get(mode);
      if (saved) {
        const restored = convertedProjection(
          saved.camera,
          projection,
          saved.target,
          size.width,
          size.height,
        );
        control.target.copy(saved.target);
        pendingTarget.current = saved.target.clone();
        restoringMode.current = true;
        set({ camera: restored });
      }
      previousMode.current = mode;
      invalidate();
    }
  }, [camera, controls, frozen, get, invalidate, mode, projection, set, size.height, size.width]);
  useLayoutEffect(() => {
    if (frozen) return;
    if (restoringMode.current) {
      restoringMode.current = false;
      return;
    }
    if ((projection === "orthographic") === camera instanceof OrthographicCamera) return;
    const target = controls.current?.target.clone() ?? bounds.getCenter(new Vector3());
    const next = convertedProjection(camera, projection, target, size.width, size.height);
    pendingTarget.current = target;
    set({ camera: next });
    invalidate();
  }, [bounds, camera, controls, frozen, invalidate, projection, set, size.height, size.width]);
  useLayoutEffect(() => {
    if (frozen) return;
    const { camera } = get();
    if (!(camera instanceof OrthographicCamera || camera instanceof PerspectiveCamera)) return;
    if (
      !registeredControls ||
      registeredControls !== controls.current ||
      controls.current?.object !== camera
    )
      return;
    if (pendingTarget.current) {
      controls.current.target.copy(pendingTarget.current);
      controls.current.update();
      pendingTarget.current = null;
    }
    const fitKey = `${sceneId}-${view}-${fitRequest}-${size.width}-${size.height}-${dimensions}`;
    if (lastFit.current === fitKey) return;
    lastFit.current = fitKey;
    if (controls.current) {
      const damping = controls.current.enableDamping;
      applyProps(controls.current, { enableDamping: false });
      controls.current.update();
      applyProps(controls.current, { enableDamping: damping });
    }
    const center = bounds.getCenter(new Vector3());
    const diagonal = Math.max(16, bounds.getSize(new Vector3()).length());
    const direction = {
      iso: new Vector3(1, 1.12, 1.25),
      front: new Vector3(0, 0, 1),
      top: new Vector3(0, 1, 0.0001),
      right: new Vector3(1, 0, 0),
      left: new Vector3(-1, 0, 0),
      back: new Vector3(0, 0, -1),
      bottom: new Vector3(0, -1, 0.0001),
    }[view].normalize();
    camera.up.set(0, 1, 0);
    if (view === "top") camera.up.set(0, 0, -1);
    if (view === "bottom") camera.up.set(0, 0, 1);
    camera.position.copy(center).addScaledVector(direction, diagonal * 2);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    const projected = new Box3();
    const point = new Vector3();
    for (const part of model.instances) {
      if (hidden.includes(part.groupId) || hidden.includes(part.id)) continue;
      const definition = partDefinitions.find((candidate) => candidate.id === part.partId);
      if (!definition) continue;
      const turned = part.transform.rotation % 180 !== 0;
      const halfX = (turned ? definition.depth : definition.width) / 2;
      const halfZ = (turned ? definition.width : definition.depth) / 2;
      const { x, y, z } = part.transform;
      const offset = offsets.get(part.id) ?? ZERO_ASSEMBLY_OFFSET;
      for (const px of [x + offset.x - halfX, x + offset.x + halfX])
        for (const py of [
          y + offset.y - definition.height / 2,
          y + offset.y + definition.height / 2 + (definition.studs ? STUD_HEIGHT : 0),
        ])
          for (const pz of [z + offset.z - halfZ, z + offset.z + halfZ])
            projected.expandByPoint(point.set(px, py, pz).applyMatrix4(camera.matrixWorldInverse));
    }
    if (projected.isEmpty()) {
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z])
            projected.expandByPoint(point.set(x, y, z).applyMatrix4(camera.matrixWorldInverse));
    }
    const visualCenter = projected.getCenter(new Vector3());
    visualCenter.z = 0;
    visualCenter.applyQuaternion(camera.quaternion);
    camera.position.add(visualCenter);
    center.add(visualCenter);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    const span = projected.getSize(new Vector3());
    const horizontalFit =
      (size.width * (inspection ? 0.76 : dimensions ? 0.89 : 0.93)) /
      Math.max(inspection ? 1.5 : 4, span.x);
    // Inspection labels stay 80 CSS pixels wide; reserve their edge space on narrow screens.
    const dimensionFit =
      inspection && dimensions
        ? Math.max(80, size.width - 96) / Math.max(1.5, span.x + 0.8)
        : horizontalFit;
    const fittedZoom =
      Math.min(
        horizontalFit,
        dimensionFit,
        (size.height * (inspection ? 0.72 : 0.86)) / Math.max(inspection ? 1.5 : 4, span.y),
      ) * zoom;
    if (camera instanceof OrthographicCamera) camera.zoom = fittedZoom;
    else {
      camera.zoom = 1;
      const height = size.height / fittedZoom;
      const distance = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.near = Math.max(0.01, distance / 1000);
      camera.far = Math.max(500, distance + diagonal * 4);
    }
    camera.updateProjectionMatrix();
    lastZoom.current = zoom;
    if (controls.current) {
      controls.current.target.copy(center);
      controls.current.update();
    }
    onFit();
    invalidate();
  }, [
    bounds,
    get,
    controls,
    dimensions,
    offsets,
    fitRequest,
    frozen,
    hidden,
    invalidate,
    inspection,
    model,
    onFit,
    registeredControls,
    sceneId,
    size,
    view,
    zoom,
  ]);
  useLayoutEffect(() => {
    if (frozen) return;
    const { camera } = get();
    if (
      !(camera instanceof OrthographicCamera || camera instanceof PerspectiveCamera) ||
      lastZoom.current === zoom
    )
      return;
    if (camera instanceof OrthographicCamera) camera.zoom *= zoom / lastZoom.current;
    else {
      const target = controls.current?.target ?? new Vector3();
      camera.position
        .sub(target)
        .multiplyScalar(lastZoom.current / zoom)
        .add(target);
    }
    camera.updateProjectionMatrix();
    lastZoom.current = zoom;
    invalidate();
  }, [controls, frozen, get, invalidate, zoom]);
  useLayoutEffect(() => {
    if (
      frozen ||
      !cameraAction ||
      !controls.current ||
      lastCameraAction.current === cameraAction.serial
    )
      return;
    lastCameraAction.current = cameraAction.serial;
    const control = controls.current;
    const current = get().camera;
    const kind = cameraAction.kind;
    if (kind.startsWith("orbit")) {
      const relative = current.position.clone().sub(control.target);
      relative.applyAxisAngle(
        new Vector3(0, 1, 0),
        kind === "orbit-left" ? Math.PI / 12 : -Math.PI / 12,
      );
      current.position.copy(control.target).add(relative);
    } else {
      const direction = new Vector3(
        kind === "pan-left" ? -1 : kind === "pan-right" ? 1 : 0,
        kind === "pan-up" ? 1 : kind === "pan-down" ? -1 : 0,
        0,
      ).applyQuaternion(current.quaternion);
      const visibleHeight =
        current instanceof OrthographicCamera
          ? (current.top - current.bottom) / current.zoom
          : current instanceof PerspectiveCamera
            ? 2 *
              current.position.distanceTo(control.target) *
              Math.tan((current.fov * Math.PI) / 360)
            : 10;
      direction.multiplyScalar(visibleHeight * 0.12);
      control.target.add(direction);
      current.position.add(direction);
    }
    control.update();
    invalidate();
  }, [cameraAction, controls, frozen, get, invalidate]);
  return null;
}

/** Projection conversion preserves the target plane's vertical field of view. */
export function convertedProjection(
  camera: Camera,
  projection: CameraProjection,
  target: Vector3,
  width: number,
  height: number,
) {
  const safeWidth = Math.max(1, width),
    safeHeight = Math.max(1, height);
  const distance = Math.max(0.1, camera.position.distanceTo(target));
  const visibleHeight =
    camera instanceof OrthographicCamera
      ? (camera.top - camera.bottom) / camera.zoom
      : camera instanceof PerspectiveCamera
        ? (2 * distance * Math.tan((camera.fov * Math.PI) / 360)) / camera.zoom
        : 10;
  const next =
    projection === "orthographic"
      ? new OrthographicCamera(
          -safeWidth / 2,
          safeWidth / 2,
          safeHeight / 2,
          -safeHeight / 2,
          0.01,
          2000,
        )
      : new PerspectiveCamera(35, safeWidth / safeHeight, 0.01, 2000);
  next.position.copy(camera.position);
  next.quaternion.copy(camera.quaternion);
  next.up.copy(camera.up);
  if (next instanceof OrthographicCamera) next.zoom = safeHeight / visibleHeight;
  else
    next.position.copy(target).add(
      camera.position
        .clone()
        .sub(target)
        .normalize()
        .multiplyScalar(visibleHeight / (2 * Math.tan((next.fov * Math.PI) / 360))),
    );
  next.updateProjectionMatrix();
  return next;
}
