"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Printer, RefreshCw } from "lucide-react";
import { deriveBom, isBuildPlanCurrent, type BuildPlanEdit, type Model } from "@/core/model/public";
import type { DraftInstructions } from "@/features/editor/state/session";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { ProjectNavigation } from "@/components/shell/project-navigation";
import { BuildStepDrawing } from "./build-step-drawing";
import { InstructionStepEditor } from "./instruction-step-editor";

export function GeneratedInstructions({
  id,
  model,
  draft,
  onGenerate,
  onCurated,
  onEdit,
  onHistory,
  canUndo,
  canRedo,
  edited,
  feedback,
}: {
  id: string;
  model: Model;
  draft: DraftInstructions;
  onGenerate: () => boolean;
  onCurated?: () => void;
  onEdit: (edit: BuildPlanEdit) => boolean;
  onHistory: (direction: "undo" | "redo") => boolean;
  canUndo: boolean;
  canRedo: boolean;
  edited: boolean;
  feedback: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusAdditions, setFocusAdditions] = useState(true);
  const [editError, setEditError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const focusStep = useRef(false);
  const plan = draft.plan;
  const stale = !isBuildPlanCurrent(model, plan);
  const stepIndex = Math.max(
    0,
    plan.steps.findIndex((item) => item.id === selectedId),
  );
  const step = plan.steps[stepIndex];
  const view = step.view ?? "isometric";
  useEffect(() => {
    if (focusStep.current) {
      heading.current?.focus();
      focusStep.current = false;
    }
  }, [plan, step.id]);
  const pageStart = Math.floor(stepIndex / 10) * 10;
  const stepIds = new Set(plan.steps.map((item) => item.id));
  let splitNumber = 1;
  while (stepIds.has(`split-step-${splitNumber}`)) splitNumber += 1;
  const nextStepId = `split-step-${splitNumber}`;
  const added = new Set(step.newPartIds);
  const additions = deriveBom({
    ...draft.sourceModel,
    instances: draft.sourceModel.instances.filter((part) => added.has(part.id)),
  });
  function regenerate() {
    if (onGenerate()) setSelectedId(null);
  }
  function selectStep(index: number) {
    focusStep.current = true;
    setSelectedId(plan.steps[index].id);
    setZoom(1);
    setEditError("");
  }
  function edit(command: BuildPlanEdit, nextId = step.id) {
    if (
      !stale &&
      command.type === "update-step" &&
      (command.title === undefined || command.title.trim() === step.title) &&
      (command.description === undefined || command.description === step.description) &&
      (command.view === undefined || command.view === view)
    ) {
      setEditError("");
      return true;
    }
    if (stale || !onEdit(command)) {
      setEditError(
        "This edit could not be applied. Check that the guide matches your current model.",
      );
      return false;
    }
    setSelectedId(nextId);
    if (command.type !== "update-step") focusStep.current = true;
    setEditError("");
    return true;
  }
  function history(direction: "undo" | "redo") {
    if (onHistory(direction)) {
      focusStep.current = true;
      setEditError("");
    }
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
          <Button
            aria-label="Undo instruction edit"
            disabled={stale || !canUndo}
            onClick={() => history("undo")}
          >
            Undo
          </Button>
          <Button
            aria-label="Redo instruction edit"
            disabled={stale || !canRedo}
            onClick={() => history("redo")}
          >
            Redo
          </Button>
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
        {edited
          ? "Your edited guide"
          : "Generated locally from your placed pieces, ordered by height"}
        . Review connections and overlaps before following this draft; assembly order and physical
        stability are not verified.{" "}
        {plan.uncheckedPartIds.length > 0 &&
          `${plan.uncheckedPartIds.length} ${plan.uncheckedPartIds.length === 1 ? "piece uses" : "pieces use"} geometry outside the supported connection checks.`}
      </p>
      <p className="no-print px-5 py-2 text-xs text-muted-foreground">
        Project backups include this guide and its source model. Check the local save status before
        leaving. Undo history and camera positions are not included in backups; no cloud copy is
        connected.
      </p>
      {editError && (
        <p role="alert" className="notice">
          {feedback || editError}
        </p>
      )}
      <div className="grid min-w-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Instruction steps"
          className="no-print flex gap-2 overflow-x-auto border-b bg-surface p-3 lg:max-h-[75vh] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          {plan.steps.length > 10 && (
            <label className="block min-w-36 text-xs">
              Browse steps
              <select
                className="field mt-1 w-full"
                value={pageStart}
                onChange={(event) => selectStep(Number(event.target.value))}
              >
                {Array.from({ length: Math.ceil(plan.steps.length / 10) }, (_, page) => (
                  <option key={page} value={page * 10}>
                    Steps {page * 10 + 1}–{Math.min((page + 1) * 10, plan.steps.length)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {plan.steps.slice(pageStart, pageStart + 10).map((item, offset) => (
            <button
              key={item.id}
              onClick={() => selectStep(pageStart + offset)}
              aria-current={pageStart + offset === stepIndex ? "step" : undefined}
              className={`min-w-36 rounded-md border p-3 text-left text-xs ${pageStart + offset === stepIndex ? "border-primary bg-primary-muted" : "border-border"}`}
            >
              <strong className="block">
                {pageStart + offset + 1}. {item.title}
              </strong>
              <span className="mt-1 block text-muted-foreground">
                {item.visiblePartIds.length} {item.visiblePartIds.length === 1 ? "piece" : "pieces"}{" "}
                assembled
              </span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 p-4 md:p-6">
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              Step {stepIndex + 1} of {plan.steps.length}
            </p>
            <div role="group" aria-label="Drawing view" className="flex items-center gap-2">
              <Button
                disabled={stale}
                aria-pressed={view === "isometric"}
                onClick={() => edit({ type: "update-step", stepId: step.id, view: "isometric" })}
              >
                3D view
              </Button>
              <Button
                disabled={stale}
                aria-pressed={view === "top"}
                onClick={() => edit({ type: "update-step", stepId: step.id, view: "top" })}
              >
                Top view
              </Button>
            </div>
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
          <div
            className="no-print mb-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Drawing focus"
          >
            <Button aria-pressed={focusAdditions} onClick={() => setFocusAdditions(true)}>
              Focus this step
            </Button>
            <Button aria-pressed={!focusAdditions} onClick={() => setFocusAdditions(false)}>
              Whole build
            </Button>
          </div>
          <article className="instruction-sheet mx-auto max-w-5xl overflow-hidden rounded-lg border bg-surface">
            <div className="border-b p-5">
              <p className="eyebrow mb-2">BRIKUMA · Local draft</p>
              <h2 ref={heading} tabIndex={-1} className="text-xl">
                {step.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div className="overflow-auto p-3">
              <div
                style={{
                  width: `${zoom * 100}%`,
                  minWidth: zoom > 1 ? `${zoom * 100}%` : undefined,
                  height: `${zoom * 24}rem`,
                }}
              >
                <BuildStepDrawing
                  model={draft.sourceModel}
                  step={step}
                  view={view}
                  focusAdditions={focusAdditions}
                  className="h-full"
                />
              </div>
            </div>
            <p className="px-5 pb-4 text-center text-xs text-muted-foreground">
              {view === "top"
                ? "Top view: line up the studs."
                : "3D view: see the height and shape."}{" "}
              Full color = add now · faded = already placed. New pieces are highlighted through
              earlier pieces so you can see where they go.{" "}
              {focusAdditions &&
                "Focused on this step. Choose Whole build for the surrounding model."}
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
          <div className="mx-auto max-w-5xl">
            <InstructionStepEditor
              key={step.id}
              step={step}
              model={draft.sourceModel}
              first={stepIndex === 0}
              last={stepIndex === plan.steps.length - 1}
              disabled={stale}
              nextStepId={nextStepId}
              onEdit={edit}
            />
          </div>
          <div className="no-print mx-auto mt-4 flex max-w-5xl items-center justify-between">
            <Button disabled={stepIndex === 0} onClick={() => selectStep(stepIndex - 1)}>
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
              onClick={() => selectStep(stepIndex + 1)}
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
