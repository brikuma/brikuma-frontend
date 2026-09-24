"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls, Line } from "@react-three/drei";
import { Object3D, Vector3 } from "three";
import type { GridTransform, PartInstance } from "@/core/model/public";
import { colors, editPolicy, partDefinitions } from "@/fixtures/catalog";
import type {
  CameraView,
  ModelViewportProps,
  RenderQuality,
  ViewportTool,
} from "../viewport-types";
import { CameraRig, modelBounds } from "./scene-camera";
import { StudioContactShadow } from "./studio-contact-shadow";
import { StudioEffects } from "./studio-effects";
import { ModelDimensions } from "./model-dimensions";
import { intersectEditingPlane } from "./editing-plane";
import { snapPlacementCenter } from "../placement-grid";
import { placementFeedback } from "../placement-feedback";
import { createAssemblyView, type AssemblyViewMode } from "../assembly-view";
import { ConnectionMarkers } from "./connection-markers";
import {
  PartBatch,
  PartOutline,
  PlacementGhost,
  type DragPreview,
  type ScenePointer,
} from "./part-batch";

export interface SceneProps extends ModelViewportProps {
  inspectionPartId: string | null;
  exploded: boolean;
  assemblyMode: AssemblyViewMode;
  assemblyAmount: number;
  zoom: number;
  quality: RenderQuality;
  view: CameraView;
  fitRequest: number;
  showGrid: boolean;
  showDimensions: boolean;
  tool: ViewportTool;
  onFailure: () => void;
  onReady: () => void;
  onHover: (id: string | null) => void;
}
interface DragSession extends DragPreview {
  origin: GridTransform;
  start: Vector3;
  pointer: [number, number];
  pointerId: number;
  moved: boolean;
}
function SceneContents(props: SceneProps) {
  const {
    model,
    hidden,
    selected,
    exploded,
    quality,
    tool,
    placement,
    onPlacementChange,
    onPlace,
    onMove,
    onSelect,
    onHover,
    onFailure,
    onReady,
  } = props;
  const inspection = Boolean(props.inspectionPartId);
  const { gl, invalidate } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cameraFitted = useRef(false);
  const onCameraFit = useCallback(() => {
    cameraFitted.current = true;
  }, []);
  const isCameraReady = useCallback(() => cameraFitted.current, []);
  const dragSession = useRef<DragSession | null>(null);
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const assembly = useMemo(
    () =>
      createAssemblyView(
        model,
        partDefinitions,
        props.assemblyView,
        props.assemblyMode,
        exploded ? props.assemblyAmount : 0,
      ),
    [model, props.assemblyView, props.assemblyMode, props.assemblyAmount, exploded],
  );
  const offsets = assembly.offsets;
  const fullAssembly = useMemo(
    () =>
      createAssemblyView(
        model,
        partDefinitions,
        props.assemblyView,
        props.assemblyMode,
        exploded ? 1 : 0,
      ),
    [model, props.assemblyView, props.assemblyMode, exploded],
  );
  const bounds = useMemo(
    () => modelBounds(model, hidden, fullAssembly.offsets),
    [model, hidden, fullAssembly],
  );
  const center = bounds.getCenter(new Vector3());
  const span = bounds.getSize(new Vector3());
  const shadowSize = Math.max(inspection ? 3 : 16, span.x, span.z) * 0.8 + span.y * 0.35;
  const lightTarget = useMemo(() => new Object3D(), []);
  const palette = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      ground: style.getPropertyValue("--background").trim(),
      grid: style.getPropertyValue("--border").trim(),
      guide: style.getPropertyValue("--control-border").trim(),
      selection: style.getPropertyValue("--selection").trim(),
    };
  }, []);
  useLayoutEffect(() => {
    lightTarget.position.set(center.x, center.y, center.z);
    lightTarget.updateMatrixWorld();
  }, [center.x, center.y, center.z, lightTarget]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const canvas = gl.domElement;
    const fail = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", fail);
    return () => canvas.removeEventListener("webglcontextlost", fail);
  }, [gl, onFailure]);
  useEffect(() => {
    const canvas = gl.domElement;
    const pendingFrames = new Set<number>();
    function cancel(pointerId?: number) {
      const current = dragSession.current;
      if (!current || (pointerId !== undefined && pointerId !== current.pointerId)) return;
      dragSession.current = null;
      setDrag(null);
      if (canvas.hasPointerCapture(current.pointerId))
        canvas.releasePointerCapture(current.pointerId);
      invalidate();
    }
    const pointerCancel = (event: PointerEvent) => cancel(event.pointerId);
    const blur = () => cancel();
    const lostCapture = (event: PointerEvent) => {
      // Capture loss can precede pointerup; let the normal release commit first.
      const frame = requestAnimationFrame(() => {
        pendingFrames.delete(frame);
        cancel(event.pointerId);
      });
      pendingFrames.add(frame);
    };
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("lostpointercapture", lostCapture);
    window.addEventListener("blur", blur);
    return () => {
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("lostpointercapture", lostCapture);
      window.removeEventListener("blur", blur);
      for (const frame of pendingFrames) cancelAnimationFrame(frame);
      const current = dragSession.current;
      dragSession.current = null;
      if (current && canvas.hasPointerCapture(current.pointerId))
        canvas.releasePointerCapture(current.pointerId);
    };
  }, [gl, invalidate]);
  useEffect(() => {
    gl.domElement.style.setProperty(
      "cursor",
      placement
        ? "crosshair"
        : drag
          ? "grabbing"
          : tool === "move"
            ? "grab"
            : hovered
              ? "pointer"
              : "grab",
    );
    return () => {
      gl.domElement.style.removeProperty("cursor");
    };
  }, [drag, gl, hovered, placement, tool]);
  function hover(id: string | null) {
    setHovered(id);
    onHover(id);
  }
  function placementAt(event: ThreeEvent<PointerEvent | MouseEvent>, surface?: PartInstance) {
    if (!placement) return null;
    const definition = partDefinitions.find((entry) => entry.id === placement.partId);
    if (!definition) return null;
    let surfaceY = 0;
    let support: { part: PartInstance; definition: typeof definition } | undefined;
    if (surface && placement.target !== "ground") {
      const target = partDefinitions.find((entry) => entry.id === surface.partId);
      surfaceY = surface.transform.y + (target?.height ?? 0) / 2;
      if (target) support = { part: surface, definition: target };
    }
    const hit = intersectEditingPlane(event.ray, surfaceY);
    if (!hit) return null;
    const center =
      placement.target === "free"
        ? { x: Math.round(hit.x * 10) / 10, z: Math.round(hit.z * 10) / 10 }
        : snapPlacementCenter(hit, definition, placement.transform.rotation, support);
    const limit = editPolicy.bounds;
    return {
      x: Math.max(-limit, Math.min(limit, center.x)),
      y: Math.max(0, Math.min(limit, Math.round((surfaceY + definition.height / 2) * 20) / 20)),
      z: Math.max(-limit, Math.min(limit, center.z)),
      rotation: placement.transform.rotation,
    };
  }
  function pointer(
    kind: "down" | "move" | "up" | "cancel",
    event: ScenePointer,
    part: PartInstance,
  ) {
    if (placement) {
      event.stopPropagation();
      if (kind === "move") {
        const transform = placementAt(event, part);
        if (transform) onPlacementChange?.(transform);
      }
      return;
    }
    if (tool !== "move" || exploded) return;
    event.stopPropagation();
    if (kind === "down" && event.button === 0) {
      if (dragSession.current) return;
      onSelect(part.id);
      if (model.groups.find((group) => group.id === part.groupId)?.protected) return;
      const hit = intersectEditingPlane(event.ray, part.transform.y);
      if (!hit) return;
      dragSession.current = {
        id: part.id,
        transform: part.transform,
        origin: part.transform,
        start: hit,
        pointer: [event.clientX, event.clientY],
        pointerId: event.pointerId,
        moved: false,
      };
      if (
        event.target &&
        "setPointerCapture" in event.target &&
        typeof event.target.setPointerCapture === "function"
      )
        event.target.setPointerCapture(event.pointerId);
      setDrag({ id: part.id, transform: part.transform });
    }
    const current = dragSession.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (kind === "move") {
      const hit = intersectEditingPlane(event.ray, current.origin.y);
      if (!hit) return;
      if (Math.hypot(event.clientX - current.pointer[0], event.clientY - current.pointer[1]) > 4)
        current.moved = true;
      const transform = {
        ...current.origin,
        x: current.origin.x + Math.round((hit.x - current.start.x) * 2) / 2,
        z: current.origin.z + Math.round((hit.z - current.start.z) * 2) / 2,
      };
      current.transform = transform;
      setDrag({ id: current.id, transform });
    }
    if (kind === "up" || kind === "cancel") {
      dragSession.current = null;
      if (
        event.target &&
        "releasePointerCapture" in event.target &&
        typeof event.target.releasePointerCapture === "function"
      )
        event.target.releasePointerCapture(event.pointerId);
      if (kind === "up" && current.moved) {
        const delta = {
          x: current.transform.x - current.origin.x,
          y: 0,
          z: current.transform.z - current.origin.z,
        };
        if (delta.x || delta.z) onMove?.(current.id, delta);
      }
      setDrag(null);
      invalidate();
    }
  }
  function pick(event: ThreeEvent<MouseEvent>, part?: PartInstance) {
    event.stopPropagation();
    if (event.delta > 4) return;
    if (placement) {
      const transform = placementAt(event, part);
      if (transform) {
        onPlacementChange?.(transform);
        if (placementFeedback(model, partDefinitions, { ...placement, transform }).allowed)
          onPlace?.(transform);
      }
    } else if (part && tool === "select") onSelect(part.id);
  }
  const selection = model.instances.find(
    (part) => part.id === selected && !hidden.includes(part.groupId),
  );
  const hoverPart = model.instances.find(
    (part) => part.id === hovered && part.id !== selected && !hidden.includes(part.groupId),
  );
  return (
    <>
      <CameraRig
        bounds={bounds}
        sceneId={`${model.id}-${props.inspectionPartId ?? "assembly"}-${props.assemblyMode}-${exploded}-${inspection ? model.revision : ""}`}
        inspection={inspection}
        view={props.view}
        fitRequest={props.fitRequest}
        zoom={props.zoom}
        controls={controls}
        dimensions={props.showDimensions}
        onFit={onCameraFit}
        model={model}
        hidden={hidden}
        offsets={fullAssembly.offsets}
      />
      <color attach="background" args={[palette.ground]} />
      <ambientLight intensity={0.13} />
      <hemisphereLight args={[colors[11].hex, colors[2].hex, 0.6]} />
      {quality !== "low" && (
        <Environment frames={1} resolution={128} environmentIntensity={0.45}>
          <Lightformer
            form="rect"
            intensity={3}
            position={[-10, 14, 4]}
            scale={[12, 10, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={1.5}
            position={[10, 7, -8]}
            scale={[8, 12, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={0.6}
            position={[2, 5, 12]}
            scale={[10, 5, 1]}
            target={[0, 0, 0]}
          />
        </Environment>
      )}
      <primitive object={lightTarget} />
      <directionalLight
        position={[center.x - 14, center.y + 50, center.z + 12]}
        target={lightTarget}
        intensity={2.35}
        color={colors[11].hex}
        castShadow
        shadow-mapSize={quality === "studio" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-normalBias={inspection ? 0.02 : 0.012}
        shadow-bias={inspection ? -0.0002 : -0.00008}
        shadow-radius={inspection ? 1.5 : quality === "studio" ? 8 : 3}
      />
      <directionalLight
        position={[center.x + 18, center.y + 20, center.z + 28]}
        intensity={0.7}
        color={colors[11].hex}
      />
      {!inspection && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.035, 0]}
          receiveShadow
          onPointerMove={(event) => {
            if (placement) {
              event.stopPropagation();
              const transform = placementAt(event);
              if (transform) onPlacementChange?.(transform);
            }
          }}
          onClick={(event) => pick(event)}
        >
          <planeGeometry args={[240, 240]} />
          <shadowMaterial color={colors[8].hex} transparent opacity={0.2} />
        </mesh>
      )}
      {quality === "studio" && !inspection && (
        <StudioContactShadow
          revision={`${model.revision}-${hidden.join("-")}-${exploded}-${props.assemblyMode}-${props.assemblyAmount}`}
          enabled={!drag && !placement}
          position={[center.x, -0.025, center.z]}
          scale={Math.max(24, span.x + 10, span.z + 10)}
          color={colors[8].hex}
        />
      )}
      {props.showGrid && !inspection && (
        <Grid
          userData={{ studioHelper: true }}
          position={[0, -0.014, 0]}
          args={[120, 120]}
          cellSize={1}
          cellThickness={0.45}
          cellColor={palette.grid}
          sectionSize={5}
          sectionThickness={0.7}
          sectionColor={palette.grid}
          fadeDistance={75}
          fadeStrength={1.5}
        />
      )}
      {partDefinitions.map((definition) => {
        const parts = model.instances.filter(
          (part) => part.partId === definition.id && !hidden.includes(part.groupId),
        );
        return parts.length ? (
          <PartBatch
            key={`${definition.id}-${parts.length}`}
            definition={definition}
            parts={parts}
            offsets={offsets}
            quality={quality}
            drag={drag}
            onPointer={pointer}
            onPick={pick}
            onOver={hover}
            onOut={() => hover(null)}
          />
        ) : null;
      })}
      {exploded &&
        props.assemblyAmount > 0 &&
        assembly.modules
          .filter((module) =>
            module.partIds.some((id) =>
              model.instances.some((part) => part.id === id && !hidden.includes(part.groupId)),
            ),
          )
          .map((module) => (
            <Line
              key={module.id}
              points={[
                [module.anchor.x, module.anchor.y, module.anchor.z],
                [module.targetAnchor.x, module.targetAnchor.y, module.targetAnchor.z],
              ]}
              color={palette.selection}
              dashed
              dashSize={0.18}
              gapSize={0.14}
              lineWidth={1.25}
              userData={{ studioHelper: true }}
            />
          ))}
      {selection && !placement && !inspection && (
        <PartOutline
          part={selection}
          offsets={offsets}
          transform={drag?.id === selection.id ? drag.transform : undefined}
          color={palette.selection}
        />
      )}
      {hoverPart && !drag && !placement && !inspection && (
        <PartOutline part={hoverPart} offsets={offsets} color={palette.selection} opacity={0.4} />
      )}
      {placement && (
        <>
          <PlacementGhost
            placement={placement}
            valid={placementFeedback(model, partDefinitions, placement).allowed}
          />
          <ConnectionMarkers
            contacts={placementFeedback(model, partDefinitions, placement).contacts}
          />
        </>
      )}
      {props.showDimensions && !exploded && (
        <ModelDimensions
          bounds={bounds}
          part={selection}
          model={model}
          offsets={offsets}
          color={palette.guide}
          transform={drag?.id === selection?.id ? drag?.transform : undefined}
        />
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={tool === "select"}
        enableRotate={!placement}
        enableDamping={!reducedMotion}
        dampingFactor={0.12}
        minPolarAngle={0}
        maxPolarAngle={inspection ? Math.PI : Math.PI / 2}
        minZoom={2}
        maxZoom={inspection ? 500 : 150}
      />
      <StudioEffects
        quality={quality}
        onReady={onReady}
        onFailure={onFailure}
        isCameraReady={isCameraReady}
      />
    </>
  );
}
export default function ModelScene(props: SceneProps) {
  const inspectedModel = useMemo(() => {
    const part = props.model.instances.find((entry) => entry.id === props.inspectionPartId);
    return part ? { ...props.model, instances: [part] } : props.model;
  }, [props.inspectionPartId, props.model]);
  const inspection = inspectedModel !== props.model;
  return (
    <Canvas
      orthographic
      frameloop="demand"
      shadows={props.quality === "low" ? false : "percentage"}
      dpr={props.quality === "low" ? 1 : props.quality === "studio" ? [1, 2] : [1, 1.5]}
      camera={{ position: [28, 25, 34], zoom: 16, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      fallback={<p>Use Structure and the inspector for keyboard selection and editing.</p>}
    >
      <SceneContents
        {...props}
        model={inspectedModel}
        inspectionPartId={inspection ? props.inspectionPartId : null}
        exploded={inspection ? false : props.exploded}
        hidden={inspection ? [] : props.hidden}
        placement={inspection ? null : props.placement}
        tool={inspection ? "select" : props.tool}
      />
    </Canvas>
  );
}
