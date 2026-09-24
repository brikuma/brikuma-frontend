import type { Model, PartInstance, QuarterTurn } from "../../core/model/public";
import type {
  AssemblyModuleDefinition,
  AssemblyViewMetadata,
  InstructionSample,
} from "../scene-types";

/** Deterministic fixture authoring helper; it is never a persistence or service layer. */
export function part(
  id: string,
  groupId: string,
  partId: string,
  colorId: string,
  x: number,
  y: number,
  z: number,
  rotation: QuarterTurn = 0,
): PartInstance {
  return {
    id: id.replaceAll(".", "p"),
    groupId,
    partId,
    colorId,
    transform: { x, y: Math.round(y * 10) / 10, z, rotation },
  };
}

export function instructionSample(model: Model): InstructionSample {
  let previousIds: readonly string[] = [];
  const steps = model.groups.map((group, index) => {
    const newPartIds = model.instances
      .filter((instance) => instance.groupId === group.id)
      .map((instance) => instance.id);
    const visiblePartIds = [...previousIds, ...newPartIds];
    previousIds = visiblePartIds;
    return {
      id: `${model.id}-step-${index + 1}`,
      title: group.name,
      description: `Add the ${group.name.toLowerCase()} subassembly to the preceding layout. This is a curated visual sequence, not a verified build order.`,
      newPartIds,
      visiblePartIds,
      callout: `${newPartIds.length} logical demo parts in this subassembly`,
      preview: `/assets/previews/${model.id}-step-${index + 1}.svg`,
    };
  });
  return {
    revision: `${model.id}-instructions-r1`,
    modelRevision: model.baselineRevision,
    title: `${model.title} · layout sample`,
    steps,
  };
}

/** Display metadata records complete authored modules without changing model ownership or counts. */
export function assemblySample(
  model: Model,
  modules: readonly AssemblyModuleDefinition[],
): AssemblyViewMetadata {
  const separated = new Set(modules.flatMap((module) => module.partIds));
  return {
    modelId: model.id,
    baselineRevision: model.baselineRevision,
    modules,
    fixedPartIds: model.instances
      .filter((instance) => !separated.has(instance.id))
      .map((instance) => instance.id),
  };
}
