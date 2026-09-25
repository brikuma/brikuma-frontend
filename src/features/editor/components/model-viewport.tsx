"use client";
import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MousePointer2,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers3,
  Maximize2,
  Grid2X2,
  X,
  Scan,
  ScanEye,
  Ruler,
} from "lucide-react";
import { ModelPoster } from "@/components/model-poster";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatCentimeters } from "@/core/model/public";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { placementFeedback } from "../placement-feedback";
import { createAssemblyView, type AssemblyViewMode } from "../assembly-view";
import type {
  CameraView,
  ModelViewportProps,
  RenderQuality,
  ViewportTool,
  CameraProjection,
  CameraAction,
  ImageExportRequest,
  EditorMode,
} from "../viewport-types";
const Scene = dynamic(() => import("../scene/model-scene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Opening the interactive model…
    </div>
  ),
});
function StaticPreview({ id, title, className }: { id: string; title: string; className: string }) {
  return ["blank", "masseria", "rover", "creature", "placement-lab", "courtyard-study"].includes(
    id,
  ) ? (
    <ModelPoster id={id} title={title} className={className} />
  ) : (
    <div
      className={`${className} flex items-center justify-center p-6 text-center text-sm text-muted-foreground`}
    >
      No static preview for this local model. Structure and HTML edits remain available.
    </div>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function ModelViewport(props: ModelViewportProps) {
  const {
    model,
    selected,
    placement,
    onCancelPlacement,
    onMove,
    onEditingLockChange,
    onCancelInteraction,
    onReposition,
    repositionReady = true,
  } = props;
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [assemblyMode, setAssemblyMode] = useState<AssemblyViewMode>("layers");
  const [assemblyAmount, setAssemblyAmount] = useState(1);
  const [allLayers, setAllLayers] = useState(false);
  const [assemblyLayerIndex, setAssemblyLayerIndex] = useState<number | null>(null);
  const assembly = useMemo(
    () =>
      createAssemblyView(model, partDefinitions, props.assemblyView, assemblyMode, assemblyAmount),
    [model, props.assemblyView, assemblyMode, assemblyAmount],
  );
  const roofAvailable = useMemo(
    () => createAssemblyView(model, partDefinitions, props.assemblyView, "roof", 1).available,
    [model, props.assemblyView],
  );
  const layerIndex = Math.max(
    0,
    Math.min(assemblyLayerIndex ?? assembly.modules.length - 1, assembly.modules.length - 1),
  );
  const focusedLayer =
    exploded && assemblyMode === "layers" && !allLayers ? assembly.modules[layerIndex] : undefined;
  const [zoom, setZoom] = useState(1);
  const [reset, setReset] = useState(0);
  const [quality, setQuality] = useState<RenderQuality>("standard");
  const [projection, setProjection] = useState<CameraProjection>("orthographic");
  const [projectionMode, setProjectionMode] = useState<EditorMode>(props.mode ?? "build");
  const [modeProjections, setModeProjections] = useState<
    Partial<Record<EditorMode, CameraProjection>>
  >({});
  if (projectionMode !== (props.mode ?? "build")) {
    const nextMode = props.mode ?? "build";
    setModeProjections({ ...modeProjections, [projectionMode]: projection });
    setProjection(modeProjections[nextMode] ?? projection);
    setProjectionMode(nextMode);
  }
  const [primaryOrbit, setPrimaryOrbit] = useState(false);
  function enablePrimaryOrbit() {
    setPrimaryOrbit(true);
  }
  const [cameraAction, setCameraAction] = useState<CameraAction>();
  const [fitSelection, setFitSelection] = useState(false);
  const [selectThrough, setSelectThrough] = useState(false);
  const [pickCandidates, setPickCandidates] = useState<readonly string[]>([]);
  const viewTools = useRef<HTMLDetailsElement>(null);
  const selectThroughChooser = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (selectThrough) selectThroughChooser.current?.focus();
  }, [selectThrough]);
  const [exportRequest, setExportRequest] = useState<ImageExportRequest | null>(null);
  const [exportSize, setExportSize] = useState<1024 | 2048>(1024);
  const [transparentExport, setTransparentExport] = useState(false);
  const [presentationPreset, setPresentationPreset] = useState<"neutral" | "warm" | "transparent">(
    "neutral",
  );
  const [exportMessage, setExportMessage] = useState("");
  const exportComplete = useCallback((blob: Blob | null, message: string) => {
    setExportRequest(null);
    setExportMessage(message);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "brikuma-scene.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);
  const [view, setView] = useState<CameraView>("iso");
  const [fitRequest, setFitRequest] = useState(0);
  const [handledViewRequest, setHandledViewRequest] = useState(-1);
  const [handledFocusRequest, setHandledFocusRequest] = useState(0);
  if (props.focusRequest && props.focusRequest > 0 && props.focusRequest !== handledFocusRequest) {
    setHandledFocusRequest(props.focusRequest);
    setFitSelection(Boolean(selected || props.selectedIds?.length));
    setFitRequest((value) => value + 1);
    setZoom(1);
  }
  if (props.viewRequest && props.viewRequest.serial !== handledViewRequest) {
    setHandledViewRequest(props.viewRequest.serial);
    setView(props.viewRequest.view);
    setFitSelection(false);
    setFitRequest((value) => value + 1);
    setZoom(1);
  }
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [tool, setTool] = useState<ViewportTool>("select");
  const [handledToolRequest, setHandledToolRequest] = useState(0);
  const [rotationPreview, setRotationPreview] = useState<90 | -90 | null>(null);
  const queuedRotation = useRef<{ id: string; revision: string } | null>(null);
  const [rotationBase, setRotationBase] = useState("");
  const rotationKey = `${model.revision}:${selected}:${props.selectedIds?.join(",") ?? selected}`;
  const rotationCurrent = rotationBase === rotationKey;
  function previewRotation(degrees: 90 | -90) {
    setRotationBase(rotationKey);
    setRotationPreview(degrees);
  }
  const [contextCommands, setContextCommands] = useState(false);
  const secondaryGesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [inspection, setInspection] = useState(false);
  const [handledAssembledReset, setHandledAssembledReset] = useState(props.assembledResetRequest);
  if (props.assembledResetRequest !== handledAssembledReset) {
    setHandledAssembledReset(props.assembledResetRequest);
    setInspection(false);
    setExploded(false);
    setRotationPreview(null);
    setTool("select");
    setPrimaryOrbit(false);
  }
  const [hovered, setHovered] = useState<string | null>(null);
  const selectedPart = model.instances.find((part) => part.id === selected);
  const selectableParts = focusedLayer
    ? model.instances.filter((part) => focusedLayer.partIds.includes(part.id))
    : model.instances;
  const selectThroughParts = pickCandidates.length
    ? pickCandidates.flatMap((id) => selectableParts.find((part) => part.id === id) ?? [])
    : selectableParts;
  const inspectionPartId = inspection && selectedPart && !placement ? selectedPart.id : null;
  const editing = Boolean(placement) || tool === "move";
  const workingAxis = props.workplane?.axis ?? "y";
  const grazingView = (value: CameraView) =>
    value !== "iso" &&
    (value === "front" || value === "back"
      ? workingAxis !== "z"
      : value === "right" || value === "left"
        ? workingAxis !== "x"
        : workingAxis !== "y");
  const elevationEditing = editing && grazingView(view);
  const effectiveView = elevationEditing ? "iso" : view;
  const fail = useCallback(() => {
    setFailed(true);
    setReady(false);
    setRotationPreview(null);
    queuedRotation.current = null;
    setInspection(false);
    setExploded(false);
    setExportRequest(null);
    onCancelInteraction?.();
  }, [onCancelInteraction]);
  const loaded = useCallback(() => setReady(true), []);
  const placementPart = partDefinitions.find((part) => part.id === placement?.partId);
  const placementColor = colors.find((color) => color.id === placement?.colorId);
  const feedback = placement
    ? props.awaitingNextPosition
      ? { kind: "waiting", message: "Placed. Choose the next position for another copy." }
      : placementFeedback(model, partDefinitions, placement)
    : null;
  const editingLocked = Boolean(inspection || exploded || props.section || exportRequest);
  const readOnlyMode = props.mode !== undefined && props.mode !== "build";
  if (readOnlyMode && tool !== "select") {
    setTool("select");
    setRotationPreview(null);
  }
  if (
    props.toolRequest &&
    props.toolRequest.serial > 0 &&
    props.toolRequest.serial !== handledToolRequest
  ) {
    setHandledToolRequest(props.toolRequest.serial);
    if (props.toolRequest.tool === "select" || (!readOnlyMode && !editingLocked && !placement)) {
      setTool(props.toolRequest.tool);
      setRotationPreview(null);
      setPrimaryOrbit(false);
    }
  }
  useEffect(() => {
    onEditingLockChange?.(editingLocked);
  }, [editingLocked, onEditingLockChange]);
  useEffect(() => {
    const request = queuedRotation.current;
    if (!request) return;
    if (
      !onReposition ||
      placement ||
      readOnlyMode ||
      tool !== "rotate" ||
      selected !== request.id ||
      model.revision !== request.revision
    ) {
      queuedRotation.current = null;
      return;
    }
    // Inspection's lock belongs to the parent too. Wait for its unlocked render
    // before using the latest guarded callback, rather than guessing with a timer.
    if (editingLocked || !repositionReady) return;
    queuedRotation.current = null;
    onReposition(request.id, true);
  }, [
    editingLocked,
    repositionReady,
    onReposition,
    placement,
    readOnlyMode,
    tool,
    selected,
    model.revision,
  ]);
  useEffect(() => {
    const cancel = () => {
      setRotationPreview(null);
      queuedRotation.current = null;
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  if (placement && exploded) setExploded(false);
  if (inspection && (placement || !selectedPart)) {
    setInspection(false);
    setPrimaryOrbit(false);
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  function exitInspection() {
    if (!inspection) return;
    setInspection(false);
    setPrimaryOrbit(false);
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  function chooseRotation() {
    exitInspection();
    setRotationPreview(null);
    setTool("rotate");
    setPrimaryOrbit(false);
    if (props.onReposition && selected) {
      if (inspection || props.repositionReady === false)
        queuedRotation.current = { id: selected, revision: model.revision };
      else {
        queuedRotation.current = null;
        props.onReposition(selected, true);
      }
    }
  }
  function beginSelectThrough() {
    if (viewTools.current) viewTools.current.open = false;
    onCancelPlacement?.();
    exitInspection();
    setTool("select");
    setRotationPreview(null);
    setPrimaryOrbit(false);
    setSelectThrough(true);
    setPickCandidates([]);
  }
  function openAssembly(mode: AssemblyViewMode) {
    setActive(true);
    onCancelPlacement?.();
    exitInspection();
    setTool("select");
    setPrimaryOrbit(false);
    setFitSelection(false);
    setAssemblyMode(mode);
    setAssemblyAmount(1);
    setAllLayers(false);
    setAssemblyLayerIndex(null);
    setPickCandidates([]);
    setExploded((open) => (mode === assemblyMode ? !open : true));
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  function closeAssembly() {
    setExploded(false);
    setFitSelection(false);
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  function focusLayer(index: number) {
    setAssemblyLayerIndex(index);
    setAllLayers(false);
    setFitSelection(false);
    setPickCandidates([]);
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  const needsLiveModel = Boolean(placement) || model.revision !== model.baselineRevision;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const forced = new URLSearchParams(window.location.search).has("noWebgl");
      if (forced) {
        setFailed(true);
        return;
      }
      if (needsLiveModel || window.matchMedia("(min-width: 1024px)").matches) setActive(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [needsLiveModel]);
  const fallback = (
    <div className="absolute inset-0 flex flex-col">
      <StaticPreview id={model.id} title={model.title} className="min-h-0 flex-1" />
      <div className="m-4 rounded-md border bg-surface p-3 text-sm">
        <p>
          WebGL is unavailable. This poster shows the baseline; current parts and edit controls
          remain available in HTML.
        </p>
        <Button
          className="mt-2"
          onClick={() => {
            setFailed(false);
            setReset((n) => n + 1);
            setActive(true);
          }}
        >
          Retry interactive 3D
        </Button>
      </div>
    </div>
  );
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      aria-label="Model viewport"
      data-testid="model-viewport"
      data-scene-ready={active && ready && !failed}
      onKeyDown={(event) => {
        const target = event.target;
        if (
          event.defaultPrevented ||
          (target instanceof HTMLElement &&
            (target.closest(
              'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="alertdialog"]',
            ) ||
              target.isContentEditable))
        )
          return;
        if (event.key === "Escape") {
          if (queuedRotation.current) queuedRotation.current = null;
          else if (rotationPreview !== null) setRotationPreview(null);
          else if (placement) onCancelPlacement?.();
          else if (exportRequest) {
            setExportRequest(null);
            setExportMessage("Image export cancelled. The model is unchanged.");
          } else if (selectThrough) {
            setPickCandidates([]);
            setSelectThrough(false);
          } else if (contextCommands) setContextCommands(false);
          else return;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.toLowerCase();
        // The workbench owns rotation of an uncommitted catalog placement.
        if (key === "r" && placement) return;
        const namedView = ({ "0": "iso", "1": "front", "2": "right", "3": "top" } as const)[
          key as "0" | "1" | "2" | "3"
        ];
        if (namedView) {
          if (editing && grazingView(namedView)) return;
          event.preventDefault();
          event.stopPropagation();
          setView(namedView);
          setFitSelection(false);
          setFitRequest((value) => value + 1);
          setZoom(1);
          return;
        }
        if (key === "f") {
          event.preventDefault();
          event.stopPropagation();
          setFitSelection(Boolean(selected || props.selectedIds?.length));
          setFitRequest((n) => n + 1);
          setZoom(1);
          return;
        }
        if (key === "v") {
          event.preventDefault();
          event.stopPropagation();
          setRotationPreview(null);
          if (placement) onCancelPlacement?.();
          exitInspection();
          setTool("select");
          setPrimaryOrbit(false);
          return;
        }
        if (readOnlyMode || exploded || props.section || exportRequest) return;
        if (key === "g" && (onMove || props.onReposition)) {
          event.preventDefault();
          event.stopPropagation();
          if (placement) onCancelPlacement?.();
          setRotationPreview(null);
          exitInspection();
          setTool("move");
          setPrimaryOrbit(false);
          return;
        }
        if (key === "r" && (props.onRotate || props.onReposition)) {
          event.preventDefault();
          event.stopPropagation();
          chooseRotation();
        }
      }}
    >
      {tool === "rotate" && !props.onReposition && (!props.mode || props.mode === "build") && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-primary-muted px-3 py-2 text-xs">
          <span>
            Rotate selection · {selectedPart ? "draft quarter-turn preview" : "select a part first"}
          </span>
          <button
            className="button min-h-9 px-2 text-xs"
            disabled={!selected}
            onClick={() => previewRotation(-90)}
          >
            Preview −90°
          </button>
          <button
            className="button min-h-9 px-2 text-xs"
            disabled={!selected}
            onClick={() => previewRotation(90)}
          >
            Preview +90°
          </button>
          <button
            className="button min-h-9 px-2 text-xs"
            disabled={!selected || !rotationPreview || !rotationCurrent}
            onClick={() => {
              if (
                selected &&
                rotationPreview &&
                rotationCurrent &&
                props.onRotate?.(selected, rotationPreview)
              )
                setRotationPreview(null);
            }}
          >
            Apply rotation
          </button>
          <button
            className="button min-h-9 px-2 text-xs"
            onClick={() => {
              setRotationPreview(null);
              setTool("select");
            }}
          >
            Cancel rotation
          </button>
          <span>
            {rotationPreview
              ? rotationCurrent
                ? `${rotationPreview}° preview · Apply to keep this rotation`
                : "Selection or revision changed. Choose a new rotation preview."
              : "Choose a quarter-turn preview"}
          </span>
        </div>
      )}
      {exploded && (
        <div
          className="shrink-0 border-b bg-surface px-3 py-2"
          aria-label="Assembly separation controls"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className="text-xs font-medium">
              <select
                aria-label="Disassembly method"
                className="min-h-9 rounded border bg-surface px-2"
                value={assemblyMode}
                onChange={(event) => {
                  setAssemblyMode(event.target.value as AssemblyViewMode);
                  setFitSelection(false);
                  setAllLayers(false);
                  setAssemblyLayerIndex(null);
                  setPickCandidates([]);
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                {roofAvailable && <option value="roof">Lift the roof</option>}
                <option value="layers">Separate model layers</option>
                {props.assemblyView && <option value="modules">Separate assemblies</option>}
              </select>
            </span>
            {assemblyMode === "layers" && assembly.available && (
              <button
                className="button min-h-9 px-2 text-xs"
                aria-pressed={allLayers}
                onClick={() => {
                  setAllLayers((value) => !value);
                  setFitSelection(false);
                  setPickCandidates([]);
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                {allLayers ? "One layer at a time" : "Show all layers"}
              </button>
            )}
            {!focusedLayer && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Separation
                <input
                  type="range"
                  aria-label="Assembly separation"
                  min="0"
                  max="100"
                  step="1"
                  disabled={!assembly.available}
                  value={Math.round(assemblyAmount * 100)}
                  onChange={(event) => setAssemblyAmount(Number(event.target.value) / 100)}
                  className="w-24 accent-primary"
                />
                <span className="w-8 tabular-nums">{Math.round(assemblyAmount * 100)}%</span>
                <input
                  type="number"
                  aria-label="Assembly separation percent"
                  min="0"
                  max="100"
                  disabled={!assembly.available}
                  value={Math.round(assemblyAmount * 100)}
                  className="min-h-9 w-16 rounded border bg-surface px-2"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value))
                      setAssemblyAmount(Math.max(0, Math.min(100, value)) / 100);
                  }}
                />
              </label>
            )}
            <button className="text-xs font-medium text-primary" onClick={closeAssembly}>
              Reassemble
            </button>
          </div>
          {focusedLayer ? (
            <>
              <div
                className="mt-2 flex flex-wrap items-center justify-center gap-2"
                aria-label="Layer navigation"
              >
                <button
                  className="button min-h-9 px-2 text-xs"
                  disabled={layerIndex === assembly.modules.length - 1}
                  onClick={() => focusLayer(layerIndex + 1)}
                >
                  Previous layer
                </button>
                <select
                  aria-label="Current layer"
                  className="min-h-9 max-w-full rounded border bg-surface px-2 text-xs"
                  value={layerIndex}
                  onChange={(event) => focusLayer(Number(event.target.value))}
                >
                  {assembly.modules
                    .map((layer, index) => (
                      <option key={layer.id} value={index}>
                        {layer.name} · {layer.partIds.length}{" "}
                        {layer.partIds.length === 1 ? "piece" : "pieces"}
                      </option>
                    ))
                    .reverse()}
                </select>
                <button
                  className="button min-h-9 px-2 text-xs"
                  disabled={layerIndex === 0}
                  onClick={() => focusLayer(layerIndex - 1)}
                >
                  Next layer
                </button>
              </div>
              <p className="mt-1 text-center text-xs text-muted-foreground" aria-live="polite">
                Layer {layerIndex + 1} of {assembly.modules.length} · {focusedLayer.partIds.length}{" "}
                {focusedLayer.partIds.length === 1 ? "piece" : "pieces"} shown on the floor. Other
                layers are hidden for this view.
              </p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                From top to bottom · grouped by starting height, not a verified removal order.
              </p>
            </>
          ) : (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {assembly.available
                ? `${assembly.modules.length} sections · ${assemblyMode === "layers" ? "select a piece to trace its layer" : "original positions shown by guide lines"}`
                : assembly.unavailableReason}
            </p>
          )}
          {assembly.unassignedPartCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {assembly.unassignedPartCount} added parts remain in place.
            </p>
          )}
        </div>
      )}
      {placement && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-primary-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-primary">
              <span
                className="size-3 shrink-0 rounded-full border border-foreground/20"
                style={{ backgroundColor: placementColor?.hex }}
              />
              {placement.editing ? "Reposition" : "Place"} {placementPart?.name ?? "part"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {placementColor?.name} ·{" "}
              {placement.target === "ground"
                ? "On the floor"
                : placement.target === "free"
                  ? "Free position"
                  : "Attach to model"}
            </p>
            <p
              className={`mt-1 text-xs font-medium ${feedback?.kind === "blocked" ? "text-danger" : feedback?.kind === "free" ? "text-warning" : "text-muted-foreground"}`}
              aria-label="Placement feedback"
              aria-live="polite"
            >
              {feedback?.message}
            </p>
            {placementPart && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatCentimeters(placementPart.width)} × {formatCentimeters(placementPart.depth)}{" "}
                × {formatCentimeters(placementPart.height)} cm · {placement.transform.rotation}°
              </p>
            )}
          </div>
          <button
            className="icon-button shrink-0"
            aria-label={placement.editing ? "Cancel canvas move" : "Cancel canvas placement"}
            onClick={onCancelPlacement}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div
        role="region"
        aria-label={`Interactive brick model: ${model.title}`}
        aria-describedby="canvas-help"
        className="relative min-h-[360px] flex-1 overflow-hidden bg-background sm:min-h-[430px] lg:min-h-0"
        onPointerDownCapture={(event) => {
          if (event.button === 2) {
            secondaryGesture.current = { x: event.clientX, y: event.clientY, moved: false };
            setContextCommands(false);
          }
        }}
        onPointerMoveCapture={(event) => {
          const gesture = secondaryGesture.current;
          if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4)
            gesture.moved = true;
        }}
        onPointerUpCapture={(event) => {
          if (event.button !== 2) return;
          const gesture = secondaryGesture.current;
          secondaryGesture.current = null;
          if (
            gesture &&
            !gesture.moved &&
            Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 4
          )
            setContextCommands(true);
        }}
        onPointerCancelCapture={() => {
          secondaryGesture.current = null;
        }}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      >
        <div className="viewport-floating-tools pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1 rounded-lg border bg-surface/95 p-1 shadow-sm">
            <button
              className={`button min-h-9 px-2.5 text-xs ${tool === "select" && !primaryOrbit && !placement && !inspection ? "border-primary/30 bg-primary-muted text-primary" : "border-transparent"}`}
              aria-label="Select tool"
              aria-pressed={tool === "select" && !primaryOrbit && !placement && !inspection}
              onClick={() => {
                onCancelPlacement?.();
                exitInspection();
                setTool("select");
                setPrimaryOrbit(false);
              }}
            >
              <MousePointer2 size={15} /> Select
            </button>
            {(onMove || props.onReposition) && (
              <button
                className={`button min-h-9 px-2.5 text-xs ${tool === "move" && !placement ? "border-primary/30 bg-primary-muted text-primary" : "border-transparent"}`}
                aria-label="Move tool"
                aria-pressed={tool === "move" && !placement}
                disabled={
                  exploded ||
                  Boolean(props.section) ||
                  (props.mode !== undefined && props.mode !== "build")
                }
                title={
                  exploded
                    ? "Close exploded view to move parts"
                    : props.onReposition
                      ? "Pick a piece, preview its new position, then Apply move"
                      : "Drag the selection as a draft on the horizontal grid"
                }
                onClick={() => {
                  onCancelPlacement?.();
                  exitInspection();
                  setTool("move");
                  setPrimaryOrbit(false);
                }}
              >
                <Move size={15} /> Move
              </button>
            )}
            {(props.onRotate || props.onReposition) && (
              <button
                className={`button min-h-9 px-2.5 text-xs ${tool === "rotate" && !placement ? "bg-primary-muted text-primary" : "border-transparent"}`}
                aria-label="Rotate tool"
                aria-pressed={tool === "rotate" && !placement}
                disabled={
                  exploded ||
                  Boolean(placement) ||
                  Boolean(props.section) ||
                  (props.mode !== undefined && props.mode !== "build")
                }
                onClick={() => {
                  onCancelPlacement?.();
                  chooseRotation();
                }}
              >
                <RotateCcw size={15} /> Rotate
              </button>
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-1 rounded-lg border bg-surface/95 p-1 shadow-sm">
            <button
              className={`button min-h-9 px-2.5 text-xs ${exploded ? "bg-primary-muted text-primary" : "border-transparent"}`}
              aria-label="Exploded view"
              aria-pressed={exploded}
              disabled={failed || !model.instances.length}
              onClick={() => (exploded ? closeAssembly() : openAssembly("layers"))}
            >
              <Layers3 size={15} />{" "}
              <span className="hidden sm:inline">{exploded ? "Assemble" : "Disassemble"}</span>
            </button>
          </div>
        </div>
        <details
          ref={viewTools}
          className="viewport-advanced-tools absolute left-3 top-[4.25rem] z-20 max-h-[calc(100%-8rem)] max-w-[calc(100%-1.5rem)] overflow-auto rounded-lg border bg-surface/95 shadow-sm"
        >
          <summary
            className="min-h-9 cursor-pointer px-3 py-2 text-xs text-muted-foreground"
            onClick={() => {
              if (!viewTools.current?.open) setSelectThrough(false);
            }}
          >
            View tools
          </summary>
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <button
              className={`button min-h-9 px-2.5 text-xs ${inspection ? "border-primary/30 bg-primary-muted text-primary" : "border-transparent"}`}
              aria-label="Inspect selected brick"
              aria-pressed={inspection}
              disabled={!selectedPart || failed}
              title={
                failed
                  ? "Interactive 3D is unavailable"
                  : !selectedPart
                    ? "Select a brick to inspect its underside"
                    : inspection
                      ? "Return to the complete model"
                      : "Isolate this brick and view its underside"
              }
              onClick={() => {
                if (inspection) {
                  exitInspection();
                  return;
                }
                onCancelPlacement?.();
                setActive(true);
                setTool("select");
                setExploded(false);
                setInspection(true);
                enablePrimaryOrbit();
                setFitRequest((n) => n + 1);
                setZoom(1);
              }}
            >
              <ScanEye size={15} />{" "}
              <span className={props.compactControls ? "sr-only" : undefined}>Inspect</span>
            </button>
            <button
              className={`viewport-icon ${showGrid ? "bg-primary-muted text-primary" : ""}`}
              aria-label="Show workspace grid"
              aria-pressed={showGrid}
              disabled={inspection}
              title={
                inspection ? "Exit brick inspection to show the workspace grid" : "Workspace grid"
              }
              onClick={() => setShowGrid((value) => !value)}
            >
              <Grid2X2 size={17} />
            </button>
            {roofAvailable && (
              <button
                className={`button min-h-8 px-2 text-xs ${exploded && assemblyMode === "roof" ? "bg-primary-muted text-primary" : "border-transparent"}`}
                aria-label="Roof access"
                disabled={failed}
                aria-pressed={exploded && assemblyMode === "roof"}
                title="Lift the complete roof to see inside"
                onClick={() => openAssembly("roof")}
              >
                Roof access
              </button>
            )}
            <label className="text-xs">
              <span className="sr-only">Render quality</span>
              <select
                className="rounded-sm border border-control-border bg-surface px-2 py-1.5"
                value={quality}
                onChange={(e) =>
                  setQuality(
                    e.target.value === "low"
                      ? "low"
                      : e.target.value === "standard"
                        ? "standard"
                        : "studio",
                  )
                }
              >
                <option value="studio">Quality</option>
                <option value="standard">Auto · conservative</option>
                <option value="low">Performance</option>
              </select>
            </label>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 bg-surface px-3 py-1.5 text-xs">
            <label>
              Projection{" "}
              <select
                aria-label="Camera projection"
                className="min-h-9 rounded border bg-surface px-2"
                value={projection}
                onChange={(event) =>
                  setProjection(
                    event.target.value === "perspective" ? "perspective" : "orthographic",
                  )
                }
              >
                <option value="orthographic">Orthographic</option>
                <option value="perspective">Perspective</option>
              </select>
            </label>
            <details className="relative">
              <summary className="button min-h-9 cursor-pointer px-2 text-xs">
                Camera buttons & shortcuts
              </summary>
              <div className="max-w-lg rounded border bg-surface p-3">
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      "orbit-left",
                      "orbit-right",
                      "pan-left",
                      "pan-right",
                      "pan-up",
                      "pan-down",
                    ] as const
                  ).map((kind) => (
                    <button
                      key={kind}
                      className="button min-h-10 px-2 text-xs"
                      onClick={() =>
                        setCameraAction((previous) => ({
                          serial: (previous?.serial ?? 0) + 1,
                          kind,
                        }))
                      }
                    >
                      {kind.replace("-", " ")}
                    </button>
                  ))}
                </div>
                <p className="mt-2 leading-5">
                  Right drag: orbit. Middle drag or Space + primary drag: pan. F: fit selection. V:
                  select. G: move. R: rotate the placement or select Rotate. 0/1/2/3:
                  isometric/front/right/top views. Escape: cancel the current action. Shortcuts
                  apply inside the viewport.
                </p>
              </div>
            </details>
            <button
              className="button min-h-9 px-2 text-xs"
              aria-pressed={selectThrough}
              onClick={() => {
                if (selectThrough) setSelectThrough(false);
                else beginSelectThrough();
              }}
            >
              Select through
            </button>
            {props.mode === "present" && (
              <label>
                Stage{" "}
                <select
                  aria-label="Presentation preset"
                  className="min-h-9 rounded border bg-surface px-2"
                  value={presentationPreset}
                  onChange={(event) => {
                    const value =
                      event.target.value === "warm"
                        ? "warm"
                        : event.target.value === "transparent"
                          ? "transparent"
                          : "neutral";
                    setPresentationPreset(value);
                    setTransparentExport(value === "transparent");
                  }}
                >
                  <option value="neutral">Neutral studio</option>
                  <option value="warm">Warm tabletop</option>
                  <option value="transparent">Transparent background</option>
                </select>
              </label>
            )}
            {props.mode === "present" && (
              <details>
                <summary className="button min-h-9 cursor-pointer px-2 text-xs">Export PNG</summary>
                <div className="flex flex-wrap items-center gap-2 py-2">
                  <p>Complete assembled model · square framing · current camera · local download</p>
                  <select
                    aria-label="PNG size"
                    className="min-h-9 rounded border bg-surface px-2"
                    value={exportSize}
                    onChange={(event) => setExportSize(event.target.value === "2048" ? 2048 : 1024)}
                  >
                    <option value="1024">1024 × 1024</option>
                    <option value="2048">2048 × 2048</option>
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={transparentExport}
                      onChange={(event) => setTransparentExport(event.target.checked)}
                    />{" "}
                    Transparent background
                  </label>
                  <button
                    className="button min-h-9 px-2 text-xs"
                    disabled={!ready || failed || Boolean(exportRequest)}
                    onClick={() => {
                      setExportMessage("");
                      setExportRequest({
                        serial: Date.now(),
                        size: exportSize,
                        transparent: transparentExport,
                      });
                    }}
                  >
                    Download PNG
                  </button>
                  {exportRequest && (
                    <button
                      className="button min-h-9 px-2 text-xs"
                      onClick={() => {
                        setExportRequest(null);
                        setExportMessage("Image export cancelled. The model is unchanged.");
                      }}
                    >
                      Cancel export
                    </button>
                  )}
                  <span aria-live="polite">{exportMessage}</span>
                </div>
              </details>
            )}
          </div>
        </details>
        {failed ? (
          fallback
        ) : active ? (
          <SceneBoundary key={reset} fallback={fallback} onFailure={fail}>
            <Scene
              {...props}
              placement={readOnlyMode ? null : placement}
              exploded={exploded}
              assemblyMode={assemblyMode}
              assemblyAmount={assemblyAmount}
              assemblyFocusId={focusedLayer?.id}
              zoom={zoom}
              quality={quality}
              view={effectiveView}
              fitRequest={fitRequest}
              showGrid={showGrid && props.mode !== "present" && !exportRequest}
              showDimensions={showDimensions && props.mode !== "present" && !exportRequest}
              inspectionPartId={inspectionPartId}
              tool={placement ? "select" : tool}
              projection={projection}
              primaryOrbit={primaryOrbit && !placement}
              cameraAction={cameraAction}
              fitSelection={fitSelection}
              selectThrough={selectThrough}
              onPickCandidates={setPickCandidates}
              exportRequest={exportRequest}
              onExport={exportComplete}
              presentationPreset={props.mode === "present" ? presentationPreset : "neutral"}
              rotationPreview={
                tool === "rotate" &&
                !props.onReposition &&
                rotationCurrent &&
                (!props.mode || props.mode === "build")
                  ? rotationPreview
                  : null
              }
              onFailure={fail}
              onReady={loaded}
              onHover={setHovered}
            />
          </SceneBoundary>
        ) : (
          <>
            <StaticPreview id={model.id} title={model.title} className="absolute inset-0" />
            <div className="absolute inset-x-4 bottom-6 flex flex-col items-center gap-2">
              <Button variant="primary" onClick={() => setActive(true)}>
                <Maximize2 size={17} />
                Activate interactive 3D
              </Button>
              <p className="rounded-sm bg-surface/95 px-3 py-1 text-xs text-muted-foreground">
                Baseline poster · activate 3D to see local edits. Precision placement is best on
                desktop.
              </p>
            </div>
          </>
        )}
        {model.instances.length === 0 && !failed && !placement && (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center">
            <h2 className="text-xl">Every idea starts with one brick.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a part to add it to your workspace.
            </p>
          </div>
        )}
        {selectThrough && (
          <div
            role="region"
            aria-label="Select through parts"
            className="absolute left-3 top-28 z-10 max-h-56 max-w-[calc(100%-1.5rem)] overflow-auto rounded border bg-surface p-3 text-xs shadow-md"
          >
            <p className="mb-2">
              Click the model to narrow the list to overlapping surfaces, or choose a model part.
            </p>
            <label className="mb-2 block">
              {pickCandidates.length ? "Choose an overlapping part" : "Choose a model part"}
              <select
                ref={selectThroughChooser}
                className="field mt-1 w-full"
                value=""
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || event.defaultPrevented) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectThrough(false);
                  setPickCandidates([]);
                  viewTools.current?.querySelector("summary")?.focus();
                }}
                onChange={(event) => {
                  props.onSelect(event.target.value, props.multiSelect);
                  setSelectThrough(false);
                  setPickCandidates([]);
                }}
              >
                <option value="" disabled>
                  Choose a part…
                </option>
                {selectThroughParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {partDefinitions.find((definition) => definition.id === part.partId)?.name ??
                      "Part"}
                    {" · "}
                    {colors.find((color) => color.id === part.colorId)?.name ?? part.colorId}
                    {" · "}
                    {part.id}
                  </option>
                ))}
              </select>
            </label>
            <button className="button min-h-9 px-2 text-xs" onClick={() => setSelectThrough(false)}>
              Close select through
            </button>
          </div>
        )}
        <Dialog
          open={contextCommands}
          onOpenChange={setContextCommands}
          title="Context commands"
          description="Commands for the current selection. Secondary dragging orbits without opening these commands."
        >
          <div className="grid gap-2">
            <button
              className="button min-h-10 px-3 text-xs"
              onClick={() => {
                setFitSelection(Boolean(selected));
                setFitRequest((n) => n + 1);
                setZoom(1);
                setContextCommands(false);
              }}
            >
              Fit {selected ? "selection" : "model"}
            </button>
            <button
              className="button min-h-10 px-3 text-xs"
              onClick={() => {
                beginSelectThrough();
                setContextCommands(false);
              }}
            >
              Select through
            </button>
            <button
              className="button min-h-10 px-3 text-xs"
              onClick={() => setContextCommands(false)}
            >
              Close context commands
            </button>
          </div>
        </Dialog>
        <div className="pointer-events-none absolute right-4 top-[4.5rem] text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {model.instances.length.toLocaleString("en")}{" "}
            {model.instances.length === 1 ? "piece" : "pieces"}
          </span>
          <span className="ml-2 opacity-70">
            {inspection
              ? "Single brick inspection"
              : exploded
                ? assemblyMode === "roof"
                  ? "Roof access"
                  : "Assembly view"
                : "Design view"}
          </span>
        </div>
        {inspection && (
          <div className="absolute inset-x-4 top-28 mx-auto flex min-h-9 w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-primary/25 bg-surface/95 px-3 py-1 shadow-sm">
            <p className="min-w-0 text-xs text-primary sm:whitespace-nowrap" aria-live="polite">
              Inspecting one brick · drag to view underneath
            </p>
            <button
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-primary-muted hover:text-primary"
              aria-label="Exit brick inspection"
              title="Return to the complete model"
              onClick={exitInspection}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {active && !failed && (
          <div className="viewport-floating-camera pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center justify-between gap-2">
            <div
              className="pointer-events-auto flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border bg-surface/95 p-1 shadow-sm"
              aria-label="Camera views"
            >
              <select
                aria-label="Camera view"
                className="min-h-9 rounded border-0 bg-surface px-2 text-xs"
                value={effectiveView}
                onChange={(event) => {
                  setFitSelection(false);
                  setView(event.target.value as CameraView);
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                {(
                  [
                    ["iso", "Isometric"],
                    ["front", "Front"],
                    ["top", "Top"],
                    ["right", "Right"],
                    ["back", "Back"],
                    ["left", "Left"],
                    ["bottom", "Bottom"],
                  ] as const
                ).map(([value, label]) => (
                  <option key={value} value={value} disabled={editing && grazingView(value)}>
                    {label} view
                  </option>
                ))}
              </select>
              <button
                className={`button min-h-9 px-2 text-xs ${primaryOrbit && !placement ? "border-primary/30 bg-primary-muted text-primary" : "button-quiet"}`}
                aria-label="Navigate camera"
                aria-pressed={primaryOrbit && !placement}
                onClick={() => {
                  onCancelPlacement?.();
                  setTool("select");
                  if (primaryOrbit) setPrimaryOrbit(false);
                  else enablePrimaryOrbit();
                }}
              >
                <Move size={14} /> Orbit
              </button>
            </div>
            <div
              className="pointer-events-auto flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border bg-surface/95 p-1 shadow-sm"
              aria-label="View controls"
            >
              <button
                className={`viewport-icon ${showDimensions ? "bg-primary-muted text-primary" : ""}`}
                aria-label="Show dimensions"
                aria-pressed={showDimensions}
                disabled={exploded}
                title="Dimensions in centimeters"
                onClick={() => setShowDimensions((value) => !value)}
              >
                <Ruler size={16} />
              </button>
              <span className="mx-1 h-4 border-l" />
              <button
                className="button button-quiet min-h-9 px-2"
                aria-label="Fit model to view"
                title="Fit model"
                onClick={() => {
                  setFitSelection(false);
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                <Scan size={17} />
                <span className="text-xs">Fit</span>
              </button>
              <button
                className="button min-h-9 px-2 text-xs"
                aria-label="Fit selection"
                disabled={
                  !selected || Boolean(focusedLayer && !focusedLayer.partIds.includes(selected))
                }
                onClick={() => {
                  setFitSelection(true);
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                Focus
              </button>
              <button
                className="viewport-icon"
                aria-label="Zoom out model"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              >
                <ZoomOut size={17} />
              </button>
              <button
                className="viewport-icon"
                aria-label="Zoom in model"
                onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              >
                <ZoomIn size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div
        id="canvas-help"
        className="flex min-h-7 flex-wrap items-center justify-between gap-1 border-t bg-surface px-3 py-1 text-xs text-muted-foreground"
      >
        <span role="status">
          {elevationEditing && "Isometric view for horizontal-grid editing. "}
          {active && ready && !failed
            ? inspection
              ? "Drag to orbit · Scroll to zoom · Exit inspection to build"
              : placement
                ? (feedback?.message ?? "Choose a placement")
                : exploded
                  ? focusedLayer
                    ? "One layer at a time · Next layer moves downward · Reassemble restores the model"
                    : "Sections stay together · Reassemble restores the model"
                  : tool === "move"
                    ? props.onReposition
                      ? "Pick a piece, preview its position, then Apply move · Escape cancels"
                      : "Drag the selection as a draft · snaps every 0.4 cm · Escape cancels"
                    : tool === "rotate" && props.onReposition
                      ? "Pick a piece to preview a quarter turn · Apply move keeps it"
                      : primaryOrbit
                        ? "Drag to orbit · scroll to zoom · choose Select to build"
                        : "Click a part to select it · choose Move to reposition · scroll to zoom"
            : "Local model viewer"}
        </span>
        <span className="hidden 2xl:inline">{hovered ? "Part under pointer" : ""}</span>
      </div>
    </section>
  );
}
