import { createModel, ensureEditable, failure, getDescendantGroupIds } from "../domain/model";
import { hasSupportedDiagnosticGeometry } from "../domain/diagnostics";
import type {
  EditCommand,
  EditingPolicy,
  Model,
  PartInstance,
  QuarterTurn,
  Result,
} from "../domain/types";

export type SelectionCommand = Extract<
  EditCommand,
  {
    type:
      | "remove-selection"
      | "recolor-selection"
      | "translate-selection"
      | "rotate-selection"
      | "create-group"
      | "rename-group"
      | "reparent-group"
      | "move-to-group"
      | "duplicate-selection"
      | "replace-part";
  }
>;
export function isSelectionCommand(command: EditCommand): command is SelectionCommand {
  return [
    "remove-selection",
    "recolor-selection",
    "translate-selection",
    "rotate-selection",
    "create-group",
    "rename-group",
    "reparent-group",
    "move-to-group",
    "duplicate-selection",
    "replace-part",
  ].includes(command.type);
}

export function getReplacementFeedback(
  model: Model,
  id: string,
  partId: string,
  policy: EditingPolicy,
): Result<{
  compatibleFootprint: boolean;
  connectors: "unchanged" | "changed" | "unknown";
  heightDelta: number;
}> {
  const instance = model.instances.find((part) => part.id === id);
  if (!instance) return failure("unknown-instance", "Select an existing part first.");
  const from = policy.parts.find((part) => part.id === instance.partId),
    to = policy.parts.find((part) => part.id === partId);
  if (!from || !to) return failure("unknown-part", "Choose a supported demo part.");
  const supported = hasSupportedDiagnosticGeometry(from) && hasSupportedDiagnosticGeometry(to);
  return {
    ok: true,
    value: {
      compatibleFootprint: from.width === to.width && from.depth === to.depth,
      connectors: !supported
        ? "unknown"
        : from.studs === to.studs && from.height === to.height
          ? "unchanged"
          : "changed",
      heightDelta: round(to.height - from.height),
    },
  };
}

export function applySelectionCommand(
  model: Model,
  command: SelectionCommand,
  policy: EditingPolicy,
): Result<Model> {
  let groups = model.groups,
    instances = model.instances;
  if (command.type === "rename-group" || command.type === "reparent-group") {
    const group = groups.find((item) => item.id === command.groupId);
    if (!group) return failure("unknown-group", "This group does not belong to the model.");
    const editable = ensureEditable(model, group.id);
    if (!editable.ok) return editable;
    for (const id of getDescendantGroupIds(model, group.id)) {
      const check = ensureEditable(model, id);
      if (!check.ok) return check;
    }
    if (command.type === "reparent-group" && command.parentId) {
      const target = ensureEditable(model, command.parentId);
      if (!target.ok) return target;
    }
    groups = groups.map((item) =>
      item.id !== group.id
        ? item
        : command.type === "rename-group"
          ? { ...item, name: command.name }
          : { ...item, parentId: command.parentId },
    );
  } else {
    const ids = command.type === "replace-part" ? [command.id] : command.ids;
    if (!ids.length || new Set(ids).size !== ids.length)
      return failure("unknown-instance", "Choose a nonempty selection of unique part identities.");
    const selected = new Set(ids);
    for (const id of ids) {
      const part = instances.find((item) => item.id === id);
      if (!part) return failure("unknown-instance", "The selection contains a missing part.");
      const editable = ensureEditable(model, part.groupId);
      if (!editable.ok) return editable;
    }
    if (command.type === "create-group") {
      if (groups.some((group) => group.id === command.group.id))
        return failure("duplicate-id", "The new group identity already exists.");
      if (command.group.parentId) {
        const target = ensureEditable(model, command.group.parentId);
        if (!target.ok) return target;
      }
      groups = [...groups, command.group];
    }
    if (command.type === "move-to-group") {
      const target = ensureEditable(model, command.groupId);
      if (!target.ok) return target;
    }
    if (
      command.type === "rotate-selection" &&
      ((command.quarterTurns !== 1 && command.quarterTurns !== -1) ||
        !Object.values(command.pivot).every(Number.isFinite))
    )
      return failure("invalid-transform", "Choose a finite pivot and a quarter turn.");
    if (command.type === "replace-part") {
      const feedback = getReplacementFeedback(model, command.id, command.partId, policy);
      if (!feedback.ok) return feedback;
      if (!feedback.value.compatibleFootprint)
        return failure("incompatible-footprint", "Replacement requires the same width and depth.");
      instances = instances.map((item) =>
        item.id === command.id
          ? {
              ...item,
              partId: command.partId,
              transform: {
                ...item.transform,
                y: round(item.transform.y + feedback.value.heightDelta / 2),
              },
            }
          : item,
      );
    } else if (command.type === "duplicate-selection") {
      if (command.newIds.length !== ids.length || new Set(command.newIds).size !== ids.length)
        return failure("duplicate-id", "Supply one unique new identity for each selected part.");
      if (![command.delta.x, command.delta.y, command.delta.z].every(Number.isFinite))
        return failure("invalid-transform", "Choose a finite translation for the duplicates.");
      const sources = new Map(instances.map((part) => [part.id, part]));
      instances = [
        ...instances,
        ...ids.map((id, index): PartInstance => {
          const source = sources.get(id)!;
          return {
            ...source,
            id: command.newIds[index],
            transform: {
              ...source.transform,
              x: round(source.transform.x + command.delta.x),
              y: round(source.transform.y + command.delta.y),
              z: round(source.transform.z + command.delta.z),
            },
          };
        }),
      ];
    } else if (command.type === "remove-selection")
      instances = instances.filter((part) => !selected.has(part.id));
    else
      instances = instances.map((part): PartInstance => {
        if (!selected.has(part.id)) return part;
        switch (command.type) {
          case "recolor-selection":
            return { ...part, colorId: command.colorId };
          case "create-group":
            return { ...part, groupId: command.group.id };
          case "move-to-group":
            return { ...part, groupId: command.groupId };
          case "translate-selection":
            return {
              ...part,
              transform: {
                ...part.transform,
                x: round(part.transform.x + command.delta.x),
                y: round(part.transform.y + command.delta.y),
                z: round(part.transform.z + command.delta.z),
              },
            };
          case "rotate-selection": {
            const { pivot, quarterTurns } = command;
            const x = part.transform.x - pivot.x,
              z = part.transform.z - pivot.z;
            return {
              ...part,
              transform: {
                ...part.transform,
                x: round(pivot.x + quarterTurns * z),
                z: round(pivot.z - quarterTurns * x),
                rotation: ((part.transform.rotation + quarterTurns * 90 + 360) %
                  360) as QuarterTurn,
              },
            };
          }
        }
      });
  }
  if (
    JSON.stringify(instances) === JSON.stringify(model.instances) &&
    JSON.stringify(groups) === JSON.stringify(model.groups)
  )
    return failure("no-change", "The proposed command does not change the model.");
  return createModel({ ...model, instances, groups }, policy);
}
function round(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
