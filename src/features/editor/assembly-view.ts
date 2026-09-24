import type { Model, PartDefinition, PartInstance } from "@/core/model/public";
import type {
  AssemblyModuleDefinition,
  AssemblyOffset,
  AssemblyViewMetadata,
  AssemblyViewMode,
} from "@/fixtures/scene-types";

export type {
  AssemblyOffset,
  AssemblyViewMetadata,
  AssemblyViewMode,
} from "@/fixtures/scene-types";

export const ZERO_ASSEMBLY_OFFSET: AssemblyOffset = Object.freeze({ x: 0, y: 0, z: 0 });
export interface AssemblyBounds {
  readonly min: AssemblyOffset;
  readonly max: AssemblyOffset;
}
export interface AssemblyViewModule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly partIds: readonly string[];
  readonly offset: AssemblyOffset;
  readonly anchor: AssemblyOffset;
  readonly targetAnchor: AssemblyOffset;
  readonly bounds: AssemblyBounds;
}
export interface AssemblyViewPlan {
  readonly mode: AssemblyViewMode;
  readonly amount: number;
  readonly available: boolean;
  readonly unavailableReason: string | null;
  readonly caption: string;
  readonly modules: readonly AssemblyViewModule[];
  readonly offsets: ReadonlyMap<string, AssemblyOffset>;
  readonly unassignedPartCount: number;
}

const axes = ["x", "y", "z"] as const;
function finiteVector(value: AssemblyOffset): boolean {
  return axes.every((axis) => Number.isFinite(value?.[axis]) && Math.abs(value[axis]) <= 40);
}
function moduleBounds(
  parts: readonly PartInstance[],
  definitions: ReadonlyMap<string, PartDefinition>,
): AssemblyBounds | null {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const part of parts) {
    const definition = definitions.get(part.partId);
    if (
      !definition ||
      !axes.every((axis) => Number.isFinite(part.transform[axis])) ||
      ![definition.width, definition.height, definition.depth].every(
        (size) => Number.isFinite(size) && size > 0,
      )
    )
      return null;
    const turned = part.transform.rotation % 180 !== 0;
    const half = {
      x: (turned ? definition.depth : definition.width) / 2,
      y: definition.height / 2,
      z: (turned ? definition.width : definition.depth) / 2,
    };
    for (const axis of axes) {
      min[axis] = Math.min(min[axis], part.transform[axis] - half[axis]);
      max[axis] = Math.max(
        max[axis],
        part.transform[axis] + half[axis] + (axis === "y" && definition.studs ? 0.2 : 0),
      );
    }
  }
  return parts.length ? { min, max } : null;
}
function attachmentAnchor(bounds: AssemblyBounds, offset: AssemblyOffset): AssemblyOffset {
  const anchor = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
  const axis = axes.reduce((largest, candidate) =>
    Math.abs(offset[candidate]) > Math.abs(offset[largest]) ? candidate : largest,
  );
  anchor[axis] = offset[axis] >= 0 ? bounds.min[axis] : bounds.max[axis];
  return anchor;
}

/** A display-only projection. Current coordinates, quantities and model revisions remain untouched. */
export function createAssemblyView(
  model: Model,
  definitions: readonly PartDefinition[],
  metadata: AssemblyViewMetadata | undefined,
  mode: AssemblyViewMode = "modules",
  amount = 1,
): AssemblyViewPlan {
  const scale = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
  const offsets = new Map(model.instances.map((part) => [part.id, ZERO_ASSEMBLY_OFFSET]));
  const unavailable = (reason: string): AssemblyViewPlan => ({
    mode,
    amount: scale,
    available: false,
    unavailableReason: reason,
    caption: reason,
    modules: [],
    offsets,
    unassignedPartCount: 0,
  });
  if (!model.instances.length) return unavailable("Add parts before inspecting an assembly.");
  if (!metadata) return unavailable("No assembly view is authored for this model.");
  if (metadata.modelId !== model.id || metadata.baselineRevision !== model.baselineRevision)
    return unavailable("The authored assembly view does not match this model's baseline.");
  if (mode !== "roof" && mode !== "modules")
    return unavailable("Choose a supported assembly view.");
  if (!Array.isArray(metadata.modules))
    return unavailable("The assembly view metadata is incomplete.");
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const instances = new Map(model.instances.map((part) => [part.id, part]));
  const moduleIds = new Map<string, number>();
  for (const assemblyModule of metadata.modules)
    if (assemblyModule?.id)
      moduleIds.set(assemblyModule.id, (moduleIds.get(assemblyModule.id) ?? 0) + 1);
  const valid = metadata.modules.filter(
    (assemblyModule): assemblyModule is AssemblyModuleDefinition =>
      Boolean(
        assemblyModule?.id &&
        assemblyModule.name &&
        Array.isArray(assemblyModule.partIds) &&
        Array.isArray(assemblyModule.views) &&
        assemblyModule.views.includes(mode) &&
        finiteVector(assemblyModule.offset) &&
        axes.some((axis) => assemblyModule.offset[axis] !== 0) &&
        moduleIds.get(assemblyModule.id) === 1,
      ),
  );
  const owners = new Map<string, number>();
  for (const assemblyModule of valid)
    for (const id of new Set(assemblyModule.partIds)) owners.set(id, (owners.get(id) ?? 0) + 1);
  const fixed = new Set(Array.isArray(metadata.fixedPartIds) ? metadata.fixedPartIds : []);
  const modules: AssemblyViewModule[] = [];
  for (const assemblyModule of [...valid].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    const parts = [...new Set(assemblyModule.partIds)].flatMap((id) => {
      const part = instances.get(id);
      return part && owners.get(id) === 1 && !fixed.has(id) ? [part] : [];
    });
    const bounds = moduleBounds(parts, definitionsById);
    if (!bounds) continue;
    const offset = {
      x: assemblyModule.offset.x * scale,
      y: assemblyModule.offset.y * scale,
      z: assemblyModule.offset.z * scale,
    };
    const anchor = attachmentAnchor(bounds, assemblyModule.offset);
    const targetAnchor = { x: anchor.x + offset.x, y: anchor.y + offset.y, z: anchor.z + offset.z };
    for (const part of parts) offsets.set(part.id, offset);
    modules.push({
      id: assemblyModule.id,
      name: assemblyModule.name,
      description: assemblyModule.description,
      partIds: parts.map((part) => part.id),
      offset,
      anchor,
      targetAnchor,
      bounds,
    });
  }
  if (!modules.length)
    return unavailable(
      mode === "roof"
        ? "This model has no authored roof-access module."
        : "No separable assembly modules remain in this model.",
    );
  const assigned = new Set([
    ...fixed,
    ...metadata.modules.flatMap((assemblyModule) =>
      Array.isArray(assemblyModule?.partIds) ? assemblyModule.partIds : [],
    ),
  ]);
  const unassignedPartCount = model.instances.filter((part) => !assigned.has(part.id)).length;
  const title = mode === "roof" ? "Roof access" : "Assembly view";
  const detail =
    mode === "roof"
      ? "The main roof moves as one module; the surrounding structure stays assembled."
      : `${modules.length} authored modules separate along their guides; the remaining structure stays assembled.`;
  const added = unassignedPartCount
    ? ` ${unassignedPartCount} unassigned local ${unassignedPartCount === 1 ? "part stays" : "parts stay"} in place.`
    : "";
  return {
    mode,
    amount: scale,
    available: true,
    unavailableReason: null,
    caption: `${title} · ${Math.round(scale * 100)}%. ${detail}${added} Display arrangement, not a verified build order.`,
    modules,
    offsets,
    unassignedPartCount,
  };
}
