"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Printer, RefreshCw } from "lucide-react";
import { deriveBom, isBuildPlanCurrent, type Model } from "@/core/model/public";
import type { DraftInstructions } from "@/features/editor/state/session";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { ProjectNavigation } from "@/components/shell/project-navigation";
import { BuildStepDrawing } from "./build-step-drawing";

export function GeneratedInstructions({
  id,
  model,
  draft,
  onGenerate,
  onCurated,
}: {
  id: string;
  model: Model;
  draft: DraftInstructions;
  onGenerate: () => boolean;
  onCurated?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const plan = draft.plan;
  const stale = !isBuildPlanCurrent(model, plan);
  const stepIndex = Math.min(index, plan.steps.length - 1);
  const step = plan.steps[stepIndex];
  const added = new Set(step.newPartIds);
  const additions = deriveBom({
    ...draft.sourceModel,
    instances: draft.sourceModel.instances.filter((part) => added.has(part.id)),
  });
  function regenerate() {
    if (onGenerate()) setIndex(0);
  }
  return (
    <>
      <ProjectNavigation id={id} active="instructions" />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-surface px-5 py-4">
        <div>
          <p className="eyebrow mb-2">Your model, piece by piece</p>
          <h1 className="text-xl">{draft.sourceModel.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Local instruction draft · {plan.pieceCount} {plan.pieceCount === 1 ? "piece" : "pieces"}{" "}
            · {plan.layerCount} {plan.layerCount === 1 ? "layer" : "layers"} · {plan.steps.length}{" "}
            {plan.steps.length === 1 ? "step" : "steps"}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button disabled={!model.instances.length} onClick={regenerate}>
            <RefreshCw size={16} />
            Regenerate instructions
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            Print current step
          </Button>
          {onCurated && <Button onClick={onCurated}>Original sample instructions</Button>}
        </div>
      </div>
      {stale && (
        <p role="status" className="notice rounded-none">
          These instructions are out of date. They show {plan.modelRevision}; your current model is{" "}
          {model.revision}. Regenerate to include your changes.
        </p>
      )}
      <p className="border-b bg-background px-5 py-3 text-sm text-muted-foreground">
        Generated locally from your placed pieces, ordered by height. Review connections and
        overlaps before following this draft; assembly order and physical stability are not
        verified.{" "}
        {plan.uncheckedPartIds.length > 0 &&
          `${plan.uncheckedPartIds.length} ${plan.uncheckedPartIds.length === 1 ? "piece uses" : "pieces use"} geometry outside the supported connection checks.`}
      </p>
      <div className="grid min-w-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Instruction steps"
          className="no-print flex gap-2 overflow-x-auto border-b bg-surface p-3 lg:max-h-[75vh] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          {plan.steps.map((item, itemIndex) => (
            <button
              key={item.id}
              onClick={() => setIndex(itemIndex)}
              aria-current={itemIndex === stepIndex ? "step" : undefined}
              className={`min-w-36 rounded-md border p-3 text-left text-xs ${itemIndex === stepIndex ? "border-primary bg-primary-muted" : "border-border"}`}
            >
              <strong className="block">
                {itemIndex + 1}. {item.title}
              </strong>
              <span className="mt-1 block text-muted-foreground">
                {item.visiblePartIds.length} {item.visiblePartIds.length === 1 ? "piece" : "pieces"}{" "}
                assembled
              </span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 p-4 md:p-6">
          <div className="no-print mb-4 flex items-center justify-between gap-2">
            <p className="text-sm">
              Step {stepIndex + 1} of {plan.steps.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                aria-label="Zoom out instructions"
                disabled={zoom <= 0.75}
                onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
              >
                −
              </Button>
              <span className="text-xs">{Math.round(zoom * 100)}%</span>
              <Button
                aria-label="Zoom in instructions"
                disabled={zoom >= 1.5}
                onClick={() => setZoom((value) => Math.min(1.5, value + 0.25))}
              >
                +
              </Button>
            </div>
          </div>
          <article className="instruction-sheet mx-auto max-w-5xl overflow-hidden rounded-lg border bg-surface">
            <div className="border-b p-5">
              <p className="eyebrow mb-2">BRIKUMA · Local draft</p>
              <h2 className="text-xl">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div className="overflow-auto p-3">
              <div
                style={{
                  width: `${zoom * 100}%`,
                  minWidth: zoom > 1 ? `${zoom * 100}%` : undefined,
                }}
              >
                <BuildStepDrawing
                  model={draft.sourceModel}
                  step={step}
                  className="min-h-64 md:min-h-96"
                />
              </div>
            </div>
            <p className="px-5 pb-4 text-center text-xs text-muted-foreground">
              Schematic positions from this model. Full color = add now · faded = already placed.
            </p>
            <div className="border-t bg-background p-5">
              <p className="eyebrow mb-3">
                Add in this step · {step.newPartIds.length}{" "}
                {step.newPartIds.length === 1 ? "piece" : "pieces"}
              </p>
              <ul className="flex flex-wrap gap-3">
                {additions.map((line) => (
                  <li
                    key={`${line.partId}-${line.colorId}`}
                    className="flex items-center gap-2 rounded-md border bg-surface px-3 py-2 text-xs"
                  >
                    <span
                      className="size-3 rounded-sm border"
                      style={{
                        backgroundColor: colors.find((color) => color.id === line.colorId)?.hex,
                      }}
                    />
                    <span>
                      {partDefinitions.find((part) => part.id === line.partId)?.name}
                      <span className="block text-muted-foreground">
                        {colors.find((color) => color.id === line.colorId)?.name}
                      </span>
                    </span>
                    <strong>×{line.quantity}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t px-5 py-3 text-xs text-muted-foreground">
              Model revision {plan.modelRevision} · Draft ordering, not verified assembly
              instructions.
            </div>
          </article>
          <div className="no-print mx-auto mt-4 flex max-w-5xl items-center justify-between">
            <Button disabled={stepIndex === 0} onClick={() => setIndex(stepIndex - 1)}>
              <ArrowLeft size={16} />
              Previous
            </Button>
            <span className="text-xs">
              {step.visiblePartIds.length} {step.visiblePartIds.length === 1 ? "piece" : "pieces"}{" "}
              shown
            </span>
            <Button
              variant="primary"
              disabled={stepIndex === plan.steps.length - 1}
              onClick={() => setIndex(stepIndex + 1)}
            >
              Next step
              <ArrowRight size={16} />
            </Button>
          </div>
          <p className="no-print mt-5 text-center text-sm">
            <Link href={`/editor/?project=${id}`} className="underline underline-offset-4">
              Open the interactive build and disassembly preview
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
