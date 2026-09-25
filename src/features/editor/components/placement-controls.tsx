"use client";
import { useId, useState } from "react";
import { X, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  centimetersToStuds,
  formatCentimeters,
  studsToCentimeters,
  snapGridTransform,
  diagnosePlacement,
  findStudContacts,
  getPartConnections,
  hasSupportedDiagnosticGeometry,
  getPlacementCandidates,
  isValidTransform,
  worldStudSites,
  type GridTransform,
  type Model,
  type QuarterTurn,
} from "@/core/model/public";
import { partDefinitions, colors, editPolicy } from "@/fixtures/catalog";
import { PartDimensions } from "./part-dimensions";
import type { PlacementPreview } from "../viewport-types";
import { placementFeedback } from "../placement-feedback";

export function PlacementControls({
  placement,
  model,
  hiddenIds,
  repeat,
  awaitingNextPosition = false,
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
  awaitingNextPosition?: boolean;
  onRepeat: (value: boolean) => void;
  onChange: (value: GridTransform) => void;
  onPlace: (value: GridTransform) => boolean;
  onCancel: () => void;
  onPolicy: (value: "surface" | "ground" | "free") => void;
  onColor: (value: string) => void;
}) {
  const feedbackId = useId();
  const precisionId = useId();
  const [orientation, setOrientation] = useState<"keep" | "align">("keep");
  const [source, setSource] = useState(0);
  const [active, setActive] = useState("");
  const [position, setPosition] = useState({
    x: formatCentimeters(placement.transform.x),
    y: formatCentimeters(placement.transform.y),
    z: formatCentimeters(placement.transform.z),
  });
  const [observedTransform, setObservedTransform] = useState(placement.transform);
  if (observedTransform !== placement.transform) {
    setObservedTransform(placement.transform);
    setPosition({
      x: formatCentimeters(placement.transform.x),
      y: formatCentimeters(placement.transform.y),
      z: formatCentimeters(placement.transform.z),
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
  const typedTransform = {
    ...placement.transform,
    x: centimetersToStuds(Number(position.x)),
    y: centimetersToStuds(Number(position.y)),
    z: centimetersToStuds(Number(position.z)),
  };
  const validPosition = validNumbers && isValidTransform(typedTransform, editPolicy.bounds);
  const feedback = placementFeedback(model, partDefinitions, placement);
  const previewMatches =
    validPosition &&
    Math.abs(typedTransform.x - placement.transform.x) < 0.000001 &&
    Math.abs(typedTransform.y - placement.transform.y) < 0.000001 &&
    Math.abs(typedTransform.z - placement.transform.z) < 0.000001;
  const canPlace = previewMatches && feedback.allowed && !awaitingNextPosition;
  const message = !validNumbers
    ? "Enter a number for each position."
    : !validPosition
      ? "Use 0.08 cm steps left/right and front/back, and 0.04 cm height steps, within the workspace."
      : awaitingNextPosition
        ? "Placed. Choose the next position for another copy."
        : !previewMatches
          ? "Update preview before placing typed coordinates."
          : feedback.message;
  const connectable = connectors.receivers.length > 0 && hasSupportedDiagnosticGeometry(definition);
  return (
    <section
      className="space-y-3 rounded-lg border border-primary/40 bg-primary-muted/30 p-3"
      aria-label="Pending brick placement"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            {awaitingNextPosition ? "Ready for the next brick" : "Choose where to place it"}
          </p>
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
      {definition.shape === "door-assembly" && (
        <p className="text-xs text-muted-foreground">
          Reserve a {formatCentimeters(definition.width)} cm wide opening,{" "}
          {formatCentimeters(definition.height)} cm high. One closed demo assembly; hinge motion is
          not modeled.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2" aria-label="Where to place the brick">
        <Button
          className="px-2 text-xs"
          disabled={!connectable || !model.instances.length}
          aria-pressed={placement.target === "surface"}
          onClick={() => onPolicy("surface")}
        >
          Attach to model
        </Button>
        <Button
          className="px-2 text-xs"
          aria-pressed={placement.target === "ground"}
          onClick={() => {
            onPolicy("ground");
            onChange(
              snapGridTransform(definition, { ...placement.transform, y: definition.height / 2 }),
            );
          }}
        >
          On the floor
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {!connectable
          ? "Visual detail only: this piece has no supported attachment."
          : placement.target === "surface"
            ? "Point to the model to snap onto it. Place brick keeps the position shown."
            : "Point to the floor to choose a position. The preview shows where the brick will go."}
      </p>
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
      <div className="flex items-center justify-between gap-2">
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
          <RotateCw size={16} /> Rotate
        </button>
        <span className="text-xs">Turn: {placement.transform.rotation}°</span>
      </div>
      {placement.target === "surface" && (
        <details className="space-y-2 rounded border p-2 text-xs">
          <summary className="cursor-pointer">Choose a surface from the list</summary>
          {!connectable ? (
            <p className="text-xs text-warning">
              Visual detail: no supported attachment. Grid and Free position only position it; they
              do not connect it to another brick.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Point to a studded surface in the model, or choose a target below. Then use Place
                brick to keep the previewed position.
              </p>
              {candidates.length === 0 && (
                <p className="text-xs">
                  No eligible targets nearby. Move the preview or use Grid for the first part.
                </p>
              )}
              <ol className="space-y-1" aria-label="Connector candidates">
                {candidates.map((candidate) => {
                  const target = model.instances.find((part) => part.id === candidate.targetId)!;
                  const targetDefinition = partDefinitions.find(
                    (part) => part.id === target.partId,
                  )!;
                  const site = worldStudSites(
                    getPartConnections(targetDefinition).studs,
                    target.transform,
                  )[candidate.targetConnectorIndex];
                  const contacts = findStudContacts(
                    model,
                    partDefinitions,
                    definition,
                    candidate.transform,
                  );
                  return (
                    <li key={candidate.id}>
                      <button
                        className="button w-full flex-col items-start px-2 text-left text-xs"
                        aria-pressed={active === candidate.id}
                        onClick={() => {
                          setActive(candidate.id);
                          onChange(candidate.transform);
                          setPosition({
                            x: formatCentimeters(candidate.transform.x),
                            y: formatCentimeters(candidate.transform.y),
                            z: formatCentimeters(candidate.transform.z),
                          });
                        }}
                      >
                        <span>On {targetDefinition.name}</span>
                        <span className="text-muted-foreground">
                          Left/right {formatCentimeters(site.x)} cm · front/back{" "}
                          {formatCentimeters(site.z)} cm
                        </span>
                        <span className="text-muted-foreground">
                          {contacts.length} aligned · turn {candidate.rotationDelta}° ·{" "}
                          {candidate.diagnostic.status === "conflict"
                            ? "Conflict"
                            : candidate.diagnostic.status === "not-checked"
                              ? "Partial coverage"
                              : "Clear"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <details className="rounded border p-2 text-xs">
                <summary className="cursor-pointer">Advanced connection controls</summary>
                <label className="mt-2 block">
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
                    <option value="align">Allow quarter turns</option>
                  </select>
                </label>
                <label className="mt-2 block">
                  Source underside connector
                  <select
                    className="field mt-1"
                    value={source}
                    onChange={(e) => {
                      setSource(Number(e.target.value));
                      setActive("");
                    }}
                  >
                    {connectors.receivers.map((site, index) => (
                      <option key={index} value={index}>
                        Socket {index + 1} · X {formatCentimeters(site.x)} cm · Z{" "}
                        {formatCentimeters(site.z)} cm
                      </option>
                    ))}
                  </select>
                </label>
                {active && <p className="mt-2 break-all">Selected connector: {active}</p>}
              </details>
            </>
          )}
        </details>
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canPlace) onPlace(placement.transform);
        }}
      >
        <details className="rounded border p-2 text-xs">
          <summary className="cursor-pointer">Advanced placement</summary>
          <div className="mt-3 space-y-3">
            <p className="break-all text-muted-foreground">
              ID: {definition.id} ·{" "}
              {hasSupportedDiagnosticGeometry(definition)
                ? "Volume check supported"
                : "Volume check unavailable"}
            </p>
            <div className="grid grid-cols-3 gap-1" aria-label="Placement policy">
              {(
                [
                  ["surface", "Connect"],
                  ["ground", "Grid"],
                  ["free", "Free position"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className="button px-1 text-xs"
                  aria-pressed={placement.target === value}
                  onClick={() => onPolicy(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs text-muted-foreground">
              Position of the brick center, in cm. Height is measured from the floor.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={axis} className="text-xs">
                  {{ x: "Left/right · X", y: "Height · Y", z: "Front/back · Z" }[axis]} (cm)
                  <input
                    className="field mt-1 px-2 font-mono"
                    aria-label={`Placement ${axis.toUpperCase()}`}
                    aria-describedby={`${precisionId} ${feedbackId}`}
                    aria-invalid={!validPosition || undefined}
                    type="number"
                    required
                    min={axis === "y" ? 0 : -studsToCentimeters(editPolicy.bounds)}
                    max={studsToCentimeters(editPolicy.bounds)}
                    step={axis === "y" ? 0.04 : 0.08}
                    value={position[axis]}
                    onChange={(e) => setPosition({ ...position, [axis]: e.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        setPosition({
                          x: formatCentimeters(placement.transform.x),
                          y: formatCentimeters(placement.transform.y),
                          z: formatCentimeters(placement.transform.z),
                        });
                      }
                    }}
                  />
                </label>
              ))}
            </div>
            <p id={precisionId} className="mt-2 text-xs text-muted-foreground">
              X/Z steps: 0.08 cm · height steps: 0.04 cm. X/Z range ±
              {formatCentimeters(editPolicy.bounds)} cm; height 0–
              {formatCentimeters(editPolicy.bounds)} cm.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview bottom: {formatCentimeters(placement.transform.y - definition.height / 2)} cm
              · top: {formatCentimeters(placement.transform.y + definition.height / 2)} cm.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                className="flex-1 text-xs"
                disabled={!validPosition}
                onClick={() => {
                  if (validPosition) onChange(typedTransform);
                }}
              >
                Update preview
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {placement.target === "ground"
                ? "Grid spacing: 0.8 cm horizontally and 0.32 cm vertically, aligned to the brick footprint."
                : placement.target === "free"
                  ? "Free draft; no connected-placement claim."
                  : "Explicit connector alignment; revalidated on Place."}
            </p>
            <details className="my-3 border-y py-2 text-xs">
              <summary className="cursor-pointer">Geometry and physical limits</summary>
              {awaitingNextPosition ? (
                <p className="mt-2">Choose the next position to check it.</p>
              ) : (
                <>
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
                </>
              )}
            </details>
          </div>
        </details>
        <label className="my-3 flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" checked={repeat} onChange={(e) => onRepeat(e.target.checked)} />
          Repeat placement
        </label>
        <div className="sticky bottom-0 border-t bg-surface py-2">
          <p id={feedbackId} aria-live="polite" className="mb-2 text-xs">
            {message}
          </p>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!canPlace}
            aria-describedby={feedbackId}
          >
            Place brick
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground">
        Dimensions use the nominal brick pitch and are approximate. Escape cancels.
      </p>
    </section>
  );
}
