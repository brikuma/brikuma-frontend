import { Plane, Vector3, type Ray } from "three";

const normal = new Vector3(0, 1, 0);

/** Reject grazing rays: tiny height changes otherwise amplify horizontal motion. */
export function intersectEditingPlane(ray: Ray, height: number): Vector3 | null {
  if (Math.abs(ray.direction.dot(normal)) < 0.01) return null;
  return ray.intersectPlane(new Plane(normal, -height), new Vector3());
}
