"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getGroupInstanceIds,
  centimetersToStuds,
  formatCentimeters,
  isGroupProtected,
  rotateVector,
  type EditCommand,
  type Model,
} from "@/core/model/public";
import { colors } from "@/fixtures/catalog";

export function SelectionTools({
  model,
  ids,
  groupId,
  onGroup,
  command,
  readOnly,
  onFocus,
  onDuplicate,
  onHide,
  onClear,
}: {
  model: Model;
  ids: readonly string[];
  groupId: string | null;
  onGroup: (id: string | null) => void;
  command: (value: EditCommand) => boolean;
  readOnly: boolean;
  onFocus: () => void;
  onDuplicate?: () => void;
  onHide: () => void;
  onClear: () => void;
}) {
  const [name, setName] = useState("New assembly");
  const [axes, setAxes] = useState<"world" | "local">("world");
  const [pivotMode, setPivotMode] = useState("active");
  const [delta, setDelta] = useState({ x: "0", y: "0", z: "0" });
  const [targetGroup, setTargetGroup] = useState("");
  const parts = model.instances.filter((part) => ids.includes(part.id));
  const group = model.groups.find((item) => item.id === groupId);
  const active = parts.find((part) => part.id === ids[ids.length - 1]) ?? parts[0];
  if (!active && !group) return null;
  const locked = parts.some((part) => isGroupProtected(model, part.groupId));
  const disabled = readOnly || locked;
  const commonColor = parts.every((part) => part.colorId === active?.colorId)
    ? active?.colorId
    : "";
  const center = parts.length
    ? {
        x:
          (Math.min(...parts.map((p) => p.transform.x)) +
            Math.max(...parts.map((p) => p.transform.x))) /
          2,
        y:
          (Math.min(...parts.map((p) => p.transform.y)) +
            Math.max(...parts.map((p) => p.transform.y))) /
          2,
        z:
          (Math.min(...parts.map((p) => p.transform.z)) +
            Math.max(...parts.map((p) => p.transform.z))) /
          2,
      }
    : { x: 0, y: 0, z: 0 };
  const pivot = pivotMode === "center" ? center : (active?.transform ?? center);
  const finite = Object.values(delta).every(
    (value) => value.trim() !== "" && Number.isFinite(Number(value)),
  );
  function translate() {
    const vector = {
      x: centimetersToStuds(Number(delta.x)),
      y: centimetersToStuds(Number(delta.y)),
      z: centimetersToStuds(Number(delta.z)),
    };
    command({
      type: "translate-selection",
      ids,
      delta: axes === "local" && active ? rotateVector(vector, active.transform.rotation) : vector,
    });
  }
  return (
    <section className="space-y-3 border-b pb-4" aria-label="Selection commands">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base">{group ? group.name : `${ids.length} selected`}</h2>
        <button className="button text-xs" onClick={onClear}>
          Clear
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {group
          ? `${getGroupInstanceIds(model, group.id).length} pieces in this assembly`
          : `Active: ${active?.id}`}
      </p>
      {(locked || readOnly) && (
        <p className="text-xs text-warning">
          {locked
            ? "Protected scope: the entire edit is blocked."
            : "Return to assembled Build to edit."}
        </p>
      )}
      <div className="flex gap-2">
        <Button className="flex-1 text-xs" onClick={onFocus}>
          Focus lens
        </Button>
        <Button className="flex-1 text-xs" onClick={onHide}>
          Hide selection
        </Button>
      </div>
      {ids.length > 1 && onDuplicate && (
        <Button className="w-full text-xs" disabled={disabled} onClick={onDuplicate}>
          Duplicate selection
        </Button>
      )}
      {ids.length > 0 && (
        <details open={ids.length > 1}>
          <summary className="min-h-10 py-2 text-sm">Rigid selection transform</summary>
          <label className="block text-xs">
            Selection color
            <select
              className="field mt-1"
              value={commonColor ?? ""}
              disabled={disabled}
              onChange={(e) => command({ type: "recolor-selection", ids, colorId: e.target.value })}
            >
              <option value="" disabled>
                Mixed colors
              </option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name}
                </option>
              ))}
            </select>
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (finite) translate();
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs">
                Axes
                <select
                  className="field mt-1"
                  value={axes}
                  onChange={(e) => setAxes(e.target.value as "world" | "local")}
                >
                  <option value="world">World</option>
                  <option value="local">Active part local</option>
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                Translation delta
                <br />
                centimeters
              </p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={axis} className="text-xs uppercase">
                  {axis} (cm)
                  <input
                    required
                    type="number"
                    step={axis === "y" ? 0.04 : 0.08}
                    className="field mt-1 px-2"
                    aria-label={`Selection delta ${axis.toUpperCase()}`}
                    value={delta[axis]}
                    onChange={(e) => setDelta({ ...delta, [axis]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setDelta({ x: "0", y: "0", z: "0" });
                        e.stopPropagation();
                      }
                    }}
                  />
                </label>
              ))}
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={disabled || !finite}>
              Apply rigid translation
            </Button>
          </form>
          <label className="block text-xs">
            Rotation pivot
            <select
              className="field mt-1"
              value={pivotMode}
              onChange={(e) => setPivotMode(e.target.value)}
            >
              <option value="active">Active part origin</option>
              <option value="center">Selection center</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Pivot: {formatCentimeters(pivot.x)}, {formatCentimeters(pivot.y)},{" "}
            {formatCentimeters(pivot.z)} cm · height axis
          </p>
          <Button
            className="w-full"
            disabled={disabled}
            onClick={() => command({ type: "rotate-selection", ids, pivot, quarterTurns: 1 })}
          >
            Rotate selection 90°
          </Button>
          <Button
            className="w-full text-danger"
            disabled={disabled}
            onClick={() => command({ type: "remove-selection", ids })}
          >
            Remove selection
          </Button>
        </details>
      )}
      <details>
        <summary className="min-h-10 py-2 text-sm">Group & scope</summary>
        <div className="space-y-3 pt-2">
          <label className="block text-xs">
            Assembly name
            <input
              className="field mt-1"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {group ? (
            <>
              <Button
                disabled={disabled}
                className="w-full"
                onClick={() => command({ type: "rename-group", groupId: group.id, name })}
              >
                Rename selected group
              </Button>
              <Button className="w-full" onClick={() => onGroup(group.id)}>
                Enter group
              </Button>
            </>
          ) : (
            <Button
              disabled={disabled || !ids.length}
              className="w-full"
              onClick={() =>
                command({
                  type: "create-group",
                  group: {
                    id: `group-${model.revision}-${model.groups.length}`,
                    name,
                    protected: false,
                  },
                  ids,
                })
              }
            >
              Group selection
            </Button>
          )}
          <label className="block text-xs">
            Destination assembly
            <select
              className="field mt-1"
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
            >
              <option value="">Choose assembly…</option>
              {model.groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="w-full"
            disabled={disabled || !targetGroup}
            onClick={() => command({ type: "move-to-group", ids, groupId: targetGroup })}
          >
            Move parts to assembly
          </Button>
          {group && (
            <Button
              className="w-full"
              disabled={disabled || !targetGroup}
              onClick={() =>
                command({ type: "reparent-group", groupId: group.id, parentId: targetGroup })
              }
            >
              Nest selected group
            </Button>
          )}
        </div>
      </details>
    </section>
  );
}
