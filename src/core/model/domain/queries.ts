import type { BomLine, Model, PartDefinition } from "./types";

/** Nominal body bounds exclude studs and do not assert a manufactured tolerance. */
export function getSelectionBounds(
  model: Model,
  definitions: readonly PartDefinition[],
  ids: readonly string[],
): Readonly<{ width: number; height: number; depth: number }> | null {
  const selected = new Set(ids);
  const parts = model.instances.filter((part) => selected.has(part.id));
  if (!parts.length || parts.length !== selected.size) return null;
  const catalog = new Map(definitions.map((part) => [part.id, part]));
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const part of parts) {
    const definition = catalog.get(part.partId);
    if (!definition) return null;
    const turned = part.transform.rotation % 180 !== 0;
    const width = turned ? definition.depth : definition.width;
    const depth = turned ? definition.width : definition.depth;
    minX = Math.min(minX, part.transform.x - width / 2);
    maxX = Math.max(maxX, part.transform.x + width / 2);
    minY = Math.min(minY, part.transform.y - definition.height / 2);
    maxY = Math.max(maxY, part.transform.y + definition.height / 2);
    minZ = Math.min(minZ, part.transform.z - depth / 2);
    maxZ = Math.max(maxZ, part.transform.z + depth / 2);
  }
  const round = (value: number) => Math.round(value * 1000000) / 1000000;
  return { width: round(maxX - minX), height: round(maxY - minY), depth: round(maxZ - minZ) };
}

export function deriveBom(model: Model): readonly BomLine[] {
  const lines = new Map<string, BomLine>();
  for (const instance of model.instances) {
    const key = `${instance.partId}\u0000${instance.colorId}`;
    const existing = lines.get(key);
    lines.set(key, {
      partId: instance.partId,
      colorId: instance.colorId,
      quantity: (existing?.quantity ?? 0) + 1,
    });
  }
  return [...lines.values()].sort(
    (a, b) => a.partId.localeCompare(b.partId) || a.colorId.localeCompare(b.colorId),
  );
}

export function isInstructionCompatible(model: Model, sampleModelRevision: string): boolean {
  return model.revision === sampleModelRevision;
}

export function missingQuantity(required: number, illustrativeOwned: number): number {
  return Math.max(0, required - illustrativeOwned);
}
