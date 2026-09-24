import type { PartDefinition, PartInstance, QuarterTurn } from "@/core/model/public";

function footprint(definition: PartDefinition, rotation: QuarterTurn) {
  return rotation % 180 === 0
    ? { x: definition.width, z: definition.depth }
    : { x: definition.depth, z: definition.width };
}

export function snapPlacementCenter(
  point: { x: number; z: number },
  definition: PartDefinition,
  rotation: QuarterTurn,
  surface?: { part: PartInstance; definition: PartDefinition },
) {
  const size = footprint(definition, rotation);
  const support = surface && footprint(surface.definition, surface.part.transform.rotation);
  if (
    !Number.isInteger(size.x) ||
    !Number.isInteger(size.z) ||
    (support && (!Number.isInteger(support.x) || !Number.isInteger(support.z)))
  )
    return { x: Math.round(point.x * 2) / 2, z: Math.round(point.z * 2) / 2 };

  // Ground studs lie at cell centers. A support contributes its own stud-grid phase,
  // so odd/even footprints and quarter turns keep their connectors aligned.
  const origin =
    surface && support
      ? {
          x: surface.part.transform.x - (support.x - 1) / 2,
          z: surface.part.transform.z - (support.z - 1) / 2,
        }
      : { x: 0.5, z: 0.5 };
  const center = { x: origin.x + (size.x - 1) / 2, z: origin.z + (size.z - 1) / 2 };
  return {
    x: center.x + Math.round(point.x - center.x),
    z: center.z + Math.round(point.z - center.z),
  };
}
