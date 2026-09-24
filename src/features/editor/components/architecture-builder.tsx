"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  centimetersToStuds,
  createArchitecturePreview,
  formatCentimeters,
  isGroupProtected,
  modelSignature,
  type ArchitecturePreview,
  type ArchitectureRequest,
  type ArchitectureSection,
  type EditingPolicy,
  type ExperimentPreview,
  type Model,
} from "@/core/model/public";

const finishes = [
  {
    id: "courtyard",
    name: "Ivory & terracotta",
    wall: "ivory",
    roof: "terracotta",
    base: "sand",
    door: "sage",
  },
  {
    id: "white",
    name: "White & warm clay",
    wall: "white",
    roof: "clay",
    base: "limestone",
    door: "teal",
  },
  {
    id: "stone",
    name: "Stone & slate",
    wall: "limestone",
    roof: "slate",
    base: "paving-gray",
    door: "timber",
  },
] as const;

/** Local parametric construction. The parent displays the proposed model in its existing canvas. */
export function ArchitectureBuilder({
  model,
  policy,
  onPreview,
  onAccept,
  disabled = false,
}: {
  model: Model;
  policy: EditingPolicy;
  onPreview: (model: Model | null) => void;
  onAccept: (preview: ExperimentPreview) => boolean;
  disabled?: boolean;
}) {
  const [layout, setLayout] = useState<ArchitectureRequest["layout"]>("courtyard");
  const [section, setSection] = useState<ArchitectureSection>("complete");
  const [width, setWidth] = useState(32);
  const [depth, setDepth] = useState(24);
  const [finishId, setFinishId] = useState<string>("courtyard");
  const [origin, setOrigin] = useState({ x: "0", z: "0" });
  const [groupId, setGroupId] = useState("");
  const [preview, setPreview] = useState<ArchitecturePreview | null>(null);
  const [view, setView] = useState<"proposed" | "current">("proposed");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const availableGroups = model.groups.filter((group) => !isGroupProtected(model, group.id));
  const destination = availableGroups.some((group) => group.id === groupId)
    ? groupId
    : availableGroups[0]?.id;
  const sizes = [8, 12, 16, 20, 24, 28, 32].filter((size) => layout === "house" || size >= 16);
  const stale = preview !== null && preview.experiment.baseSignature !== modelSignature(model);

  useEffect(() => () => onPreview(null), [onPreview]);

  function discard() {
    setPreview(null);
    setError("");
    onPreview(null);
  }
  function calculate() {
    setError("");
    setMessage("");
    if (!destination) {
      setError("Choose an unlocked assembly before adding a building.");
      return;
    }
    if (![origin.x, origin.z].every((value) => value.trim() && Number.isFinite(Number(value)))) {
      setError("Enter a number for each building position.");
      return;
    }
    const finish = finishes.find((item) => item.id === finishId)!;
    const result = createArchitecturePreview(model, policy, {
      layout,
      section,
      width,
      depth,
      origin: {
        x: Number(centimetersToStuds(Number(origin.x)).toFixed(8)),
        z: Number(centimetersToStuds(Number(origin.z)).toFixed(8)),
      },
      wallColorId: finish.wall,
      roofColorId: finish.roof,
      baseColorId: finish.base,
      doorColorId: finish.door,
      groupId: destination,
      idPrefix: "architecture",
    });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPreview(result.value);
    setView("proposed");
    onPreview(result.value.experiment.proposed);
  }

  return (
    <section aria-label="Building helper" className="space-y-4 p-3">
      <div>
        <h2 className="text-base font-semibold">Start with a building</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a layout and size. Preview it, then keep building with individual pieces.
        </p>
      </div>
      {!preview ? (
        <>
          <div className="grid grid-cols-2 gap-2" aria-label="Building layout">
            {(["house", "courtyard"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="button min-h-16 flex-col items-start px-3 text-left aria-pressed:border-primary aria-pressed:bg-primary-muted"
                aria-pressed={layout === value}
                onClick={() => {
                  setLayout(value);
                  if (value === "courtyard") {
                    setWidth((size) => Math.max(16, size));
                    setDepth((size) => Math.max(16, size));
                  }
                }}
              >
                <span className="text-sm font-medium">
                  {value === "house" ? "House" : "Courtyard"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {value === "house" ? "One pitched roof" : "Three wings, open court"}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Width
              <select
                aria-label="Building width"
                className="field mt-1 w-full"
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              >
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {formatCentimeters(size)} cm
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Depth
              <select
                aria-label="Building depth"
                className="field mt-1 w-full"
                value={depth}
                onChange={(event) => setDepth(Number(event.target.value))}
              >
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {formatCentimeters(size)} cm
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs">
            Finish
            <select
              aria-label="Building finish"
              className="field mt-1 w-full"
              value={finishId}
              onChange={(event) => setFinishId(event.target.value)}
            >
              {finishes.map((finish) => (
                <option key={finish.id} value={finish.id}>
                  {finish.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            Add
            <select
              aria-label="Building section"
              className="field mt-1 w-full"
              value={section}
              onChange={(event) => setSection(event.target.value as ArchitectureSection)}
            >
              <option value="complete">Complete building</option>
              <option value="foundation">Foundation only</option>
              <option value="walls">Walls, doors & window openings</option>
              <option value="roof">Roof only</option>
            </select>
          </label>
          <details className="rounded-md border p-3 text-xs">
            <summary className="cursor-pointer">Position & assembly</summary>
            <p className="mt-3 text-muted-foreground">
              Offset from the center of the workspace. Use steps of 0.8 cm.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["x", "z"] as const).map((axis) => (
                <label key={axis}>
                  {axis === "x" ? "Left/right" : "Front/back"} (cm)
                  <input
                    aria-label={`Building ${axis.toUpperCase()} (cm)`}
                    className="field mt-1 w-full"
                    type="number"
                    step="0.8"
                    value={origin[axis]}
                    onChange={(event) => setOrigin({ ...origin, [axis]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 block">
              Assembly
              <select
                aria-label="Building assembly"
                className="field mt-1 w-full"
                value={destination ?? ""}
                onChange={(event) => setGroupId(event.target.value)}
              >
                {!availableGroups.length && <option value="">No unlocked assembly</option>}
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          </details>
          <Button variant="primary" className="w-full" disabled={disabled} onClick={calculate}>
            Preview building
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-md border bg-surface p-3">
            <p className="text-xl font-semibold">{preview.summary.addedCount} editable pieces</p>
            <p className="mt-1 text-sm">
              {formatCentimeters(preview.summary.width)} ×{" "}
              {formatCentimeters(preview.summary.depth)} ×{" "}
              {formatCentimeters(preview.summary.height)} cm
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {preview.summary.sections.foundation} foundation · {preview.summary.sections.walls}{" "}
              walls & doors · {preview.summary.sections.roof} roof
            </p>
          </div>
          <p className="text-xs">
            Supported contacts and overlap checked. Every new piece has a contact path to the
            ground.
          </p>
          {stale && (
            <p role="status" className="text-sm text-warning">
              The model changed. Recalculate this preview before adding it.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2" aria-label="Building comparison">
            <Button
              aria-pressed={view === "current"}
              onClick={() => {
                setView("current");
                onPreview(null);
              }}
            >
              Current
            </Button>
            <Button
              aria-pressed={view === "proposed"}
              onClick={() => {
                setView("proposed");
                onPreview(preview.experiment.proposed);
              }}
            >
              Preview
            </Button>
          </div>
          <Button
            variant="primary"
            className="w-full"
            disabled={disabled || stale}
            onClick={() => {
              if (onAccept(preview.experiment)) {
                const count = preview.summary.addedCount;
                discard();
                setMessage(`Added ${count} editable pieces. Undo removes this addition.`);
              } else
                setError(
                  "The building could not be added. Recalculate its preview before trying again.",
                );
            }}
          >
            Add {preview.summary.addedCount} pieces
          </Button>
          <Button className="w-full" onClick={discard}>
            Back to options
          </Button>
        </>
      )}
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {disabled && (
        <p className="text-xs text-muted-foreground">
          Return to assembled Build to add a building.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Local building helper, not AI. Sizes are nominal; physical fit and retail part availability
        are unverified.
      </p>
    </section>
  );
}
