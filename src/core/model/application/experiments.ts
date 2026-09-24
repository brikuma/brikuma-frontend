import { failure } from "../domain/model";
import type { EditCommand, EditingPolicy, Model, ModelSession, Result } from "../domain/types";
import { applyCommand, createSession } from "./commands";

export interface ExperimentImpact {
  readonly addedIds: readonly string[];
  readonly removedIds: readonly string[];
  readonly transformedIds: readonly string[];
  readonly recoloredIds: readonly string[];
  readonly replacedIds: readonly string[];
  readonly touchedGroupIds: readonly string[];
  readonly partDelta: number;
  readonly diagnosticsStale: boolean;
  readonly stepsStale: boolean;
}
export interface ExperimentPreview {
  readonly baseRevision: string;
  readonly baseSignature: string;
  readonly command: EditCommand;
  readonly proposed: Model;
  readonly impact: ExperimentImpact;
}

/** Includes protection and group metadata, which intentionally do not always advance geometry revision. */
export function modelSignature(model: Model): string {
  return JSON.stringify(model);
}

export function previewExperiment(
  model: Model,
  command: EditCommand,
  policy: EditingPolicy,
): Result<ExperimentPreview> {
  const outcome = applyCommand(createSession(model), command, policy);
  if (!outcome.ok) return outcome;
  const proposed = outcome.value.present;
  const before = new Map(model.instances.map((part) => [part.id, part])),
    after = new Map(proposed.instances.map((part) => [part.id, part]));
  const addedIds = proposed.instances.filter((part) => !before.has(part.id)).map((part) => part.id);
  const removedIds = model.instances.filter((part) => !after.has(part.id)).map((part) => part.id);
  const transformedIds: string[] = [],
    recoloredIds: string[] = [],
    replacedIds: string[] = [],
    touched = new Set<string>();
  for (const part of proposed.instances) {
    const previous = before.get(part.id);
    if (!previous) {
      touched.add(part.groupId);
      continue;
    }
    if (JSON.stringify(previous.transform) !== JSON.stringify(part.transform))
      transformedIds.push(part.id);
    if (previous.colorId !== part.colorId) recoloredIds.push(part.id);
    if (previous.partId !== part.partId) replacedIds.push(part.id);
    if (JSON.stringify(previous) !== JSON.stringify(part)) {
      touched.add(previous.groupId);
      touched.add(part.groupId);
    }
  }
  for (const id of removedIds) touched.add(before.get(id)!.groupId);
  for (const group of proposed.groups)
    if (JSON.stringify(group) !== JSON.stringify(model.groups.find((item) => item.id === group.id)))
      touched.add(group.id);
  const geometryChanged = proposed.revision !== model.revision;
  return {
    ok: true,
    value: {
      baseRevision: model.revision,
      baseSignature: modelSignature(model),
      command,
      proposed,
      impact: {
        addedIds,
        removedIds,
        transformedIds,
        recoloredIds,
        replacedIds,
        touchedGroupIds: [...touched],
        partDelta: addedIds.length - removedIds.length,
        diagnosticsStale: geometryChanged,
        stepsStale: geometryChanged,
      },
    },
  };
}

export function acceptExperiment(
  session: ModelSession,
  preview: ExperimentPreview,
  policy: EditingPolicy,
): Result<ModelSession> {
  if (
    session.present.revision !== preview.baseRevision ||
    modelSignature(session.present) !== preview.baseSignature
  )
    return failure(
      "revision-conflict",
      "This experiment is stale. Recalculate it against the current model or discard it.",
    );
  return applyCommand(session, preview.command, policy);
}
