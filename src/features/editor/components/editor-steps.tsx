"use client";

import { useEffect, useMemo, useState } from "react";
import {
  generateBuildPlan,
  isBuildPlanCurrent,
  isInstructionCompatible,
  type DraftBuildPlan,
  type Model,
} from "@/core/model/public";
import { partDefinitions } from "@/fixtures/catalog";
import type { InstructionSample } from "@/fixtures/scene-types";
import { Button } from "@/components/ui/button";

export type StepView = { visibleIds: readonly string[]; mutedIds: readonly string[] };

export function EditorStepPreview({
  model,
  sample,
  draft,
  onGenerate,
  onView,
}: {
  model: Model;
  sample: InstructionSample | null;
  draft?: DraftBuildPlan;
  onGenerate?: () => boolean;
  onView: (view: StepView | null) => void;
}) {
  const [localDraft, setLocalDraft] = useState<DraftBuildPlan>();
  const generated = draft ?? localDraft;
  const [source, setSource] = useState<"generated" | "curated">(
    draft || !sample ? "generated" : "curated",
  );
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"build" | "disassemble">("build");
  const [error, setError] = useState("");
  const plan = source === "generated" ? generated : sample;
  const valid =
    plan !== null &&
    plan !== undefined &&
    (source === "generated"
      ? isBuildPlanCurrent(model, generated!)
      : isInstructionCompatible(model, sample!.modelRevision));
  const steps = plan?.steps ?? [];
  const lastIndex = direction === "build" ? Math.max(0, steps.length - 1) : steps.length;
  const currentIndex = Math.min(index, lastIndex);
  const step = steps[direction === "build" ? currentIndex : steps.length - currentIndex - 1];
  const view = useMemo(() => {
    if (!active || !valid) return null;
    if (!step) return { visibleIds: [], mutedIds: [] };
    const existing = new Set(model.instances.map((instance) => instance.id));
    const added = new Set(step.newPartIds);
    return {
      visibleIds: step.visiblePartIds.filter((id) => existing.has(id)),
      mutedIds: step.visiblePartIds.filter((id) => existing.has(id) && !added.has(id)),
    };
  }, [active, valid, step, model.instances]);
  useEffect(() => {
    onView(view);
  }, [view, onView]);
  useEffect(() => () => onView(null), [onView]);
  function generate() {
    if (onGenerate) {
      if (!onGenerate()) return;
    } else {
      const result = generateBuildPlan(model, partDefinitions);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setLocalDraft(result.value);
    }
    setError("");
    setSource("generated");
    setIndex(0);
    setDirection("build");
    setActive(true);
  }
  return (
    <section aria-label="Build and disassembly steps" className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Generate a local guide from the pieces you have placed. The draft follows layers from the
        ground up; it does not verify assembly order or stability.
      </p>
      <Button disabled={!model.instances.length} onClick={generate}>
        {generated ? "Regenerate instructions" : "Generate instructions"}
      </Button>
      {!model.instances.length && (
        <p className="text-xs text-muted-foreground">
          Add pieces to create your first instruction step.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs">
          {error}
        </p>
      )}
      {sample && generated && (
        <label className="block text-xs">
          Step plan
          <select
            className="field mt-1 w-full"
            value={source}
            onChange={(event) => {
              setSource(event.target.value as "generated" | "curated");
              setIndex(0);
            }}
          >
            <option value="generated">Generated from my model</option>
            <option value="curated">Original sample sequence</option>
          </select>
        </label>
      )}
      {plan && (
        <>
          <p className="text-xs text-muted-foreground">
            {source === "generated" ? "Local draft" : "Curated sample"} · {plan.modelRevision} ·{" "}
            {steps.length} steps
          </p>
          {!valid && (
            <p role="status" className="rounded border border-warning p-2 text-sm">
              Step plan stale: it describes {plan.modelRevision}; the model is {model.revision}.
              Regenerate instructions to include your current pieces.
            </p>
          )}
          <Button
            disabled={!valid && !active}
            aria-pressed={active}
            onClick={() => setActive((current) => !current)}
          >
            {active ? "Exit step preview" : "Open step preview"}
          </Button>
        </>
      )}
      {active && valid && (
        <>
          <label className="block text-xs">
            Direction
            <select
              className="field mt-1 w-full"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value as "build" | "disassemble");
                setIndex(0);
              }}
            >
              <option value="build">Build from the ground up</option>
              <option value="disassemble">Disassemble from the top down</option>
            </select>
          </label>
          {step ? (
            <>
              <p className="text-sm font-medium">
                Step {currentIndex + 1} of {direction === "build" ? steps.length : steps.length + 1}
                : {step.title}
              </p>
              <p className="text-xs">
                {direction === "build"
                  ? step.description
                  : "Remove the highlighted pieces, then continue to the layer below."}
              </p>
              <p className="text-xs">
                {step.newPartIds.length} {direction === "build" ? "added" : "highlighted"} parts ·{" "}
                {step.visiblePartIds.length} visible parts
              </p>
            </>
          ) : (
            <p className="text-sm font-medium">
              Disassembly preview complete · 0 pieces shown. Your model is unchanged.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              disabled={currentIndex <= 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              Previous step
            </Button>
            <Button
              disabled={currentIndex >= lastIndex}
              onClick={() => setIndex((current) => Math.min(lastIndex, current + 1))}
            >
              Next step
            </Button>
          </div>
          <label className="block text-xs">
            Choose step
            <select
              className="field mt-1 w-full"
              value={currentIndex}
              onChange={(event) => setIndex(Number(event.target.value))}
            >
              {(direction === "build" ? steps : [...steps].reverse()).map((item, stepIndex) => (
                <option key={item.id} value={stepIndex}>
                  {stepIndex + 1}. {item.title}
                </option>
              ))}
              {direction === "disassemble" && (
                <option value={steps.length}>Complete disassembly</option>
              )}
            </select>
          </label>
        </>
      )}
    </section>
  );
}
