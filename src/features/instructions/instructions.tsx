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
import { Dialog } from "@/components/ui/dialog";
import { GeneratedInstructions } from "./generated-instructions";
export function Instructions() {
  const {
    id,
    model,
    entry,
    invalid,
    loadError,
    draftInstructions,
    generateInstructions,
    editInstructions,
    instructionsHistory,
    canUndoInstructions,
    canRedoInstructions,
    hasInstructionEdits,
    message,
  } = useProject();
  const [showCurated, setShowCurated] = useState(false);
  const [step, setStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [confirmGeneration, setConfirmGeneration] = useState(false);
  const [generation, setGeneration] = useState(0);
  function generate(replaceEdited = false) {
    if (hasInstructionEdits && !replaceEdited) {
      setConfirmGeneration(true);
      return false;
    }
    if (!generateInstructions({ replaceEdited })) return false;
    setConfirmGeneration(false);
    setShowCurated(false);
    setGeneration((value) => value + 1);
    return true;
  }
  const generationDialog = (
    <Dialog
      open={confirmGeneration}
      onOpenChange={setConfirmGeneration}
      title="Replace edited instructions?"
      description="Generating again replaces your step names, notes, saved views and sequence with a new guide from the current model. Your model pieces stay unchanged."
    >
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setConfirmGeneration(false)}>Keep my steps</Button>
        <Button variant="primary" onClick={() => generate(true)}>
          Replace with generated steps
        </Button>
      </div>
    </Dialog>
  );
  if (!model || !entry)
    return (
      <div className="page-wrap" role="status">
        {loadError || "Opening your model…"}
      </div>
    );
  const sample = entry.fixture.instructions;
  const fallbackNotice = invalid ? (
    <p role="status" className="notice rounded-none">
      Unknown project. Showing the courtyard sample.
    </p>
  ) : null;
  if (draftInstructions && !showCurated)
    return (
      <>
        {generationDialog}
        {fallbackNotice}
        <GeneratedInstructions
          key={generation}
          id={id}
          model={model}
          draft={draftInstructions}
          onGenerate={() => generate()}
          onEdit={editInstructions}
          onHistory={instructionsHistory}
          canUndo={canUndoInstructions}
          canRedo={canRedoInstructions}
          edited={hasInstructionEdits}
          feedback={message}
          onCurated={sample ? () => setShowCurated(true) : undefined}
        />
      </>
    );
  if (!showCurated || !sample)
    return (
      <>
        {generationDialog}
        <ProjectNavigation id={id} active="instructions" />
        {fallbackNotice}
        <div className="page-wrap">
          <BookOpen size={36} className="mb-5 text-primary" />
          <p className="eyebrow mb-2">Your model, piece by piece</p>
          <h1 className="text-2xl">{model.title}</h1>
          <p className="my-5 text-muted-foreground">
            Create a step-by-step draft from your current {model.instances.length}{" "}
            {model.instances.length === 1 ? "piece" : "pieces"}. Each step highlights what to add
            and shows where it goes, with an overhead view to help line up the studs.
          </p>
          <Button
            variant="primary"
            disabled={!model.instances.length}
            onClick={() => {
              generate();
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
          {sample && (
            <div className="mt-8 border-t pt-5">
              <Button onClick={() => setShowCurated(true)}>Original sample instructions</Button>
              <p className="mt-2 text-xs text-muted-foreground">
                A separate overview of the original example; it does not include your edits.
              </p>
            </div>
          )}
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
      {generationDialog}
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
          {draftInstructions && (
            <Button onClick={() => setShowCurated(false)}>Back to my instructions</Button>
          )}
          <Button
            variant="primary"
            disabled={!model.instances.length}
            onClick={() => {
              generate();
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
      {fallbackNotice}
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
