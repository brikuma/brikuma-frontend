import { createModel, ensureEditable, failure } from "../domain/model";
import { validatePlacement } from "../domain/placement";
import {
  applySelectionCommand,
  isSelectionCommand,
  type SelectionCommand,
} from "./selection-commands";
import type {
  EditCommand,
  EditingPolicy,
  Model,
  ModelSession,
  PartInstance,
  QuarterTurn,
  Result,
  SampleVariant,
  VariantPreview,
} from "../domain/types";

export function createSession(model: Model): ModelSession {
  const localRevision = model.revision.startsWith(`${model.id}-local-`)
    ? Number(model.revision.slice(`${model.id}-local-`.length))
    : 0;
  return {
    present: model,
    past: [],
    future: [],
    nextRevision:
      Number.isSafeInteger(localRevision + 1) && localRevision >= 0 ? localRevision + 1 : 1,
  };
}

function updateInstances(
  model: Model,
  command: Exclude<EditCommand, SelectionCommand | { type: "place" }>,
): Result<readonly PartInstance[]> {
  if (command.type === "set-protection") return { ok: true, value: model.instances };
  if (command.type === "apply-variant") {
    if (model.revision !== command.variant.baseRevision) {
      return failure(
        "revision-conflict",
        "This pre-authored variant belongs to the original revision. Undo changes or reset the demo before applying it.",
      );
    }
    const removeIds = new Set(command.variant.removeIds);
    if (
      removeIds.size !== command.variant.removeIds.length ||
      [...removeIds].some((id) => !model.instances.some((part) => part.id === id))
    ) {
      return failure(
        "unknown-instance",
        "The variant no longer matches this model's part identities.",
      );
    }
    const affected = model.instances
      .filter((part) => removeIds.has(part.id))
      .concat(command.variant.additions);
    if (affected.length === 0) return failure("no-change", "This variant has no changes to apply.");
    for (const part of affected) {
      const editable = ensureEditable(model, part.groupId);
      if (!editable.ok) return editable;
    }
    return {
      ok: true,
      value: [
        ...model.instances.filter((part) => !removeIds.has(part.id)),
        ...command.variant.additions,
      ],
    };
  }
  if (command.type === "add") {
    const editable = ensureEditable(model, command.instance.groupId);
    if (!editable.ok) return editable;
    return { ok: true, value: [...model.instances, command.instance] };
  }
  const instance = model.instances.find((part) => part.id === command.id);
  if (!instance) return failure("unknown-instance", "Select an existing part first.");
  const editable = ensureEditable(model, instance.groupId);
  if (!editable.ok) return editable;
  if (command.type === "remove")
    return {
      ok: true,
      value: model.instances.filter((part) => part.id !== command.id),
    };
  if (command.type === "duplicate")
    return {
      ok: true,
      value: [...model.instances, { ...instance, id: command.newId, transform: command.transform }],
    };
  let replacement: PartInstance;
  if (command.type === "recolor") {
    if (instance.colorId === command.colorId)
      return failure("no-change", "This part already uses that color.");
    replacement = { ...instance, colorId: command.colorId };
  } else if (command.type === "rotate") {
    if (command.quarterTurns !== 1 && command.quarterTurns !== -1)
      return failure("invalid-transform", "Rotate by one quarter turn at a time.");
    replacement = {
      ...instance,
      transform: {
        ...instance.transform,
        rotation: ((instance.transform.rotation + command.quarterTurns * 90 + 360) %
          360) as QuarterTurn,
      },
    };
  } else if (command.type === "set-transform") {
    const previous = instance.transform;
    if (
      (["x", "y", "z", "rotation"] as const).every(
        (key) => previous[key] === command.transform[key],
      )
    )
      return failure("no-change", "This part is already at that position and rotation.");
    replacement = { ...instance, transform: command.transform };
  } else {
    if (command.delta.x === 0 && command.delta.y === 0 && command.delta.z === 0)
      return failure("no-change", "Choose a nonzero grid movement.");
    replacement = {
      ...instance,
      transform: {
        ...instance.transform,
        x: Math.round((instance.transform.x + command.delta.x) * 1000000) / 1000000,
        y: Math.round((instance.transform.y + command.delta.y) * 1000000) / 1000000,
        z: Math.round((instance.transform.z + command.delta.z) * 1000000) / 1000000,
      },
    };
  }
  return {
    ok: true,
    value: model.instances.map((part) => (part.id === command.id ? replacement : part)),
  };
}

export function applyCommand(
  session: ModelSession,
  command: EditCommand,
  policy: EditingPolicy,
): Result<ModelSession> {
  if (
    !Number.isSafeInteger(session.nextRevision) ||
    session.nextRevision < 1 ||
    session.nextRevision >= Number.MAX_SAFE_INTEGER - 1
  )
    return failure("invalid-model", "The local revision counter is exhausted.");
  const model = session.present;
  let groups = model.groups;
  let nextCommand = command;
  if (command.type === "place") {
    if (command.baseRevision !== model.revision)
      return failure(
        "revision-conflict",
        "Placement belongs to an older revision. Recalculate it before placing.",
      );
    const definition = policy.parts.find((part) => part.id === command.instance.partId);
    if (!definition) return failure("unknown-part", "Choose a supported demo part.");
    const placement = validatePlacement(
      model,
      policy.parts,
      definition,
      command.instance.transform,
      command.placement,
      policy.bounds,
    );
    if (!placement.ok) return placement;
    nextCommand = { type: "add", instance: command.instance };
  }
  if (command.type === "set-protection") {
    const group = groups.find((candidate) => candidate.id === command.groupId);
    if (!group) return failure("unknown-group", "This subassembly does not belong to the model.");
    if (group.parentId) {
      const ancestor = ensureEditable(model, group.parentId);
      if (!ancestor.ok) return ancestor;
    }
    if (group.protected === command.protected)
      return failure("no-change", "This protection setting is already active.");
    groups = groups.map((candidate) =>
      candidate.id === command.groupId ? { ...candidate, protected: command.protected } : candidate,
    );
  }
  let changed: Result<readonly PartInstance[]>;
  if (isSelectionCommand(nextCommand)) {
    const outcome = applySelectionCommand(model, nextCommand, policy);
    if (!outcome.ok) return outcome;
    groups = outcome.value.groups;
    changed = { ok: true, value: outcome.value.instances };
  } else if (nextCommand.type !== "place") {
    changed = updateInstances(model, nextCommand);
  } else return failure("invalid-model", "Unsupported placement command.");
  if (!changed.ok) return changed;
  const geometryChanged = command.type !== "set-protection";
  const checked = createModel(
    {
      ...model,
      groups,
      instances: changed.value,
      revision: geometryChanged ? `${model.id}-local-${session.nextRevision}` : model.revision,
    },
    policy,
  );
  if (!checked.ok) return checked;
  return {
    ok: true,
    value: {
      present: checked.value,
      past: policy.historyLimit > 0 ? [...session.past, model].slice(-policy.historyLimit) : [],
      future: [],
      nextRevision: session.nextRevision + (geometryChanged ? 1 : 0),
    },
  };
}

export function undo(session: ModelSession): Result<ModelSession> {
  const previous = session.past.at(-1);
  if (!previous) return failure("empty-history", "There is no local edit to undo.");
  return {
    ok: true,
    value: {
      ...session,
      present: previous,
      past: session.past.slice(0, -1),
      future: [session.present, ...session.future],
    },
  };
}

export function previewVariant(
  model: Model,
  variant: SampleVariant,
  policy: EditingPolicy,
): Result<VariantPreview> {
  const outcome = applyCommand(createSession(model), { type: "apply-variant", variant }, policy);
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    value: {
      pieceCount: outcome.value.present.instances.length,
      removedCount: variant.removeIds.length,
      addedCount: variant.additions.length,
    },
  };
}

export function redo(session: ModelSession): Result<ModelSession> {
  const next = session.future[0];
  if (!next) return failure("empty-history", "There is no local edit to redo.");
  return {
    ok: true,
    value: {
      ...session,
      present: next,
      past: [...session.past, session.present],
      future: session.future.slice(1),
    },
  };
}
