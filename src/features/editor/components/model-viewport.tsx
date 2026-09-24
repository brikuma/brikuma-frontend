"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, RotateCcw, ZoomIn, ZoomOut, Layers3, Maximize2 } from "lucide-react";
import type { Model } from "@/core/model/public";
import { ModelPoster } from "@/components/model-poster";
import { Button } from "@/components/ui/button";
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
export function ModelViewport({
  model,
  selected,
  onSelect,
  hidden,
}: {
  model: Model;
  selected: string | null;
  onSelect: (id: string) => void;
  hidden: readonly string[];
}) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [reset, setReset] = useState(0);
  const [quality, setQuality] = useState<"low" | "standard">("standard");
  const fail = useCallback(() => setFailed(true), []);
  const loaded = useCallback(() => setReady(true), []);
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
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-surface px-3">
        <div className="flex items-center gap-1">
          <span className="tag mr-2 hidden sm:inline-flex">
            <Box size={14} /> Perspective study
          </span>
          <button
            className="icon-button"
            aria-label="Reset camera"
            onClick={() => {
              setReset((n) => n + 1);
              setZoom(1);
            }}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom out model"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          >
            <ZoomOut size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom in model"
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          >
            <ZoomIn size={17} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`icon-button ${exploded ? "bg-primary-muted text-primary" : ""}`}
            aria-label="Exploded view"
            aria-pressed={exploded}
            onClick={() => setExploded((v) => !v)}
          >
            <Layers3 size={18} />
          </button>
          <label className="text-xs">
            <span className="sr-only">Render quality</span>
            <select
              className="rounded-sm border border-control-border bg-surface px-2 py-1.5"
              value={quality}
              onChange={(e) => setQuality(e.target.value === "low" ? "low" : "standard")}
            >
              <option value="standard">Standard</option>
              <option value="low">Low detail</option>
            </select>
          </label>
        </div>
      </div>
      <div
        role="region"
        aria-label={`Interactive brick model: ${model.title}`}
        aria-describedby="canvas-help"
        className="viewport-grid relative min-h-[360px] flex-1 overflow-hidden bg-background sm:min-h-[430px] lg:min-h-0"
      >
        {failed ? (
          fallback
        ) : active ? (
          <SceneBoundary key={reset} fallback={fallback}>
            <Scene
              model={model}
              selected={selected}
              onSelect={onSelect}
              hidden={hidden}
              exploded={exploded}
              zoom={zoom}
              quality={quality}
              onFailure={fail}
              onReady={loaded}
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
        {model.instances.length === 0 && !failed && (
          <div className="pointer-events-none absolute inset-x-4 top-8 text-center">
            <h2 className="text-xl">Every idea starts with one brick.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a part to add it to your workspace.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute left-4 top-4 rounded-sm bg-surface px-2 py-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{model.title}</span>
          <span className="mt-0.5 block">
            Original demo geometry · {model.instances.length} pieces
          </span>
        </div>
        <span className="pointer-events-none absolute bottom-4 right-4 hidden size-11 sm:flex items-center justify-center rounded-md border bg-surface/90 font-mono text-xs text-muted-foreground">
          XYZ
        </span>
      </div>
      <div
        id="canvas-help"
        className="flex min-h-7 flex-wrap items-center justify-between gap-1 border-t bg-surface px-3 py-1 text-xs text-muted-foreground"
      >
        <span>
          {active && ready && !failed
            ? "Drag to orbit · Scroll to zoom · Click a brick"
            : "Local model viewer"}
        </span>
        <span>HTML selection in Structure & inspector</span>
      </div>
    </section>
  );
}
