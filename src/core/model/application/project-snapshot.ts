import {
  buildPlanSourceSignature,
  defaultBuildStepDescription,
  defaultBuildStepTitle,
  getBuildLayers,
  type DraftBuildPlan,
  type DraftBuildStep,
} from "../domain/build-plan";
import { failure } from "../domain/model";
import { hasSupportedDiagnosticGeometry } from "../domain/diagnostics";
import {
  isValidBuildStepDescription,
  isValidBuildStepId,
  isValidBuildStepTitle,
} from "../domain/build-plan-editing";
import type { EditingPolicy, Model, Result } from "../domain/types";
import { parseProject, PROJECT_SCHEMA_VERSION, PROJECT_TEXT_LIMIT } from "./project-file";

export interface ProjectSnapshot {
  readonly model: Model;
  readonly instructions?: {
    readonly sourceModel: Model;
    readonly plan: DraftBuildPlan;
    readonly edited: boolean;
  };
}

export interface SerializedBuildStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly view: DraftBuildStep["view"];
  readonly newPartIds: readonly string[];
}

export interface SerializedProjectSnapshot {
  readonly model: Model;
  readonly instructions?: {
    readonly sourceModel: Model;
    readonly steps: readonly SerializedBuildStep[];
    readonly edited: boolean;
  };
}

/** Bounds imported cumulative visibility while allowing the default 5,000-piece draft. */
export const INSTRUCTION_MEMBERSHIP_LIMIT = 2_000_000;

function encodeStep(step: DraftBuildStep): SerializedBuildStep {
  return {
    id: step.id,
    title: step.title,
    description: step.description,
    view: step.view,
    newPartIds: [...step.newPartIds],
  };
}

/** Compact document data only: no cumulative arrays, derived claims, or undo snapshots. */
export function encodeProjectSnapshot(snapshot: ProjectSnapshot): SerializedProjectSnapshot {
  for (const model of [snapshot.model, snapshot.instructions?.sourceModel].filter(
    (model): model is Model => !!model,
  )) {
    let byteLength = 0;
    for (const character of serializedModel(model)) {
      const code = character.codePointAt(0)!;
      byteLength += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
      if (byteLength > PROJECT_TEXT_LIMIT)
        throw new Error("The model exceeds the 5 MiB model data limit.");
    }
  }
  if (snapshot.instructions) {
    const { sourceModel, plan } = snapshot.instructions;
    if (sourceModel.id !== snapshot.model.id)
      throw new Error("The instruction source does not match this project.");
    const result = parseSteps(plan.steps.map(encodeStep), sourceModel);
    if (!result.ok) throw new Error(result.error.message);
  }
  return {
    model: snapshot.model,
    ...(snapshot.instructions
      ? {
          instructions: {
            sourceModel: snapshot.instructions.sourceModel,
            steps: snapshot.instructions.plan.steps.map(encodeStep),
            edited: snapshot.instructions.edited,
          },
        }
      : {}),
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function parseModel(value: unknown, policy: EditingPolicy): Result<Model> {
  try {
    return parseProject(serializedModel(value), policy);
  } catch {
    return failure("invalid-file", "The project contains invalid model data.");
  }
}

function serializedModel(model: unknown): string {
  return JSON.stringify({
    format: "brikuma-scene",
    schemaVersion: PROJECT_SCHEMA_VERSION,
    coordinates: "stud-y-up-quarter-turn-v1",
    model,
  });
}

function parseStep(value: unknown, pieceCount: number): Result<SerializedBuildStep> {
  if (
    !record(value) ||
    !exactKeys(value, ["id", "title", "description", "view", "newPartIds"]) ||
    !isValidBuildStepId(value.id) ||
    !isValidBuildStepTitle(value.title) ||
    !isValidBuildStepDescription(value.description) ||
    (value.view !== "isometric" && value.view !== "top") ||
    !Array.isArray(value.newPartIds) ||
    !value.newPartIds.length ||
    value.newPartIds.length > pieceCount ||
    !value.newPartIds.every((id) => typeof id === "string")
  )
    return failure("invalid-file", "The project contains an invalid instruction step.");
  return {
    ok: true,
    value: {
      id: value.id,
      title: value.title,
      description: value.description,
      view: value.view,
      newPartIds: [...value.newPartIds],
    },
  };
}

function parseSteps(inputs: unknown, source: Model): Result<readonly SerializedBuildStep[]> {
  if (!Array.isArray(inputs)) return failure("invalid-file", "Instruction steps must be an array.");
  const pieceCount = source.instances.length;
  if (!inputs.length || inputs.length > pieceCount)
    return failure("invalid-file", "Instruction steps must cover a nonempty source model.");

  const sourceIds = new Set(source.instances.map((part) => part.id));
  const stepIds = new Set<string>();
  const partIds = new Set<string>();
  const compactSteps: SerializedBuildStep[] = [];
  let cumulativeCount = 0;
  for (const input of inputs) {
    const parsed = parseStep(input, pieceCount);
    if (!parsed.ok) return parsed;
    const step = parsed.value;
    if (stepIds.has(step.id))
      return failure("invalid-file", "Instruction steps need unique identities.");
    stepIds.add(step.id);
    for (const id of step.newPartIds) {
      if (!sourceIds.has(id) || partIds.has(id))
        return failure("invalid-file", "Instructions must contain each source piece exactly once.");
      partIds.add(id);
    }
    cumulativeCount += partIds.size;
    if (cumulativeCount > INSTRUCTION_MEMBERSHIP_LIMIT)
      return failure(
        "invalid-file",
        "The instruction guide has too many separate steps. Merge some steps before saving it.",
      );
    compactSteps.push(step);
  }
  if (partIds.size !== sourceIds.size)
    return failure("invalid-file", "Instructions must contain each source piece exactly once.");

  return { ok: true, value: compactSteps };
}

/** Validate the whole snapshot before callers replace any current project state. */
export function parseProjectSnapshot(
  value: unknown,
  policy: EditingPolicy,
): Result<ProjectSnapshot> {
  if (
    !record(value) ||
    !exactKeys(value, Object.hasOwn(value, "instructions") ? ["model", "instructions"] : ["model"])
  )
    return failure("invalid-file", "The project snapshot has invalid fields.");
  const model = parseModel(value.model, policy);
  if (!model.ok) return model;
  if (!Object.hasOwn(value, "instructions")) return { ok: true, value: { model: model.value } };
  const instructions = value.instructions;
  if (
    !record(instructions) ||
    !exactKeys(instructions, ["sourceModel", "steps", "edited"]) ||
    !Array.isArray(instructions.steps) ||
    typeof instructions.edited !== "boolean"
  )
    return failure("invalid-file", "The project instruction document has invalid fields.");
  const source = parseModel(instructions.sourceModel, policy);
  if (!source.ok) return source;
  if (source.value.id !== model.value.id)
    return failure("invalid-file", "The instruction source belongs to a different model.");
  const parsed = parseSteps(instructions.steps, source.value);
  if (!parsed.ok) return parsed;
  const compactSteps = parsed.value;
  const layers = getBuildLayers(source.value, policy.parts);
  if (!layers.ok) return layers;
  const byPart = new Map(
    layers.value.flatMap((layer, layerIndex) =>
      layer.partIds.map((id) => [id, { layerIndex, baseHeight: layer.baseHeight }] as const),
    ),
  );
  const generatedSteps: SerializedBuildStep[] = [];
  layers.value.forEach((layer, layerIndex) => {
    for (let offset = 0; offset < layer.partIds.length; offset += 8) {
      const newPartIds = layer.partIds.slice(offset, offset + 8);
      generatedSteps.push({
        id: `layer-${layerIndex + 1}-step-${generatedSteps.length + 1}`,
        title: defaultBuildStepTitle(layerIndex, newPartIds.length),
        description: defaultBuildStepDescription(newPartIds.length),
        view: "isometric",
        newPartIds,
      });
    }
  });
  const visible: string[] = [];
  const steps = compactSteps.map((step) => {
    visible.push(...step.newPartIds);
    const layer = step.newPartIds
      .map((id) => byPart.get(id)!)
      .reduce((lowest, next) => (next.layerIndex < lowest.layerIndex ? next : lowest));
    return { ...step, ...layer, visiblePartIds: [...visible] };
  });
  const edited =
    instructions.edited || JSON.stringify(compactSteps) !== JSON.stringify(generatedSteps);
  const definitions = new Map(policy.parts.map((part) => [part.id, part]));
  const unchecked = new Set(
    source.value.instances
      .filter((part) => !hasSupportedDiagnosticGeometry(definitions.get(part.partId)!))
      .map((part) => part.id),
  );
  return {
    ok: true,
    value: {
      model: model.value,
      instructions: {
        sourceModel: source.value,
        plan: {
          kind: "local-layer-draft",
          modelId: source.value.id,
          modelRevision: source.value.revision,
          sourceSignature: buildPlanSourceSignature(source.value),
          layerCount: layers.value.length,
          pieceCount: source.value.instances.length,
          uncheckedPartIds: layers.value.flatMap((layer) =>
            layer.partIds.filter((id) => unchecked.has(id)),
          ),
          physicalAssessment: "not-evaluated",
          steps,
        },
        edited,
      },
    },
  };
}
