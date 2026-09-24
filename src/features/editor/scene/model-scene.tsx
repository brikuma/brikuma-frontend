"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls, Line } from "@react-three/drei";
import { MOUSE, Object3D, TOUCH, Vector3 } from "three";
import type { GridTransform, PartInstance } from "@/core/model/public";
import { colors, editPolicy, partDefinitions } from "@/fixtures/catalog";
import type {
  CameraView,
  ModelViewportProps,
  RenderQuality,
  ViewportTool,
  CameraProjection,
  CameraAction,
  ImageExportRequest,
} from "../viewport-types";
import { CameraRig, modelBounds } from "./scene-camera";
import { StudioContactShadow } from "./studio-contact-shadow";
import { StudioEffects } from "./studio-effects";
import { ModelDimensions } from "./model-dimensions";
import { intersectEditingPlane, intersectWorkplane, pointIsVisible } from "./editing-plane";
import { SceneOutput } from "./scene-output";
import { instancePartId, partIsPresented } from "./picking";
import { snapPlacementCenter } from "../placement-grid";
import { placementFeedback } from "../placement-feedback";
import { createAssemblyView, type AssemblyViewMode } from "../assembly-view";
import { ConnectionMarkers } from "./connection-markers";
import {
  PartBatch,
  PartOutline,
  PlacementGhost,
  previewTransform,
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
  projection?: CameraProjection;
  cameraAction?: CameraAction;
  fitSelection?: boolean;
  navigation?: "mouse" | "trackpad" | "touch";
  exportRequest?: ImageExportRequest | null;
  onExport?: (blob: Blob | null, message: string) => void;
  selectThrough?: boolean;
  onPickCandidates?: (ids: readonly string[]) => void;
  rotationPreview?: 90 | -90 | null;
  presentationPreset?: "neutral" | "warm" | "transparent";
  canonicalPartCount?: number;
  missedHandlerRef?: RefObject<((event: MouseEvent) => void) | null>;
}
interface DragSession extends DragPreview {
  origin: GridTransform;
  start: Vector3;
  pointer: [number, number];
  pointerId: number;
  moved: boolean;
  revision: string;
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
  const spacePan = useRef(false);
  const suppressClick = useRef(false);
  const cancelPlacement = useRef(props.onCancelPlacement);
  useEffect(() => {
    cancelPlacement.current = props.onCancelPlacement;
  }, [props.onCancelPlacement]);
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { missedHandlerRef, onClearSelection } = props;
  const transientView = Boolean(
    placement || props.exportRequest || props.selectThrough || props.rotationPreview,
  );
  useLayoutEffect(() => {
    if (!missedHandlerRef) return;
    missedHandlerRef.current = (event) => {
      if (
        event.button === 0 &&
        tool === "select" &&
        !transientView &&
        !dragSession.current &&
        !spacePan.current &&
        !suppressClick.current
      )
        onClearSelection?.();
    };
    return () => {
      missedHandlerRef.current = null;
    };
  }, [missedHandlerRef, onClearSelection, tool, transientView]);
  const presentedModel = useMemo(
    () => ({
      ...model,
      instances: model.instances.filter((part) =>
        partIsPresented(part, {
          hidden,
          focusIds: props.focusIds,
          presentationIds: props.presentationIds,
        }),
      ),
    }),
    [hidden, model, props.focusIds, props.presentationIds],
  );
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
    () =>
      modelBounds(
        props.fitSelection && (props.selectedIds?.length || selected)
          ? {
              ...presentedModel,
              instances: presentedModel.instances.filter((part) =>
                (props.selectedIds ?? [selected]).includes(part.id),
              ),
            }
          : presentedModel,
        [],
        fullAssembly.offsets,
      ),
    [presentedModel, fullAssembly, props.fitSelection, props.selectedIds, selected],
  );
  const center = bounds.getCenter(new Vector3());
  const span = bounds.getSize(new Vector3());
  const shadowSize = Math.max(inspection ? 3 : 16, span.x, span.z) * 0.8 + span.y * 0.35;
  const lightTarget = useMemo(() => new Object3D(), []);
  const palette = useMemo(() => {
    const style = getComputedStyle(gl.domElement);
    return {
      ground: style.getPropertyValue("--background").trim(),
      grid: style.getPropertyValue("--border").trim(),
      guide: style.getPropertyValue("--control-border").trim(),
      selection: style.getPropertyValue("--selection").trim(),
    };
  }, [gl]);
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
      if (controls.current) controls.current.enabled = true;
      suppressClick.current = true;
      if (canvas.hasPointerCapture(current.pointerId))
        canvas.releasePointerCapture(current.pointerId);
      invalidate();
    }
    const pointerCancel = (event: PointerEvent) => cancel(event.pointerId);
    const blur = () => {
      cancel();
      spacePan.current = false;
      if (controls.current)
        controls.current.mouseButtons.LEFT =
          props.navigation === "trackpad" ? MOUSE.ROTATE : undefined;
    };
    const visibility = () => {
      if (document.hidden) {
        blur();
        cancelPlacement.current?.();
      }
    };
    const contextLost = () => cancel();
    const keydown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        if (dragSession.current) {
          event.preventDefault();
          event.stopPropagation();
        }
        cancel();
        return;
      }
      if (event.code === "Space" && document.activeElement === canvas) {
        event.preventDefault();
        spacePan.current = true;
        if (controls.current) controls.current.mouseButtons.LEFT = MOUSE.PAN;
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePan.current = false;
        if (controls.current)
          controls.current.mouseButtons.LEFT =
            props.navigation === "trackpad" ? MOUSE.ROTATE : undefined;
      }
    };
    const protectBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.stopImmediatePropagation();
    };
    const focusCanvas = () => {
      suppressClick.current = false;
      canvas.focus({ preventScroll: true });
    };
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
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("wheel", protectBrowserZoom, { capture: true });
    canvas.addEventListener("pointerdown", focusCanvas);
    canvas.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute(
      "aria-label",
      "3D model. Right drag or navigation buttons orbit; middle drag pans. Space and primary drag pan.",
    );
    return () => {
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("lostpointercapture", lostCapture);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("wheel", protectBrowserZoom, { capture: true });
      canvas.removeEventListener("pointerdown", focusCanvas);
      canvas.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      for (const frame of pendingFrames) cancelAnimationFrame(frame);
      const current = dragSession.current;
      dragSession.current = null;
      if (current && canvas.hasPointerCapture(current.pointerId))
        canvas.releasePointerCapture(current.pointerId);
    };
  }, [gl, invalidate, props.navigation]);
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
    if (spacePan.current || ("buttons" in event && event.buttons > 1)) return null;
    const definition = partDefinitions.find((entry) => entry.id === placement.partId);
    if (!definition) return null;
    let surfaceY = 0;
    let support: { part: PartInstance; definition: typeof definition } | undefined;
    if (surface && placement.target !== "ground") {
      const target = partDefinitions.find((entry) => entry.id === surface.partId);
      surfaceY = surface.transform.y + (target?.height ?? 0) / 2;
      if (target) support = { part: surface, definition: target };
    }
    const hit =
      props.workplane && placement.target !== "surface"
        ? intersectWorkplane(event.ray, props.workplane)
        : intersectEditingPlane(event.ray, surfaceY);
    if (!hit) return null;
    const center =
      placement.target === "free"
        ? { x: Math.round(hit.x * 10) / 10, z: Math.round(hit.z * 10) / 10 }
        : snapPlacementCenter(hit, definition, placement.transform.rotation, support);
    const limit = editPolicy.bounds;
    return {
      x: Math.max(-limit, Math.min(limit, center.x)),
      y: Math.max(
        0,
        Math.min(
          limit,
          Math.round(((props.workplane ? hit.y : surfaceY) + definition.height / 2) * 20) / 20,
        ),
      ),
      z: Math.max(-limit, Math.min(limit, center.z)),
      rotation: placement.transform.rotation,
    };
  }
  function pointer(
    kind: "down" | "move" | "up" | "cancel",
    event: ScenePointer,
    part: PartInstance,
  ) {
    if (spacePan.current || (props.mode && props.mode !== "build")) return;
    if (placement) {
      event.stopPropagation();
      if (kind === "move") {
        const transform = placementAt(event, part);
        if (transform) onPlacementChange?.(transform);
      }
      return;
    }
    if (tool !== "move" || exploded || props.section) return;
    event.stopPropagation();
    if (kind === "down" && event.button === 0) {
      if (dragSession.current) return;
      suppressClick.current = false;
      if (!(props.selectedIds ?? [selected]).includes(part.id)) onSelect(part.id);
      if (model.groups.find((group) => group.id === part.groupId)?.protected) return;
      const workplane = props.workplane
        ? { ...props.workplane, offset: part.transform[props.workplane.axis] }
        : { axis: "y" as const, offset: part.transform.y };
      const hit = intersectWorkplane(event.ray, workplane);
      if (!hit) return;
      dragSession.current = {
        id: part.id,
        transform: part.transform,
        origin: part.transform,
        start: hit,
        pointer: [event.clientX, event.clientY],
        pointerId: event.pointerId,
        moved: false,
        revision: model.revision,
      };
      if (
        event.target &&
        "setPointerCapture" in event.target &&
        typeof event.target.setPointerCapture === "function"
      )
        event.target.setPointerCapture(event.pointerId);
      setDrag({ id: part.id, transform: part.transform });
      if (controls.current) controls.current.enabled = false;
    }
    const current = dragSession.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (kind === "move") {
      const plane = props.workplane
        ? { ...props.workplane, offset: current.origin[props.workplane.axis] }
        : { axis: "y" as const, offset: current.origin.y };
      const hit = intersectWorkplane(event.ray, plane);
      if (!hit) return;
      if (
        Math.hypot(event.clientX - current.pointer[0], event.clientY - current.pointer[1]) >
        (event.pointerType === "touch" ? 8 : 4)
      )
        current.moved = true;
      const transform = {
        ...current.origin,
        x: current.origin.x + Math.round((hit.x - current.start.x) * 2) / 2,
        y: current.origin.y + Math.round((hit.y - current.start.y) * 20) / 20,
        z: current.origin.z + Math.round((hit.z - current.start.z) * 2) / 2,
      };
      current.transform = transform;
      setDrag({
        id: current.id,
        transform,
        ids: props.selectedIds,
        delta: {
          x: transform.x - current.origin.x,
          y: transform.y - current.origin.y,
          z: transform.z - current.origin.z,
        },
      });
    }
    if (kind === "up" || kind === "cancel") {
      dragSession.current = null;
      if (
        event.target &&
        "releasePointerCapture" in event.target &&
        typeof event.target.releasePointerCapture === "function"
      )
        event.target.releasePointerCapture(event.pointerId);
      const rectangle = gl.domElement.getBoundingClientRect();
      const inside =
        event.clientX >= rectangle.left &&
        event.clientX <= rectangle.right &&
        event.clientY >= rectangle.top &&
        event.clientY <= rectangle.bottom;
      if (kind === "up" && current.moved && inside && current.revision === model.revision) {
        const delta = {
          x: current.transform.x - current.origin.x,
          y: current.transform.y - current.origin.y,
          z: current.transform.z - current.origin.z,
        };
        if (delta.x || delta.y || delta.z) onMove?.(current.id, delta);
      }
      suppressClick.current = current.moved;
      if (controls.current) controls.current.enabled = true;
      setDrag(null);
      invalidate();
    }
  }
  function pick(event: ThreeEvent<MouseEvent>, part?: PartInstance) {
    event.stopPropagation();
    if (
      event.delta > 4 ||
      spacePan.current ||
      suppressClick.current ||
      !pointIsVisible(event.point, props.section)
    ) {
      suppressClick.current = false;
      return;
    }
    if (props.selectThrough) {
      const ids: string[] = [];
      for (const hit of event.intersections) {
        if (!pointIsVisible(hit.point, props.section) || hit.instanceId === undefined) continue;
        const mapping = hit.object.userData.partIds;
        const id: unknown = Array.isArray(mapping)
          ? instancePartId(mapping, hit.instanceId, hit.object.userData.instancesPerPart ?? 1)
          : undefined;
        if (typeof id === "string" && !ids.includes(id)) ids.push(id);
      }
      props.onPickCandidates?.(ids);
      return;
    }
    if (placement) {
      const transform = placementAt(event, part);
      if (transform) {
        onPlacementChange?.(transform);
        if (placementFeedback(model, partDefinitions, { ...placement, transform }).allowed)
          onPlace?.(transform);
      }
    } else if (part && tool !== "move") onSelect(part.id, event.shiftKey || props.multiSelect);
    else if (!part && !dragSession.current) props.onClearSelection?.();
  }
  const selection = presentedModel.instances.find((part) => part.id === selected);
  const hoverPart = presentedModel.instances.find(
    (part) => part.id === hovered && part.id !== selected,
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
        projection={props.projection}
        mode={props.mode}
        cameraAction={props.cameraAction}
        frozen={Boolean(props.exportRequest)}
        model={
          props.fitSelection && (props.selectedIds?.length || selected)
            ? {
                ...presentedModel,
                instances: presentedModel.instances.filter((part) =>
                  (props.selectedIds ?? [selected]).includes(part.id),
                ),
              }
            : presentedModel
        }
        hidden={[]}
        offsets={fullAssembly.offsets}
      />
      {props.presentationPreset !== "transparent" && (
        <color
          attach="background"
          args={[
            props.mode === "present" && props.presentationPreset === "warm"
              ? "#eadfcd"
              : palette.ground,
          ]}
        />
      )}
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
        color={
          props.mode === "present" && props.presentationPreset === "warm"
            ? "#fff0dc"
            : colors[11].hex
        }
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
            if (placement && !spacePan.current) {
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
          position={
            props.workplane?.axis === "x"
              ? [props.workplane.offset, 0, 0]
              : props.workplane?.axis === "z"
                ? [0, 0, props.workplane.offset]
                : [0, (props.workplane?.offset ?? 0) - 0.014, 0]
          }
          rotation={
            props.workplane?.axis === "x"
              ? [0, 0, Math.PI / 2]
              : props.workplane?.axis === "z"
                ? [Math.PI / 2, 0, 0]
                : [0, 0, 0]
          }
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
      {partDefinitions.flatMap((definition) =>
        [false, true].map((muted) => {
          const parts = presentedModel.instances.filter(
            (part) =>
              part.partId === definition.id && Boolean(props.mutedIds?.includes(part.id)) === muted,
          );
          return parts.length ? (
            <PartBatch
              key={`${definition.id}-${muted}-${parts.length}`}
              definition={definition}
              parts={parts}
              offsets={offsets}
              quality={quality}
              drag={drag}
              onPointer={pointer}
              onPick={pick}
              onOver={hover}
              onOut={() => hover(null)}
              section={props.section}
              muted={muted}
            />
          ) : null;
        }),
      )}
      {exploded &&
        props.assemblyAmount > 0 &&
        assembly.modules
          .filter((module) =>
            module.partIds.some((id) => presentedModel.instances.some((part) => part.id === id)),
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
      {!placement &&
        !inspection &&
        props.mode !== "present" &&
        presentedModel.instances
          .filter((part) => (props.selectedIds ?? [selected]).includes(part.id))
          .map((part) => (
            <PartOutline
              key={part.id}
              part={part}
              offsets={offsets}
              transform={previewTransform(part, drag)}
              color={palette.selection}
            />
          ))}
      {hoverPart && !drag && !placement && !inspection && props.mode !== "present" && (
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
          model={presentedModel}
          offsets={offsets}
          color={palette.guide}
          transform={drag?.id === selection?.id ? drag?.transform : undefined}
        />
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!drag && !props.exportRequest}
        enableRotate
        mouseButtons={{
          LEFT: props.navigation === "trackpad" && tool === "select" ? MOUSE.ROTATE : undefined,
          MIDDLE: MOUSE.PAN,
          RIGHT: MOUSE.ROTATE,
        }}
        touches={{
          ONE: props.navigation === "touch" ? TOUCH.ROTATE : undefined,
          TWO: TOUCH.DOLLY_PAN,
        }}
        enableDamping={!reducedMotion}
        dampingFactor={0.12}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minZoom={0.25}
        maxZoom={inspection ? 500 : 150}
        minDistance={0.5}
        maxDistance={1500}
      />
      <SceneOutput
        revision={model.revision}
        partCount={props.canonicalPartCount ?? model.instances.length}
        visiblePartCount={presentedModel.instances.length}
        cameraTarget={() => controls.current?.target.toArray() ?? []}
        onMetrics={props.onMetrics}
        request={props.exportRequest}
        onExport={props.onExport}
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
  const missedHandlerRef = useRef<((event: MouseEvent) => void) | null>(null);
  const inspectedModel = useMemo(() => {
    const part =
      !props.exportRequest &&
      props.model.instances.find((entry) => entry.id === props.inspectionPartId);
    if (part) return { ...props.model, instances: [part] };
    const pivot = props.model.instances.find((entry) => entry.id === props.selected);
    if (!props.rotationPreview || !pivot || props.exportRequest) return props.model;
    const angle = (props.rotationPreview * Math.PI) / 180;
    return {
      ...props.model,
      instances: props.model.instances.map((entry) => {
        if (!(props.selectedIds ?? [props.selected]).includes(entry.id)) return entry;
        const dx = entry.transform.x - pivot.transform.x;
        const dz = entry.transform.z - pivot.transform.z;
        return {
          ...entry,
          transform: {
            ...entry.transform,
            x:
              Math.round((pivot.transform.x + dx * Math.cos(angle) + dz * Math.sin(angle)) * 10) /
              10,
            z:
              Math.round((pivot.transform.z - dx * Math.sin(angle) + dz * Math.cos(angle)) * 10) /
              10,
            rotation: ((entry.transform.rotation + props.rotationPreview! + 360) %
              360) as GridTransform["rotation"],
          },
        };
      }),
    };
  }, [
    props.exportRequest,
    props.inspectionPartId,
    props.model,
    props.rotationPreview,
    props.selected,
    props.selectedIds,
  ]);
  const inspection = Boolean(props.inspectionPartId && !props.exportRequest);
  return (
    <Canvas
      onPointerMissed={(event) => missedHandlerRef.current?.(event)}
      orthographic
      frameloop="demand"
      shadows={props.quality === "low" ? false : "percentage"}
      dpr={props.quality === "low" ? 1 : props.quality === "studio" ? [1, 2] : [1, 1.5]}
      camera={{ position: [28, 25, 34], zoom: 16, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: "high-performance", localClippingEnabled: true }}
      fallback={<p>Use Structure and the inspector for keyboard selection and editing.</p>}
    >
      <SceneContents
        {...props}
        model={inspectedModel}
        canonicalPartCount={props.model.instances.length}
        missedHandlerRef={missedHandlerRef}
        inspectionPartId={inspection ? props.inspectionPartId : null}
        exploded={inspection || props.exportRequest ? false : props.exploded}
        hidden={inspection || props.exportRequest || props.focusIds?.length ? [] : props.hidden}
        focusIds={props.exportRequest ? undefined : props.focusIds}
        presentationIds={props.exportRequest ? undefined : props.presentationIds}
        mutedIds={props.exportRequest ? undefined : props.mutedIds}
        section={props.exportRequest ? null : props.section}
        placement={inspection ? null : props.placement}
        tool={inspection ? "select" : props.tool}
      />
    </Canvas>
  );
}
