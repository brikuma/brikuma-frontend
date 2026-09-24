"use client";

import { useEffect, useMemo, useState } from "react";
import { isInstructionCompatible, type Model } from "@/core/model/public";
import type { InstructionSample } from "@/fixtures/scene-types";
import { Button } from "@/components/ui/button";

export type StepView = { visibleIds: readonly string[]; mutedIds: readonly string[] };

export function EditorStepPreview({
  model,
  sample,
  onView,
}: {
  model: Model;
  sample: InstructionSample | null;
  onView: (view: StepView | null) => void;
}) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const valid = sample !== null && isInstructionCompatible(model, sample.modelRevision);
  const step = sample?.steps[Math.min(index, sample.steps.length - 1)];
  const view = useMemo(() => {
    if (!active || !valid || !step) return null;
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
  if (!sample?.steps.length)
    return (
      <p className="text-xs text-muted-foreground">
        This scene has no curated step plan. Automatic build-order generation is unavailable.
      </p>
    );
  return (
    <section aria-label="Curated step preview" className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Curated local sequence · {sample.modelRevision}. A visual guide, not a verified build order.
      </p>
      {!valid && (
        <p role="status" className="rounded border border-warning p-2 text-sm">
          Step plan stale: it describes {sample.modelRevision}; the model is {model.revision}.
          Restore the matching model revision with Undo or exit the preview.
        </p>
      )}
      <Button
        disabled={!valid && !active}
        aria-pressed={active}
        onClick={() => setActive((current) => !current)}
      >
        {active ? "Exit step preview" : "Open step preview"}
      </Button>
      {active && valid && step && (
        <>
          <p className="text-sm font-medium">
            Step {Math.min(index, sample.steps.length - 1) + 1} of {sample.steps.length}:{" "}
            {step.title}
          </p>
          <p className="text-xs">{step.description}</p>
          <p className="text-xs">
            {step.newPartIds.length} added parts · {step.visiblePartIds.length} visible parts
          </p>
          <div className="flex gap-2">
            <Button
              disabled={index <= 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              Previous step
            </Button>
            <Button
              disabled={index >= sample.steps.length - 1}
              onClick={() => setIndex((current) => Math.min(sample.steps.length - 1, current + 1))}
            >
              Next step
            </Button>
          </div>
          <label className="block text-xs">
            Choose step
            <select
              className="field mt-1 w-full"
              value={Math.min(index, sample.steps.length - 1)}
              onChange={(event) => setIndex(Number(event.target.value))}
            >
              {sample.steps.map((item, stepIndex) => (
                <option key={item.id} value={stepIndex}>
                  {stepIndex + 1}. {item.title}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </section>
  );
}
