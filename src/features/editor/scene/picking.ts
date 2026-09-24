import { InstancedMesh, type Intersection, type Raycaster } from "three";
import type { ModelViewportProps, ViewPlane } from "../viewport-types";
import type { PartInstance } from "@/core/model/public";
import { pointIsVisible } from "./editing-plane";

/** Every physical-part display layer uses the same membership predicate. */
export function partIsPresented(
  part: PartInstance,
  layers: Pick<ModelViewportProps, "hidden" | "focusIds" | "presentationIds">,
) {
  const focused = Boolean(layers.focusIds?.includes(part.id));
  return (
    (focused || (!layers.hidden.includes(part.id) && !layers.hidden.includes(part.groupId))) &&
    (!layers.focusIds?.length || focused) &&
    (!layers.presentationIds || layers.presentationIds.includes(part.id))
  );
}

/** Filter sectioned surfaces before Fiber deduplicates instance intersections. */
export function clippedInstanceRaycast(section?: ViewPlane | null) {
  return function (this: InstancedMesh, raycaster: Raycaster, intersections: Intersection[]) {
    const start = intersections.length;
    InstancedMesh.prototype.raycast.call(this, raycaster, intersections);
    for (let index = intersections.length - 1; index >= start; index--) {
      if (!pointIsVisible(intersections[index].point, section)) intersections.splice(index, 1);
    }
  };
}

export function instancePartId(
  ids: readonly string[],
  slot: number | undefined,
  instancesPerPart = 1,
) {
  if (slot === undefined || !Number.isInteger(slot) || slot < 0 || instancesPerPart < 1)
    return undefined;
  return ids[Math.floor(slot / instancesPerPart)];
}
