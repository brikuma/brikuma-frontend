"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  ZoomIn,
  ZoomOut,
  BookOpen,
  Layers3,
  AlertTriangle,
} from "lucide-react";
import { useProject } from "@/features/editor/state/session";
import { isInstructionCompatible, deriveBom } from "@/core/model/public";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { ModelPoster } from "@/components/model-poster";
import { ProjectNavigation } from "@/components/shell/project-navigation";
import { Button } from "@/components/ui/button";
import { GeneratedInstructions } from "./generated-instructions";
export function Instructions() {
  const { id, model, entry, invalid, loadError, draftInstructions, generateInstructions } =
    useProject();
  const [showCurated, setShowCurated] = useState(false);
  const [step, setStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  if (!model || !entry)
    return (
      <div className="page-wrap" role="status">
        {loadError || "Opening instruction sample…"}
      </div>
    );
  const sample = entry.fixture.instructions;
  if (draftInstructions && !showCurated)
    return (
      <GeneratedInstructions
        id={id}
        model={model}
        draft={draftInstructions}
        onGenerate={generateInstructions}
        onCurated={sample ? () => setShowCurated(true) : undefined}
      />
    );
  if (!sample)
    return (
      <>
        <ProjectNavigation id={id} active="instructions" />
        <div className="page-wrap">
          <BookOpen size={36} className="mb-5 text-primary" />
          <h1 className="text-2xl">Build your model, piece by piece.</h1>
          <p className="my-5 text-muted-foreground">
            Generate a local instruction draft from the pieces in your model. The guide shows each
            layer, highlights new pieces and lists their quantities.
          </p>
          <Button
            variant="primary"
            disabled={!model.instances.length}
            onClick={() => {
              generateInstructions();
              setShowCurated(false);
            }}
          >
            Generate instructions
          </Button>
          {!model.instances.length && (
            <p className="mt-4 text-sm text-muted-foreground">
              Add pieces in the editor first, then return here to create your guide.
            </p>
          )}
          <Link
            href={`/editor/?project=${id}`}
            className="ml-4 text-sm underline underline-offset-4"
          >
            Return to editor
          </Link>
        </div>
      </>
    );
  const stepIndex = Math.min(step, sample.steps.length - 1);
  const active = sample.steps[stepIndex];
  const stale = !isInstructionCompatible(model, sample.modelRevision);
  const additions = deriveBom({
    ...entry.fixture.model,
    instances: entry.fixture.model.instances.filter((part) => active.newPartIds.includes(part.id)),
  });
  return (
    <>
      <ProjectNavigation id={id} active="instructions" />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-surface px-5 py-4">
        <div>
          <p className="eyebrow mb-2">An idea, piece by piece</p>
          <h1 className="text-xl">{model.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Model {model.revision} · Instruction sample {sample.revision}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={!model.instances.length}
            onClick={() => {
              generateInstructions();
              setShowCurated(false);
            }}
          >
            Generate from current model
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            Print layout preview
          </Button>
        </div>
      </div>
      {invalid && (
        <p className="notice rounded-none">Unknown project. Showing the courtyard sample.</p>
      )}
      {stale && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-b bg-warning-muted px-5 py-3 text-sm text-warning"
        >
          <p className="flex items-center gap-2">
            <AlertTriangle size={17} />
            Instruction sample belongs to the original revision. Showing baseline{" "}
            {sample.modelRevision}.
          </p>
          <Link href={`/editor/?project=${id}`} className="underline underline-offset-4">
            Return to editor
          </Link>
        </div>
      )}
      <div className="grid min-w-0 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav
          aria-label="Instruction steps"
          className="no-print flex gap-3 overflow-x-auto border-b bg-surface p-4 lg:flex-col lg:border-r lg:border-b-0"
        >
          {sample.steps.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setStep(index)}
              aria-current={index === stepIndex ? "step" : undefined}
              className={`min-w-32 rounded-md border p-2 text-left ${index === stepIndex ? "border-primary bg-primary-muted" : "border-border bg-background"}`}
            >
              <ModelPoster
                id={id}
                src={item.preview}
                title={`Step ${index + 1}`}
                className="hidden h-24 lg:flex"
              />
              <p className="mt-1 text-xs font-medium">
                {String(index + 1).padStart(2, "0")} · {item.title}
              </p>
            </button>
          ))}
        </nav>
        <div className="min-w-0 p-4 md:p-7">
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Step {stepIndex + 1} of {sample.steps.length} · Baseline layout
            </p>
            <div className="flex items-center gap-1">
              <button
                className="icon-button"
                aria-label="Zoom out instructions"
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              >
                <ZoomOut size={18} />
              </button>
              <span className="w-12 text-center text-xs tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="icon-button"
                aria-label="Zoom in instructions"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.25))}
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>
          <article className="instruction-sheet mx-auto max-w-5xl overflow-hidden rounded-lg border bg-surface shadow-sm">
            <div className="flex items-start justify-between border-b p-5 md:p-8">
              <div>
                <p className="eyebrow mb-3">BRIKUMA · Original study</p>
                <h2 className="text-2xl">{active.title}</h2>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">{active.description}</p>
              </div>
              <span className="ml-3 font-mono text-4xl text-primary">
                {String(stepIndex + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="overflow-auto">
              <div
                style={{
                  width: `${zoom * 100}%`,
                  minWidth: zoom > 1 ? `${zoom * 100}%` : undefined,
                }}
              >
                <ModelPoster
                  id={id}
                  title={`Instruction step ${stepIndex + 1}: ${active.title}`}
                  src={active.preview}
                  className="mx-auto"
                  style={{ height: `${430 * zoom}px` }}
                />
              </div>
              <div className="mx-auto max-w-2xl px-5 pb-4 text-center text-sm text-muted-foreground">
                <Layers3 className="mr-2 inline-block" size={16} />
                {active.callout}
              </div>
            </div>
            <div className="border-t bg-background p-5">
              <p className="eyebrow mb-3">New in this step · {active.newPartIds.length} pieces</p>
              <ul className="flex flex-wrap gap-3">
                {additions.map((line) => (
                  <li
                    key={`${line.partId}-${line.colorId}`}
                    className="flex items-center gap-2 rounded-md border bg-surface px-3 py-2 text-xs"
                  >
                    <span
                      className="size-3 rounded-sm border border-control-border"
                      style={{ backgroundColor: colors.find((c) => c.id === line.colorId)?.hex }}
                    />
                    <span>
                      {partDefinitions.find((p) => p.id === line.partId)?.name}
                      <span className="block text-muted-foreground">
                        {colors.find((c) => c.id === line.colorId)?.name}
                      </span>
                    </span>
                    <strong className="ml-2 tabular-nums">×{line.quantity}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
              <span>Curated subassembly sequence · not production build instructions</span>
              <span>
                {sample.revision} / {sample.modelRevision}
              </span>
            </div>
          </article>
          <div className="no-print mx-auto mt-5 flex max-w-5xl items-center justify-between">
            <Button disabled={stepIndex === 0} onClick={() => setStep(stepIndex - 1)}>
              <ArrowLeft size={16} />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {active.visiblePartIds.length} pieces shown
            </span>
            <Button
              variant="primary"
              disabled={stepIndex === sample.steps.length - 1}
              onClick={() => setStep(stepIndex + 1)}
            >
              Next step
              <ArrowRight size={16} />
            </Button>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Original renderings of the same baseline scene data. Printing opens a local browser
            layout, not a generated PDF export.
          </p>
        </div>
      </div>
    </>
  );
}
