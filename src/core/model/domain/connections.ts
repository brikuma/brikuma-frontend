import type { GridTransform, Model, PartDefinition } from "./types";

export interface StudSite {
  readonly x: number;
  readonly z: number;
}

/** Connector geometry supported by the original demo catalog, not a manufacturing check. */
export function getPartConnections(definition: PartDefinition) {
  const integerFootprint = Number.isInteger(definition.width) && Number.isInteger(definition.depth);
  const grid: StudSite[] = [];
  if (integerFootprint)
    for (let x = 0; x < definition.width; x++)
      for (let z = 0; z < definition.depth; z++)
        grid.push({ x: x - (definition.width - 1) / 2, z: z - (definition.depth - 1) / 2 });
  const receivesStuds =
    (integerFootprint &&
      definition.height >= 0.3 &&
      (definition.shape === "brick" || definition.shape === "plate")) ||
    (definition.shape === "cylinder" &&
      definition.studs &&
      definition.width === 2 &&
      definition.depth === 2) ||
    definition.id === "demo-slope-2x4" ||
    definition.id === "demo-slope-1x2" ||
    definition.id === "demo-roof-bed" ||
    definition.id === "demo-gate-arch";
  return {
    studs: definition.studs ? grid : [],
    receivers:
      definition.id === "demo-gate-arch"
        ? [
            { x: -2, z: 0 },
            { x: 2, z: 0 },
          ]
        : receivesStuds
          ? grid
          : [],
    receivesStuds,
  };
}

export function worldStudSites(sites: readonly StudSite[], transform: GridTransform): StudSite[] {
  const angle = (transform.rotation * Math.PI) / 180;
  return sites.map(({ x, z }) => ({
    x: transform.x + x * Math.cos(angle) + z * Math.sin(angle),
    z: transform.z - x * Math.sin(angle) + z * Math.cos(angle),
  }));
}

export interface StudContact extends StudSite {
  readonly y: number;
  readonly supportId: string;
}

/** Coincident vertical stud/receiver sites only. Custom clips, hinges and strength are unknown. */
export function findStudContacts(
  model: Model,
  definitions: readonly PartDefinition[],
  definition: PartDefinition,
  transform: GridTransform,
  excludeId?: string,
): StudContact[] {
  const receivers = worldStudSites(getPartConnections(definition).receivers, transform);
  if (!receivers.length) return [];
  const bottom = transform.y - definition.height / 2;
  const contacts: StudContact[] = [];
  for (const support of model.instances) {
    if (support.id === excludeId) continue;
    const below = definitions.find((item) => item.id === support.partId);
    if (!below || Math.abs(support.transform.y + below.height / 2 - bottom) > 0.001) continue;
    for (const site of worldStudSites(getPartConnections(below).studs, support.transform)) {
      if (
        receivers.some((receiver) => Math.hypot(receiver.x - site.x, receiver.z - site.z) < 0.001)
      )
        contacts.push({ ...site, y: bottom, supportId: support.id });
    }
  }
  return contacts;
}

/** Conservative occupied body bounds for stud-mounted parts, used only by assisted placement. */
export function hasOccupiedStudSpace(
  model: Model,
  definitions: readonly PartDefinition[],
  definition: PartDefinition,
  transform: GridTransform,
  excludeId?: string,
) {
  const size = (part: PartDefinition, position: GridTransform) =>
    position.rotation % 180 === 0 ? [part.width, part.depth] : [part.depth, part.width];
  const [width, depth] = size(definition, transform);
  return model.instances.some((part) => {
    if (part.id === excludeId) return false;
    const other = definitions.find((item) => item.id === part.partId);
    if (!other) return false;
    const [otherWidth, otherDepth] = size(other, part.transform);
    return (
      Math.abs(transform.x - part.transform.x) < (width + otherWidth) / 2 - 0.025 &&
      Math.abs(transform.z - part.transform.z) < (depth + otherDepth) / 2 - 0.025 &&
      Math.abs(transform.y - part.transform.y) < (definition.height + other.height) / 2 - 0.02
    );
  });
}
