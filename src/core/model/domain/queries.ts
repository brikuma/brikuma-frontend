import type { BomLine, Model } from "./types";

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
