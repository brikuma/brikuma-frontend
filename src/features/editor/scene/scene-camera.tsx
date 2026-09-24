import { ZERO_ASSEMBLY_OFFSET, type AssemblyOffset } from "../assembly-view";
import { useLayoutEffect, useRef, type ComponentRef, type RefObject } from "react";
import { applyProps, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Box3, OrthographicCamera, Vector3 } from "three";
import type { Model } from "@/core/model/public";
import { partDefinitions } from "@/fixtures/catalog";
import type { CameraView } from "../viewport-types";
import { STUD_HEIGHT } from "./brick-geometry";

export function modelBounds(
  model: Model,
  hidden: readonly string[],
  offsets: ReadonlyMap<string, AssemblyOffset>,
) {
  const box = new Box3();
  for (const part of model.instances) {
    if (hidden.includes(part.groupId)) continue;
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
}) {
  const { size, invalidate, get } = useThree();
  const registeredControls = useThree((state) => state.controls);
  const lastFit = useRef("");
  const lastZoom = useRef(1);
  useLayoutEffect(() => {
    const { camera } = get();
    if (!(camera instanceof OrthographicCamera)) return;
    if (!registeredControls || registeredControls !== controls.current) return;
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
    }[view].normalize();
    camera.up.set(0, 1, 0);
    if (view === "top") camera.up.set(0, 0, -1);
    camera.position.copy(center).addScaledVector(direction, diagonal * 2);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    const projected = new Box3();
    const point = new Vector3();
    for (const part of model.instances) {
      if (hidden.includes(part.groupId)) continue;
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
    camera.zoom =
      Math.min(
        horizontalFit,
        dimensionFit,
        (size.height * (inspection ? 0.72 : 0.86)) / Math.max(inspection ? 1.5 : 4, span.y),
      ) * zoom;
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
    const { camera } = get();
    if (!(camera instanceof OrthographicCamera) || lastZoom.current === zoom) return;
    camera.zoom *= zoom / lastZoom.current;
    camera.updateProjectionMatrix();
    lastZoom.current = zoom;
    invalidate();
  }, [get, invalidate, zoom]);
  return null;
}
