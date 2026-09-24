"use client";
import { useId, useState } from "react";
import { LockKeyhole, Move, Trash2, Copy, RotateCw, Plus } from "lucide-react";
import {
  getPartConnections,
  hasSupportedDiagnosticGeometry,
  centimetersToStuds,
  formatCentimeters,
  studsToCentimeters,
  isValidTransform,
  isGroupProtected,
  findStudContacts,
  getSelectionBounds,
  type Model,
  type EditCommand,
  type PartInstance,
} from "@/core/model/public";
import { partDefinitions, colors, editPolicy } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { PartPreview } from "./part-preview";
import { PartDimensions } from "./part-dimensions";
import { ColorPalette } from "./color-palette";

function PositionFields({
  part,
  disabled,
  command,
}: {
  part: PartInstance;
  disabled: boolean;
  command: (command: EditCommand) => boolean;
}) {
  const [position, setPosition] = useState({
    x: formatCentimeters(part.transform.x),
    y: formatCentimeters(part.transform.y),
    z: formatCentimeters(part.transform.z),
  });
  const errorId = useId();
  const transform = {
    ...part.transform,
    x: centimetersToStuds(Number(position.x)),
    y: centimetersToStuds(Number(position.y)),
    z: centimetersToStuds(Number(position.z)),
  };
  const valid =
    Object.values(position).every((value) => value.trim() !== "") &&
    isValidTransform(transform, editPolicy.bounds);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) command({ type: "set-transform", id: part.id, transform });
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis} className="text-xs font-medium text-muted-foreground">
            {{ x: "Left/right", y: "Height", z: "Front/back" }[axis]} (cm)
            <input
              aria-label={`Position ${axis.toUpperCase()}`}
              aria-describedby={errorId}
              aria-invalid={!valid || undefined}
              className="field mt-1 px-2 font-mono tabular-nums"
              type="number"
              required
              min={axis === "y" ? 0 : -studsToCentimeters(editPolicy.bounds)}
              max={studsToCentimeters(editPolicy.bounds)}
              step={axis === "y" ? 0.04 : 0.08}
              disabled={disabled}
              value={position[axis]}
              onChange={(event) => setPosition({ ...position, [axis]: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setPosition({
                    x: formatCentimeters(part.transform.x),
                    y: formatCentimeters(part.transform.y),
                    z: formatCentimeters(part.transform.z),
                  });
                }
              }}
            />
          </label>
        ))}
      </div>
      <p id={errorId} aria-live="polite" className="mt-2 text-xs text-muted-foreground">
        {valid
          ? "Center position in cm. X/Z steps: 0.08 cm; height steps: 0.04 cm."
          : "Use 0.08 cm horizontal steps and 0.04 cm height steps within the workspace."}
      </p>
      <Button className="mt-2 w-full" disabled={disabled || !valid} type="submit">
        Apply position
      </Button>
    </form>
  );
}

export function SelectionInspector({
  model,
  selected,
  selectedIds = selected ? [selected] : [],
  groupId = null,
  onSelect,
  command,
  onDuplicate,
  onOpenCatalog,
  readOnly = false,
}: {
  model: Model;
  selected: string | null;
  selectedIds?: readonly string[];
  groupId?: string | null;
  onSelect: (id: string) => void;
  command: (command: EditCommand) => boolean;
  onDuplicate?: (id: string) => void;
  onOpenCatalog?: () => void;
  readOnly?: boolean;
}) {
  const part = model.instances.find((part) => part.id === selected);
  const selectedParts = model.instances.filter((item) => selectedIds.includes(item.id));
  const typeCount = new Set(selectedParts.map((item) => item.partId)).size;
  const colorCount = new Set(selectedParts.map((item) => item.colorId)).size;
  const selectedGroup = model.groups.find((item) => item.id === groupId);
  const aggregateSelection = selectedParts.length > 1 || Boolean(selectedGroup);
  const selectedBounds = aggregateSelection
    ? getSelectionBounds(model, partDefinitions, selectedIds)
    : null;
  const definition = partDefinitions.find((p) => p.id === part?.partId);
  const group = model.groups.find((g) => g.id === part?.groupId);
  const color = colors.find((item) => item.id === part?.colorId) ?? colors[0];
  const protectedPart = readOnly || Boolean(part && isGroupProtected(model, part.groupId));
  const connections = definition ? getPartConnections(definition) : null;
  const contacts =
    definition && part
      ? findStudContacts(model, partDefinitions, definition, part.transform, part.id)
      : [];
  return (
    <div className="space-y-5">
      <section>
        <label className="block text-xs font-medium">
          <span className="sr-only">Choose a logical part</span>
          <select
            className="field mb-4 text-xs"
            value={part?.id ?? ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">
              {aggregateSelection
                ? `${selectedParts.length} pieces selected`
                : "Select a brick in the model…"}
            </option>
            {model.instances.map((item) => (
              <option value={item.id} key={item.id}>
                {partDefinitions.find((definition) => definition.id === item.partId)?.name ??
                  item.partId}{" "}
                · {colors.find((color) => color.id === item.colorId)?.name ?? item.colorId} ·{" "}
                {item.id}
              </option>
            ))}
          </select>
        </label>
        {aggregateSelection ? (
          <section aria-label="Selection summary" className="space-y-3">
            <h2 className="text-base">
              {selectedGroup ? "Assembly properties" : "Selection properties"}
            </h2>
            <p className="text-sm">
              {selectedParts.length} pieces · {typeCount} part {typeCount === 1 ? "type" : "types"}{" "}
              · {colorCount} {colorCount === 1 ? "color" : "colors"}
            </p>
            {selectedGroup && (
              <p className="break-all text-xs">
                {selectedGroup.name} · {selectedGroup.id}
              </p>
            )}
            {selectedBounds && (
              <div>
                <p className="text-xs text-muted-foreground">Approximate size · W × D × H · cm</p>
                <p className="mt-1 text-sm tabular-nums">
                  {formatCentimeters(selectedBounds.width)} ×{" "}
                  {formatCentimeters(selectedBounds.depth)} ×{" "}
                  {formatCentimeters(selectedBounds.height)} cm
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Studs and presentation offsets excluded.
                </p>
              </div>
            )}
            <ul className="space-y-2" aria-label="Selection colors">
              {colors
                .filter((item) => selectedParts.some((part) => part.colorId === item.id))
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-3.5 rounded-full border border-foreground/15"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span>{item.name}</span>
                    <span className="ml-auto tabular-nums">
                      {selectedParts.filter((part) => part.colorId === item.id).length}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        ) : part && definition ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-16 w-20 shrink-0 rounded-md bg-background">
                <PartPreview part={definition} color={color.hex} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base">{definition.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group?.name} · {color.name}
                </p>
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Part details</summary>
                  <p className="break-all">
                    {part.id} · {definition.id}
                  </p>
                </details>
              </div>
            </div>
            <div className="mb-4 border-y py-3">
              <PartDimensions
                part={definition}
                rotation={part.transform.rotation}
                label="Selected part dimensions"
              />
            </div>
            {connections && (
              <section
                className="mb-4 rounded-md border bg-background p-3"
                aria-label="Part connectors"
              >
                <h3 className="text-xs font-medium">Attachment</h3>
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Connection details</summary>
                  {connections.studs.length} top studs · {connections.receivers.length} underside
                  connection sites
                </details>
                <p className="mt-1 text-xs text-muted-foreground">
                  {!hasSupportedDiagnosticGeometry(definition)
                    ? "Visual detail · no supported attachment"
                    : contacts.length
                      ? `Attached at ${contacts.length} connection points`
                      : Math.abs(part.transform.y - definition.height / 2) < 0.00001
                        ? "On the floor"
                        : "No attachment at this position"}
                </p>
              </section>
            )}
            {protectedPart && (
              <p className="mb-4 flex items-start gap-2 rounded-md bg-warning-muted p-3 text-xs text-warning">
                <LockKeyhole size={15} className="shrink-0" />
                {readOnly
                  ? "Return to assembled Build to edit."
                  : `Protected ${group?.name}. Unlock it in Structure before editing.`}
              </p>
            )}
            <label className="block text-xs font-medium">
              Part color
              <select
                className="field mt-2"
                value={part.colorId}
                disabled={protectedPart}
                onChange={(e) => command({ type: "recolor", id: part.id, colorId: e.target.value })}
              >
                {colors.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2">
              <ColorPalette
                colorId={part.colorId}
                label="Recolor to"
                disabled={protectedPart}
                onChange={(colorId) => command({ type: "recolor", id: part.id, colorId })}
              />
            </div>
            <details className="mt-5 border-t pt-4">
              <summary className="cursor-pointer text-sm">Advanced position</summary>
              <h3 className="my-3 flex items-center gap-2 text-sm">
                <Move size={15} />
                Position{" "}
                <span className="ml-auto text-xs font-normal text-muted-foreground">cm</span>
              </h3>
              <PositionFields
                key={`${part.id}-${part.transform.x}-${part.transform.y}-${part.transform.z}-${part.transform.rotation}`}
                part={part}
                disabled={protectedPart}
                command={command}
              />
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                X {formatCentimeters(part.transform.x)} · Y {formatCentimeters(part.transform.y)} ·
                Z {formatCentimeters(part.transform.z)} cm
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis} className="flex">
                    {([-1, 1] as const).map((direction) => (
                      <button
                        key={direction}
                        className={`button min-w-0 flex-1 px-1 text-xs ${direction < 0 ? "rounded-r-none" : "rounded-l-none border-l-0"}`}
                        aria-label={`Move ${axis} ${direction < 0 ? "negative" : "positive"}`}
                        disabled={protectedPart}
                        onClick={() =>
                          command({
                            type: "translate",
                            id: part.id,
                            delta: {
                              x: 0,
                              y: 0,
                              z: 0,
                              [axis]: direction * (axis === "y" ? 0.2 : 1),
                            },
                          })
                        }
                      >
                        {axis.toUpperCase()} {direction < 0 ? "−" : "+"}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </details>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                className="px-2 text-xs"
                disabled={protectedPart}
                onClick={() => command({ type: "rotate", id: part.id, quarterTurns: 1 })}
              >
                <RotateCw size={14} />
                Rotate 90°
              </Button>
              <Button
                className="px-2 text-xs"
                disabled={protectedPart || !onDuplicate}
                onClick={() => onDuplicate?.(part.id)}
              >
                <Copy size={14} />
                Duplicate
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Rotation {part.transform.rotation}°</span>
              <span>R · Mod D</span>
            </div>
            <Button
              className="mt-4 w-full text-danger"
              disabled={protectedPart}
              onClick={() => command({ type: "remove", id: part.id })}
            >
              <Trash2 size={14} />
              Remove selected part
            </Button>
          </>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Project overview</p>
              <h2 className="text-base">{model.title}</h2>
              <p className="mt-3 text-xs text-muted-foreground">
                Select a brick to inspect its dimensions, adjust its position or change its finish.
              </p>
            </div>
            {model.instances.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="mb-3 text-xs font-medium">Model palette</h3>
                <ul className="space-y-2">
                  {colors
                    .filter((item) => model.instances.some((part) => part.colorId === item.id))
                    .map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs">
                        <span
                          className="size-3.5 rounded-full border border-foreground/15"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span>{item.name}</span>
                        <span className="ml-auto font-mono text-muted-foreground">
                          {model.instances.filter((part) => part.colorId === item.id).length}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {onOpenCatalog && (
              <Button className="w-full" onClick={onOpenCatalog}>
                <Plus size={14} />
                Browse parts
              </Button>
            )}
          </div>
        )}
      </section>
      <section className="border-t pt-4">
        <h3 className="mb-3 text-xs font-semibold text-muted-foreground">Model</h3>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Pieces</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums" data-testid="piece-count">
              {model.instances.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subassemblies</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{model.groups.length}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Stud alignment is shown for supported parts. Run Checks for bounded occupied-volume
          diagnostics. Physical stability is not evaluated.
        </p>
      </section>
    </div>
  );
}
