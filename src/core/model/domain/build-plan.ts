import { failure, isValidTransform } from "./model";
import { hasSupportedDiagnosticGeometry } from "./diagnostics";
import type { Model, PartDefinition, Result } from "./types";

export interface BuildLayer {
  readonly baseHeight: number;
  readonly partIds: readonly string[];
}

export interface DraftBuildStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly layerIndex: number;
  readonly baseHeight: number;
  readonly newPartIds: readonly string[];
  readonly visiblePartIds: readonly string[];
}

export interface DraftBuildPlan {
  readonly kind: "local-layer-draft";
  readonly modelId: string;
  readonly modelRevision: string;
  readonly sourceSignature: string;
  readonly steps: readonly DraftBuildStep[];
  readonly layerCount: number;
  readonly pieceCount: number;
  readonly uncheckedPartIds: readonly string[];
  readonly physicalAssessment: "not-evaluated";
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Exact local source identity, also guarding imports that reuse a revision string. */
function sourceSignature(model: Model): string {
  return JSON.stringify([
    model.id,
    model.revision,
    [...model.instances]
      .sort((a, b) => compareText(a.id, b.id))
      .map((part) => [
        part.id,
        part.partId,
        part.colorId,
        part.groupId,
        part.transform.x,
        part.transform.y,
        part.transform.z,
        part.transform.rotation,
      ]),
  ]);
}

export function isBuildPlanCurrent(model: Model, plan: DraftBuildPlan): boolean {
  return (
    plan.modelId === model.id &&
    plan.modelRevision === model.revision &&
    plan.sourceSignature === sourceSignature(model)
  );
}

/** Shared layer membership without the cumulative step arrays used by instruction pages. */
export function getBuildLayers(
  model: Model,
  definitions: readonly PartDefinition[],
): Result<readonly BuildLayer[]> {
  if (!model.instances.length)
    return failure("invalid-model", "Add pieces before generating instructions.");
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  const ids = new Set<string>();
  const sorted = [];
  for (const part of model.instances) {
    const definition = catalog.get(part.partId);
    if (!definition)
      return failure("unknown-part", `Instructions need a definition for ${part.partId}.`);
    if (ids.has(part.id))
      return failure("duplicate-id", "Instruction steps need unique part identities.");
    ids.add(part.id);
    if (
      ![definition.width, definition.height, definition.depth].every(
        (value) => Number.isFinite(value) && value > 0,
      ) ||
      !isValidTransform(part.transform, Infinity)
    )
      return failure(
        "invalid-transform",
        "Instruction layers need finite positions and positive part dimensions.",
      );
    sorted.push({
      part,
      definition,
      bottom: Math.round((part.transform.y - definition.height / 2) * 1000000) / 1000000,
    });
  }
  sorted.sort(
    (a, b) =>
      a.bottom - b.bottom ||
      a.part.transform.z - b.part.transform.z ||
      a.part.transform.x - b.part.transform.x ||
      compareText(a.part.id, b.part.id),
  );
  const layers: { baseHeight: number; partIds: string[] }[] = [];
  for (const entry of sorted) {
    const last = layers.at(-1);
    if (last?.baseHeight === entry.bottom) last.partIds.push(entry.part.id);
    else layers.push({ baseHeight: entry.bottom, partIds: [entry.part.id] });
  }
  return { ok: true, value: layers };
}

/** Deterministic bottom-up local instructions. Sorting is not an insertion or stability proof. */
export function generateBuildPlan(
  model: Model,
  definitions: readonly PartDefinition[],
): Result<DraftBuildPlan> {
  const result = getBuildLayers(model, definitions);
  if (!result.ok) return result;
  const steps: DraftBuildStep[] = [];
  const visible: string[] = [];
  result.value.forEach((layer, layerIndex) => {
    for (let offset = 0; offset < layer.partIds.length; offset += 8) {
      const added = layer.partIds.slice(offset, offset + 8);
      visible.push(...added);
      steps.push({
        id: `layer-${layerIndex + 1}-step-${steps.length + 1}`,
        title: `Layer ${layerIndex + 1} · ${added.length === 1 ? "1 piece" : `${added.length} pieces`}`,
        description: `Place the highlighted ${added.length === 1 ? "piece" : "pieces"} in the positions shown. Previously placed pieces stay faded for context.`,
        layerIndex,
        baseHeight: layer.baseHeight,
        newPartIds: added,
        visiblePartIds: [...visible],
      });
    }
  });
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  const byId = new Map(model.instances.map((part) => [part.id, part]));
  return {
    ok: true,
    value: {
      kind: "local-layer-draft",
      modelId: model.id,
      modelRevision: model.revision,
      sourceSignature: sourceSignature(model),
      steps,
      layerCount: result.value.length,
      pieceCount: visible.length,
      uncheckedPartIds: visible.filter(
        (id) => !hasSupportedDiagnosticGeometry(catalog.get(byId.get(id)!.partId)!),
      ),
      physicalAssessment: "not-evaluated",
    },
  };
}
