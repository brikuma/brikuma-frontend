"use client";

import { useState } from "react";
import type { BuildPlanEdit, DraftBuildStep, Model } from "@/core/model/public";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BuildStepDrawing } from "./build-step-drawing";

export function InstructionStepEditor({
  step,
  model,
  first,
  last,
  disabled,
  nextStepId,
  onEdit,
}: {
  step: DraftBuildStep;
  model: Model;
  first: boolean;
  last: boolean;
  disabled: boolean;
  nextStepId: string;
  onEdit: (edit: BuildPlanEdit, selectedId?: string) => boolean;
}) {
  const [dialog, setDialog] = useState<"text" | "split" | null>(null);
  return (
    <div className="no-print mt-3 space-y-3">
      <Button disabled={disabled} onClick={() => setDialog("text")}>
        Edit step
      </Button>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Arrange steps</summary>
        <p className="mt-3 text-xs text-muted-foreground">
          Change this guide without moving any pieces in your model. Review the order yourself.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={disabled || first}
            onClick={() => onEdit({ type: "move-step", stepId: step.id, direction: "earlier" })}
          >
            Move step earlier
          </Button>
          <Button
            disabled={disabled || last}
            onClick={() => onEdit({ type: "move-step", stepId: step.id, direction: "later" })}
          >
            Move step later
          </Button>
          <Button
            disabled={disabled || last}
            onClick={() => onEdit({ type: "merge-next", stepId: step.id })}
          >
            Merge with next step
          </Button>
          <Button
            disabled={disabled || step.newPartIds.length < 2}
            onClick={() => setDialog("split")}
          >
            Split this step
          </Button>
        </div>
      </details>
      {dialog === "text" && (
        <TextEditor
          step={step}
          disabled={disabled}
          onClose={() => setDialog(null)}
          onSave={(title, description) => {
            if (onEdit({ type: "update-step", stepId: step.id, title, description }))
              setDialog(null);
          }}
        />
      )}
      {dialog === "split" && (
        <SplitEditor
          step={step}
          model={model}
          disabled={disabled}
          onClose={() => setDialog(null)}
          onSave={(partIds) => {
            if (
              onEdit(
                { type: "split-step", stepId: step.id, partIds, newStepId: nextStepId },
                nextStepId,
              )
            )
              setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function TextEditor({
  step,
  disabled,
  onClose,
  onSave,
}: {
  step: DraftBuildStep;
  disabled: boolean;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}) {
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Edit instruction step"
      description="Give this step a useful name and explain what to add."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && title.trim()) onSave(title, description);
        }}
      >
        <label className="block text-sm">
          Step title
          <input
            className="field mt-1 w-full"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
          />
        </label>
        <label className="block text-sm">
          Step description
          <textarea
            className="field mt-1 min-h-28 w-full"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
          />
        </label>
        <div className="flex gap-2">
          <Button variant="primary" type="submit" disabled={disabled || !title.trim()}>
            Save step
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  );
}

function SplitEditor({
  step,
  model,
  disabled,
  onClose,
  onSave,
}: {
  step: DraftBuildStep;
  model: Model;
  disabled: boolean;
  onClose: () => void;
  onSave: (ids: readonly string[]) => void;
}) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Split instruction step"
      description="Choose pieces to move into a new step immediately after this one. Leave at least one piece here."
    >
      <BuildStepDrawing
        model={model}
        step={{ ...step, visiblePartIds: step.newPartIds, newPartIds: selected }}
        view={step.view}
        pieceLabels={new Map(step.newPartIds.map((id, index) => [id, String(index + 1)]))}
        className="mb-3 h-48"
      />
      <p className="mb-3 text-xs text-muted-foreground">
        Numbers match the pieces below. Selected pieces appear in full color.
      </p>
      <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
        {step.newPartIds.map((id, index) => {
          const instance = model.instances.find((part) => part.id === id);
          const name =
            partDefinitions.find((part) => part.id === instance?.partId)?.name ?? "Piece";
          const color = colors.find((entry) => entry.id === instance?.colorId);
          return (
            <label key={id} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={(event) =>
                  setSelected((ids) =>
                    event.target.checked ? [...ids, id] : ids.filter((item) => item !== id),
                  )
                }
              />
              <span
                className="size-3 shrink-0 rounded-sm border"
                style={{ backgroundColor: color?.hex }}
              />
              <span>
                Piece {index + 1}: {name} · {color?.name}
              </span>
            </label>
          );
        })}
      </div>
      <p className="my-3 text-sm">
        {selected.length} of {step.newPartIds.length} pieces selected
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={disabled || selected.length === 0 || selected.length === step.newPartIds.length}
          onClick={() => onSave(selected)}
        >
          Create following step
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Dialog>
  );
}
