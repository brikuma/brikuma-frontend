import { createModel, ensureEditable, failure } from "../domain/model";
import type {
  EditCommand,
  EditingPolicy,
  Model,
  ModelSession,
  PartInstance,
  Result,
  SampleVariant,
  VariantPreview,
} from "../domain/types";

export function createSession(model: Model): ModelSession {
  return { present: model, past: [], future: [], nextRevision: 1 };
}

function updateInstances(model: Model, command: EditCommand): Result<readonly PartInstance[]> {
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
  let replacement: PartInstance;
  if (command.type === "recolor") {
    if (instance.colorId === command.colorId)
      return failure("no-change", "This part already uses that color.");
    replacement = { ...instance, colorId: command.colorId };
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
  const model = session.present;
  let groups = model.groups;
  if (command.type === "set-protection") {
    const group = groups.find((candidate) => candidate.id === command.groupId);
    if (!group) return failure("unknown-group", "This subassembly does not belong to the model.");
    if (group.protected === command.protected)
      return failure("no-change", "This protection setting is already active.");
    groups = groups.map((candidate) =>
      candidate.id === command.groupId ? { ...candidate, protected: command.protected } : candidate,
    );
  }
  const changed = updateInstances(model, command);
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
      past: [...session.past, model].slice(-policy.historyLimit),
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
