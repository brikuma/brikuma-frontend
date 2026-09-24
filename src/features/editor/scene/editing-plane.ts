import { Plane, Vector3, type Ray } from "three";
import type { ViewPlane } from "../viewport-types";

const normal = new Vector3(0, 1, 0);

/** Reject grazing rays: tiny height changes otherwise amplify horizontal motion. */
export function intersectEditingPlane(ray: Ray, height: number): Vector3 | null {
  if (Math.abs(ray.direction.dot(normal)) < 0.01) return null;
  return ray.intersectPlane(new Plane(normal, -height), new Vector3());
}

/** View-only workplanes retain the canonical, right-handed Y-up stud frame. */
export function intersectWorkplane(ray: Ray, plane: ViewPlane): Vector3 | null {
  const normal = new Vector3(
    plane.axis === "x" ? 1 : 0,
    plane.axis === "y" ? 1 : 0,
    plane.axis === "z" ? 1 : 0,
  );
  if (!Number.isFinite(plane.offset) || Math.abs(ray.direction.dot(normal)) < 0.01) return null;
  return ray.intersectPlane(new Plane(normal, -plane.offset), new Vector3());
}

export function pointIsVisible(
  point: { x: number; y: number; z: number },
  plane?: ViewPlane | null,
) {
  return !plane || point[plane.axis] <= plane.offset;
}
