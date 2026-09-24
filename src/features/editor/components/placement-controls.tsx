"use client";
import { useState } from "react";
import { X, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  diagnosePlacement,
  getPartConnections,
  hasSupportedDiagnosticGeometry,
  getPlacementCandidates,
  type GridTransform,
  type Model,
  type QuarterTurn,
} from "@/core/model/public";
import { partDefinitions, colors, editPolicy } from "@/fixtures/catalog";
import { PartDimensions } from "./part-dimensions";
import type { PlacementPreview } from "../viewport-types";

export function PlacementControls({
  placement,
  model,
  hiddenIds,
  repeat,
  onRepeat,
  onChange,
  onPlace,
  onCancel,
  onPolicy,
  onColor,
}: {
  placement: PlacementPreview;
  model: Model;
  hiddenIds: readonly string[];
  repeat: boolean;
  onRepeat: (value: boolean) => void;
  onChange: (value: GridTransform) => void;
  onPlace: (value: GridTransform) => boolean;
  onCancel: () => void;
  onPolicy: (value: "surface" | "ground" | "free") => void;
  onColor: (value: string) => void;
}) {
  const [orientation, setOrientation] = useState<"keep" | "align">("keep");
  const [source, setSource] = useState(0);
  const [active, setActive] = useState("");
  const [position, setPosition] = useState({
    x: String(placement.transform.x),
    y: String(placement.transform.y),
    z: String(placement.transform.z),
  });
  const [observedTransform, setObservedTransform] = useState(placement.transform);
  if (observedTransform !== placement.transform) {
    setObservedTransform(placement.transform);
    setPosition({
      x: String(placement.transform.x),
      y: String(placement.transform.y),
      z: String(placement.transform.z),
    });
  }
  const definition = partDefinitions.find((part) => part.id === placement.partId)!;
  const connectors = getPartConnections(definition);
  const diagnostic = diagnosePlacement(model, partDefinitions, definition, placement.transform);
  const candidates =
    placement.target === "surface"
      ? getPlacementCandidates({
          model,
          definitions: partDefinitions,
          definition,
          transform: placement.transform,
          orientationPolicy: orientation,
          sourceConnectorIndex: source,
          eligibleTargetIds: model.instances
            .filter((part) => !hiddenIds.includes(part.id))
            .map((part) => part.id),
          previousCandidateId: active,
          limit: 6,
        })
      : [];
  const validNumbers = Object.values(position).every(
    (value) => value.trim() !== "" && Number.isFinite(Number(value)),
  );
  const previewMatches =
    validNumbers &&
    Number(position.x) === placement.transform.x &&
    Number(position.y) === placement.transform.y &&
    Number(position.z) === placement.transform.z;
  return (
    <section
      className="space-y-3 rounded-lg border border-primary/40 bg-primary-muted/30 p-3"
      aria-label="Pending brick placement"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Placement preview · not committed</p>
          <h2 className="mt-1 text-base">{definition.name}</h2>
        </div>
        <button className="icon-button" aria-label="Cancel placement" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
      <PartDimensions
        part={definition}
        rotation={placement.transform.rotation}
        label="Placement dimensions"
      />
      <div className="grid grid-cols-3 gap-1" aria-label="Placement policy">
        {(
          [
            ["surface", "Connect"],
            ["ground", "Grid"],
            ["free", "Free position"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className="button px-1 text-xs"
            aria-pressed={placement.target === value}
            onClick={() => onPolicy(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="block text-xs">
        Orientation policy
        <select
          className="field mt-1"
          value={orientation}
          onChange={(e) => {
            setOrientation(e.target.value as "keep" | "align");
            setActive("");
          }}
        >
          <option value="keep">Keep orientation</option>
          <option value="align">Align to target</option>
        </select>
      </label>
      <label className="block text-xs">
        Color
        <select
          aria-label="Pending brick color"
          className="field mt-1"
          value={placement.colorId}
          onChange={(e) => onColor(e.target.value)}
        >
          {colors.map((color) => (
            <option key={color.id} value={color.id}>
              {color.name}
            </option>
          ))}
        </select>
      </label>
      {placement.target === "surface" && (
        <div className="space-y-2">
          {!connectors.receivesStuds || !hasSupportedDiagnosticGeometry(definition) ? (
            <p className="text-xs text-warning">
              Connector placement unavailable for this part. Choose Grid or Free position.
            </p>
          ) : (
            <>
              <label className="block text-xs">
                Source underside connector
                <select
                  className="field mt-1"
                  value={source}
                  onChange={(e) => setSource(Number(e.target.value))}
                >
                  {connectors.receivers.map((_, index) => (
                    <option key={index} value={index}>
                      Socket {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                Choose a target near the ghost. Each option shows the computed orientation change.
              </p>
              {candidates.length === 0 && (
                <p className="text-xs">
                  No eligible targets nearby. Move the preview or use Grid for the first part.
                </p>
              )}
              <ol className="space-y-1" aria-label="Connector candidates">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      className="button w-full flex-col items-start px-2 text-left text-xs"
                      aria-pressed={active === candidate.id}
                      onClick={() => {
                        setActive(candidate.id);
                        onChange(candidate.transform);
                        setPosition({
                          x: String(candidate.transform.x),
                          y: String(candidate.transform.y),
                          z: String(candidate.transform.z),
                        });
                      }}
                    >
                      <span className="break-all">
                        {candidate.targetId} · stud {candidate.targetConnectorIndex + 1}
                      </span>
                      <span className="text-muted-foreground">
                        Rotate {candidate.rotationDelta}° ·{" "}
                        {candidate.diagnostic.status === "conflict"
                          ? "Conflict"
                          : candidate.diagnostic.status === "not-checked"
                            ? "Partial coverage"
                            : "No supported conflict"}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (previewMatches) onPlace(placement.transform);
        }}
      >
        <p className="mb-2 text-xs text-muted-foreground">Body center · studs (1 stud = 20 LDU)</p>
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis} className="text-xs uppercase">
              {axis}
              <input
                className="field mt-1 px-2 font-mono"
                aria-label={`Placement ${axis.toUpperCase()}`}
                type="number"
                required
                min={axis === "y" ? 0 : -editPolicy.bounds}
                max={editPolicy.bounds}
                step={axis === "y" ? 0.05 : 0.1}
                value={position[axis]}
                onChange={(e) => setPosition({ ...position, [axis]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            className="flex-1 text-xs"
            disabled={!validNumbers}
            onClick={() =>
              onChange({
                ...placement.transform,
                x: Number(position.x),
                y: Number(position.y),
                z: Number(position.z),
              })
            }
          >
            Update preview
          </Button>
          <button
            type="button"
            className="button"
            aria-label="Rotate pending brick"
            onClick={() =>
              onChange({
                ...placement.transform,
                rotation: ((placement.transform.rotation + 90) % 360) as QuarterTurn,
              })
            }
          >
            <RotateCw size={16} />
          </button>
        </div>
        <p className="mt-2 text-xs">Orientation: {placement.transform.rotation}° around Y</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {placement.target === "ground"
            ? "Grid anchor: footprint stud phase · 1 stud horizontal / 0.4 stud vertical."
            : placement.target === "free"
              ? "Free draft; no connected-placement claim."
              : "Explicit connector alignment; revalidated on Place."}
        </p>
        <div className="my-3 border-y py-2 text-xs">
          <p>
            Occupied-volume check:{" "}
            {diagnostic.status === "conflict"
              ? "conflict"
              : diagnostic.status === "no-conflict"
                ? "no conflict in supported geometry"
                : "not fully checked"}
          </p>
          {diagnostic.conflictingIds.length > 0 && (
            <p className="mt-1 break-all text-danger">
              Conflicts: {diagnostic.conflictingIds.join(", ")}
            </p>
          )}
          <p className="mt-1 text-muted-foreground">
            Coverage: {diagnostic.coverage}. Physical stability: not evaluated.
          </p>
        </div>
        <label className="mb-3 flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" checked={repeat} onChange={(e) => onRepeat(e.target.checked)} />
          Repeat placement
        </label>
        {!previewMatches && (
          <p className="mb-2 text-xs text-warning">
            Update preview before placing typed coordinates.
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" disabled={!previewMatches}>
          Place brick
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Escape cancels. Camera navigation remains available.
      </p>
    </section>
  );
}
