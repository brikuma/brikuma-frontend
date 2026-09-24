"use client";

import { useEffect, useState } from "react";
import {
  modelSignature,
  previewExperiment,
  getReplacementFeedback,
  isGroupProtected,
  type EditCommand,
  type EditingPolicy,
  type ExperimentPreview,
  type Model,
} from "@/core/model/public";
import { Button } from "@/components/ui/button";
import { colors } from "@/fixtures/catalog";

export function EditorExperiment({
  model,
  policy,
  selectedIds,
  onAccept,
  onPreview,
  onHighlight,
  comparisonResetRequest = 0,
}: {
  model: Model;
  policy: EditingPolicy;
  selectedIds: readonly string[];
  onAccept: (preview: ExperimentPreview) => boolean;
  onPreview: (model: Model | null) => void;
  onHighlight?: (ids: readonly string[]) => void;
  comparisonResetRequest?: number;
}) {
  const [operation, setOperation] = useState<"color" | "move" | "remove">("color");
  const [color, setColor] = useState("teal");
  const [distance, setDistance] = useState("1");
  const [axis, setAxis] = useState<"x" | "y" | "z">("y");
  const [preview, setPreview] = useState<ExperimentPreview | null>(null);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<{
    request: number;
    view: "current" | "proposed" | "delta";
  }>({ request: comparisonResetRequest, view: "current" });
  const view = comparison.request === comparisonResetRequest ? comparison.view : "current";
  const stale = preview !== null && preview.baseSignature !== modelSignature(model);
  useEffect(
    () => () => {
      onPreview(null);
      onHighlight?.([]);
    },
    [onPreview, onHighlight],
  );
  const changed = preview
    ? [
        ...new Set([
          ...preview.impact.addedIds,
          ...preview.impact.removedIds,
          ...preview.impact.transformedIds,
          ...preview.impact.recoloredIds,
          ...preview.impact.replacedIds,
        ]),
      ]
    : [];
  function show(next: "current" | "proposed" | "delta", proposal = preview) {
    setComparison({ request: comparisonResetRequest, view: next });
    onPreview(next === "current" ? null : (proposal?.proposed ?? null));
    onHighlight?.(
      next === "delta" && proposal
        ? [
            ...new Set([
              ...proposal.impact.addedIds,
              ...proposal.impact.transformedIds,
              ...proposal.impact.recoloredIds,
              ...proposal.impact.replacedIds,
            ]),
          ]
        : [],
    );
  }
  function calculate(command: EditCommand) {
    const result = previewExperiment(model, command, policy);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPreview(result.value);
    setError("");
    show("proposed", result.value);
  }
  function discard() {
    setPreview(null);
    setError("");
    show("current", null);
  }
  return (
    <section aria-label="Local experiment" className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Preview one real local edit against a specific revision. Accept adds one undo transaction.
      </p>
      {!preview ? (
        <>
          <p className="text-sm">{selectedIds.length} selected parts</p>
          <label className="block text-xs">
            Proposed operation
            <select
              className="field mt-1 w-full"
              value={operation}
              onChange={(event) => setOperation(event.target.value as typeof operation)}
            >
              <option value="color">Change color</option>
              <option value="move">Translate selection</option>
              <option value="remove">Remove selection</option>
            </select>
          </label>
          {operation === "color" && (
            <label className="block text-xs">
              Proposed color
              <select
                className="field mt-1 w-full"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              >
                {colors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {operation === "move" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                Axis
                <select
                  className="field mt-1 w-full"
                  value={axis}
                  onChange={(event) => setAxis(event.target.value as typeof axis)}
                >
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Z</option>
                </select>
              </label>
              <label className="text-xs">
                Delta (studs)
                <input
                  className="field mt-1 w-full"
                  type="text"
                  inputMode="decimal"
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                />
              </label>
            </div>
          )}
          <Button
            disabled={!selectedIds.length}
            onClick={() => {
              if (operation === "color")
                calculate({ type: "recolor-selection", ids: selectedIds, colorId: color });
              else if (operation === "remove")
                calculate({ type: "remove-selection", ids: selectedIds });
              else {
                if (
                  !distance.trim() ||
                  !/^-?(?:\d+\.?\d*|\.\d+)$/.test(distance.trim()) ||
                  !Number.isFinite(Number(distance))
                ) {
                  setError("Enter a finite decimal translation in studs.");
                  return;
                }
                calculate({
                  type: "translate-selection",
                  ids: selectedIds,
                  delta: {
                    x: axis === "x" ? Number(distance) : 0,
                    y: axis === "y" ? Number(distance) : 0,
                    z: axis === "z" ? Number(distance) : 0,
                  },
                });
              }
            }}
          >
            Preview local edit
          </Button>
          {!selectedIds.length && (
            <p className="text-xs text-muted-foreground">
              Select parts through the scene or Structure first.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs">
            Base {preview.baseRevision} · Current {model.revision}
          </p>
          {stale && (
            <p role="status" className="rounded border border-warning p-2 text-sm">
              This proposal is stale. Recalculate against the current model before accepting.
            </p>
          )}
          <div className="flex flex-wrap gap-1" aria-label="Experiment comparison">
            {(["current", "proposed", "delta"] as const).map((item) => (
              <Button key={item} aria-pressed={view === item} onClick={() => show(item)}>
                {item === "delta"
                  ? "Highlight changes"
                  : item === "current"
                    ? "Current"
                    : "Proposed"}
              </Button>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-1 text-xs">
            <dt>Parts added</dt>
            <dd>{preview.impact.addedIds.length}</dd>
            <dt>Parts removed</dt>
            <dd>{preview.impact.removedIds.length}</dd>
            <dt>Count delta</dt>
            <dd>
              {preview.impact.partDelta > 0 ? "+" : ""}
              {preview.impact.partDelta}
            </dd>
            <dt>Transforms changed</dt>
            <dd>{preview.impact.transformedIds.length}</dd>
            <dt>Colors changed</dt>
            <dd>{preview.impact.recoloredIds.length}</dd>
            <dt>Definitions replaced</dt>
            <dd>{preview.impact.replacedIds.length}</dd>
          </dl>
          <p className="text-xs">
            Touched groups:{" "}
            {preview.impact.touchedGroupIds
              .map((id) => model.groups.find((group) => group.id === id)?.name ?? id)
              .join(", ") || "None"}
          </p>
          <p className="text-xs">
            Protection check: passed at preview. Rechecked on accept.{" "}
            {preview.impact.diagnosticsStale
              ? "Existing diagnostics become stale."
              : "Geometry diagnostics unchanged."}{" "}
            {preview.impact.stepsStale
              ? "Existing step plan becomes stale."
              : "Step revision unchanged."}{" "}
            Physical assessment: not evaluated.
          </p>
          <details>
            <summary className="cursor-pointer py-2 text-xs">
              Affected instances ({changed.length})
            </summary>
            <ul className="max-h-36 overflow-y-auto text-xs">
              {changed.map((id) => (
                <li key={id} className="break-all py-1">
                  {id}
                  {preview.impact.removedIds.includes(id)
                    ? " · removed"
                    : preview.impact.addedIds.includes(id)
                      ? " · added"
                      : " · changed"}
                </li>
              ))}
            </ul>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={stale}
              onClick={() => {
                if (onAccept(preview)) discard();
              }}
            >
              Accept edit
            </Button>
            <Button onClick={discard}>Discard</Button>
            {stale && (
              <Button onClick={() => calculate(preview.command)}>Recalculate proposal</Button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

export function EditorReplacement({
  model,
  policy,
  selectedId,
  onCommand,
}: {
  model: Model;
  policy: EditingPolicy;
  selectedId: string | null;
  onCommand: (command: EditCommand) => boolean;
}) {
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [draftChoice, setDraftChoice] = useState("");
  const selected = model.instances.find((instance) => instance.id === selectedId);
  const protectedSelection = Boolean(selected && isGroupProtected(model, selected.groupId));
  const options = selected
    ? policy.parts.filter((part) => {
        const result = getReplacementFeedback(model, selected.id, part.id, policy);
        return part.id !== selected.partId && result.ok && result.value.compatibleFootprint;
      })
    : [];
  const chosen = options.find((option) => option.id === choice) ?? options[0];
  const feedback =
    selected && chosen ? getReplacementFeedback(model, selected.id, chosen.id, policy) : null;
  return (
    <section aria-label="Same-footprint replacement" className="space-y-2">
      {!selected ? (
        <p className="text-xs text-muted-foreground">
          Select one part to inspect same-footprint replacements.
        </p>
      ) : (
        <>
          <p className="text-xs">
            Replace {selected.id}. Identity, color and body-bottom position are preserved.
          </p>
          {protectedSelection && (
            <p className="text-xs text-warning">
              This part belongs to a protected group. Unprotect the group explicitly before
              replacement.
            </p>
          )}
          {chosen ? (
            <>
              <label className="block text-xs">
                Replacement part
                <select
                  className="field mt-1 w-full"
                  value={chosen.id}
                  onChange={(event) => {
                    setChoice(event.target.value);
                    setMessage("");
                  }}
                >
                  {options.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name}
                    </option>
                  ))}
                </select>
              </label>
              {feedback?.ok && (
                <p className="text-xs">
                  Footprint compatible. Connectors: {feedback.value.connectors}. Height change:{" "}
                  {feedback.value.heightDelta.toFixed(2)} studs. Surrounding fit and physical
                  validity are not established by matching footprints.
                </p>
              )}
              {feedback?.ok && feedback.value.connectors === "unknown" && (
                <label className="flex min-h-10 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={draftChoice === `${selected.id}:${chosen.id}`}
                    onChange={(event) =>
                      setDraftChoice(event.target.checked ? `${selected.id}:${chosen.id}` : "")
                    }
                  />
                  Use this replacement as an unverified draft
                </label>
              )}
              <Button
                disabled={
                  protectedSelection ||
                  (feedback?.ok &&
                    feedback.value.connectors === "unknown" &&
                    draftChoice !== `${selected.id}:${chosen.id}`)
                }
                onClick={() => {
                  if (onCommand({ type: "replace-part", id: selected.id, partId: chosen.id }))
                    setMessage("Part replaced locally. Undo restores its previous definition.");
                }}
              >
                Replace selected part
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No same-footprint alternative exists in this catalog.
            </p>
          )}
        </>
      )}
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
    </section>
  );
}
