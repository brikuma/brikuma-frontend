"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { partDefinitions, colors } from "@/fixtures/catalog";
import { placementFeedback } from "../placement-feedback";
import { createAssemblyView, type AssemblyViewMode } from "../assembly-view";
import type {
  CameraView,
  ModelViewportProps,
  RenderQuality,
  ViewportTool,
} from "../viewport-types";
const Scene = dynamic(() => import("../scene/model-scene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Opening the interactive model…
    </div>
  ),
});
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function ModelViewport(props: ModelViewportProps) {
  const { model, selected, placement, onCancelPlacement, onMove } = props;
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [assemblyMode, setAssemblyMode] = useState<AssemblyViewMode>("modules");
  const [assemblyAmount, setAssemblyAmount] = useState(0.7);
  const assembly = useMemo(
    () =>
      createAssemblyView(model, partDefinitions, props.assemblyView, assemblyMode, assemblyAmount),
    [model, props.assemblyView, assemblyMode, assemblyAmount],
  );
  const roofAvailable = useMemo(
    () => createAssemblyView(model, partDefinitions, props.assemblyView, "roof", 1).available,
    [model, props.assemblyView],
  );
  const [zoom, setZoom] = useState(1);
  const [reset, setReset] = useState(0);
  const [quality, setQuality] = useState<RenderQuality>("studio");
  const [view, setView] = useState<CameraView>("iso");
  const [fitRequest, setFitRequest] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [tool, setTool] = useState<ViewportTool>("select");
  const [inspection, setInspection] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const selectedPart = model.instances.find((part) => part.id === selected);
  const inspectionPartId = inspection && selectedPart && !placement ? selectedPart.id : null;
  const editing = Boolean(placement) || tool === "move";
  const elevationEditing = editing && (view === "front" || view === "right");
  const effectiveView = elevationEditing ? "iso" : view;
  const fail = useCallback(() => {
    setFailed(true);
    setInspection(false);
  }, []);
  const loaded = useCallback(() => setReady(true), []);
  const placementPart = partDefinitions.find((part) => part.id === placement?.partId);
  const placementColor = colors.find((color) => color.id === placement?.colorId);
  const feedback = placement ? placementFeedback(model, partDefinitions, placement) : null;
  if (placement && exploded) setExploded(false);
  if (inspection && (placement || !selectedPart)) {
    setInspection(false);
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  function exitInspection() {
    if (!inspection) return;
    setInspection(false);
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  function openAssembly(mode: AssemblyViewMode) {
    setActive(true);
    onCancelPlacement?.();
    exitInspection();
    setTool("select");
    setAssemblyMode(mode);
    setAssemblyAmount(mode === "roof" ? 1 : 0.7);
    setExploded((open) => (mode === assemblyMode ? !open : true));
    setFitRequest((n) => n + 1);
    setZoom(1);
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const forced = new URLSearchParams(window.location.search).has("noWebgl");
      if (forced) {
        setFailed(true);
        return;
      }
      if (window.matchMedia("(min-width: 1024px)").matches) setActive(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const fallback = (
    <div className="absolute inset-0 flex flex-col">
      <ModelPoster id={model.id} title={model.title} className="min-h-0 flex-1" />
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
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Model viewport">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-surface px-3 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <button
            className={`button min-h-9 px-2.5 text-xs ${tool === "select" && !placement && !inspection ? "border-primary/30 bg-primary-muted text-primary" : "border-transparent"}`}
            aria-label="Select tool"
            aria-pressed={tool === "select" && !placement && !inspection}
            onClick={() => {
              onCancelPlacement?.();
              exitInspection();
              setTool("select");
            }}
          >
            <MousePointer2 size={15} /> Select
          </button>
          {onMove && (
            <button
              className={`button min-h-9 px-2.5 text-xs ${tool === "move" && !placement ? "border-primary/30 bg-primary-muted text-primary" : "border-transparent"}`}
              aria-label="Move tool"
              aria-pressed={tool === "move" && !placement}
              disabled={exploded}
              title={
                exploded
                  ? "Close exploded view to move parts"
                  : "Drag a part on the horizontal grid"
              }
              onClick={() => {
                onCancelPlacement?.();
                exitInspection();
                setTool("move");
              }}
            >
              <Move size={15} /> Move
            </button>
          )}
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
              setFitRequest((n) => n + 1);
              setZoom(1);
            }}
          >
            <ScanEye size={15} /> Inspect
          </button>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
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
          <button
            className={`button min-h-8 px-2 text-xs ${exploded && assemblyMode === "modules" ? "bg-primary-muted text-primary" : "border-transparent"}`}
            aria-label="Exploded view"
            aria-pressed={exploded && assemblyMode === "modules"}
            disabled={failed || !props.assemblyView || !model.instances.length}
            title={
              props.assemblyView
                ? "Separate complete assembly modules along their guides"
                : "No assembly modules are defined for this free-form model"
            }
            onClick={() => openAssembly("modules")}
          >
            <Layers3 size={15} /> Assembly
          </button>
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
              <option value="studio">Studio quality</option>
              <option value="standard">Balanced</option>
              <option value="low">Performance</option>
            </select>
          </label>
        </div>
      </div>
      {exploded && (
        <div
          className="shrink-0 border-b bg-surface px-3 py-2"
          aria-label="Assembly separation controls"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className="text-xs font-medium">
              {assemblyMode === "roof" ? "Roof access" : "Assembly view"}
            </span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Separation
              <input
                type="range"
                aria-label="Assembly separation"
                min="0"
                max="100"
                step="1"
                value={Math.round(assemblyAmount * 100)}
                onChange={(event) => setAssemblyAmount(Number(event.target.value) / 100)}
                className="w-24 accent-primary"
              />
              <span className="w-8 tabular-nums">{Math.round(assemblyAmount * 100)}%</span>
            </label>
            <button
              className="text-xs font-medium text-primary"
              onClick={() => {
                setExploded(false);
                setFitRequest((n) => n + 1);
                setZoom(1);
              }}
            >
              Reassemble
            </button>
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {assembly.modules.map((module) => module.name).join(" · ")}
          </p>
          {assembly.unassignedPartCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {assembly.unassignedPartCount} added parts remain in place.
            </p>
          )}
        </div>
      )}
      <div
        role="region"
        aria-label={`Interactive brick model: ${model.title}`}
        aria-describedby="canvas-help"
        className="relative min-h-[360px] flex-1 overflow-hidden bg-background sm:min-h-[430px] lg:min-h-0"
      >
        {failed ? (
          fallback
        ) : active ? (
          <SceneBoundary key={reset} fallback={fallback}>
            <Scene
              {...props}
              exploded={exploded}
              assemblyMode={assemblyMode}
              assemblyAmount={assemblyAmount}
              zoom={zoom}
              quality={quality}
              view={effectiveView}
              fitRequest={fitRequest}
              showGrid={showGrid}
              showDimensions={showDimensions}
              inspectionPartId={inspectionPartId}
              tool={placement ? "select" : tool}
              onFailure={fail}
              onReady={loaded}
              onHover={setHovered}
            />
          </SceneBoundary>
        ) : (
          <>
            <ModelPoster id={model.id} title={model.title} className="absolute inset-0" />
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
          <div className="pointer-events-none absolute inset-x-4 top-8 text-center">
            <h2 className="text-xl">Every idea starts with one brick.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a part to add it to your workspace.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute left-5 top-5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {model.instances.length.toLocaleString("en")} pieces
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
          <div className="absolute inset-x-4 top-12 mx-auto flex min-h-9 w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-primary/25 bg-surface/95 px-3 py-1 shadow-sm">
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
        {placement && (
          <div className="absolute inset-x-4 top-12 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg border border-primary/25 bg-surface/95 px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-medium text-primary">
                <span
                  className="size-3 shrink-0 rounded-full border border-foreground/20"
                  style={{ backgroundColor: placementColor?.hex }}
                />
                Place {placementPart?.name ?? "part"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {placementColor?.name} ·{" "}
                {placement.target === "ground"
                  ? "Ground plane"
                  : placement.target === "free"
                    ? "Free placement"
                    : "Snap to studs"}
              </p>
              <p
                className={`mt-1 text-xs font-medium ${feedback?.allowed ? "text-success" : "text-danger"}`}
                aria-live="polite"
              >
                {feedback?.message}
              </p>
              {placementPart && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {placementPart.width} × {placementPart.depth} × {placementPart.height} studs ·{" "}
                  {placement.transform.rotation}°
                </p>
              )}
            </div>
            <button
              className="icon-button shrink-0"
              aria-label="Cancel canvas placement"
              onClick={onCancelPlacement}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {active && !failed && (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
            <div
              className="flex max-w-full flex-wrap items-center gap-0.5 rounded-md border border-border/60 bg-surface/95 p-1 shadow-sm"
              aria-label="Camera views"
            >
              {(
                [
                  ["iso", "Isometric"],
                  ["front", "Front"],
                  ["top", "Top"],
                  ["right", "Right"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`min-h-8 rounded-sm px-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-45 ${effectiveView === value ? "bg-primary-muted font-medium text-primary" : "text-muted-foreground hover:bg-background"}`}
                  aria-label={`${label} view`}
                  aria-pressed={effectiveView === value}
                  disabled={editing && (value === "front" || value === "right")}
                  title={
                    editing && (value === "front" || value === "right")
                      ? placement
                        ? "Finish or cancel placement to use elevation views"
                        : "Use Select to view elevations"
                      : `${label} view`
                  }
                  onClick={() => {
                    setView(value);
                    setFitRequest((n) => n + 1);
                    setZoom(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="flex max-w-full flex-wrap items-center gap-0.5 rounded-md border border-border/60 bg-surface/95 p-1 shadow-sm"
              aria-label="View controls"
            >
              <button
                className={`viewport-icon ${showDimensions ? "bg-primary-muted text-primary" : ""}`}
                aria-label="Show dimensions"
                aria-pressed={showDimensions}
                disabled={exploded}
                title="Dimensions in studs"
                onClick={() => setShowDimensions((value) => !value)}
              >
                <Ruler size={16} />
              </button>
              <span className="mx-1 h-4 border-l" />
              <button
                className="viewport-icon"
                aria-label="Reset camera"
                onClick={() => {
                  setView("iso");
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className="viewport-icon"
                aria-label="Fit model to view"
                title="Fit model"
                onClick={() => {
                  setFitRequest((n) => n + 1);
                  setZoom(1);
                }}
              >
                <Scan size={17} />
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
                  ? "Modules stay intact · dashed guides show their original positions"
                  : tool === "move"
                    ? "Drag a brick to move · ½-stud grid · Height in inspector"
                    : "Drag to orbit · Scroll to zoom · Click a brick"
            : "Local model viewer"}
        </span>
        <span className="hidden 2xl:inline">
          {hovered ? hovered : "HTML selection in Structure & inspector"}
        </span>
      </div>
    </section>
  );
}
