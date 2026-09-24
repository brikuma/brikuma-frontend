import { BoxGeometry, LatheGeometry, Vector2, type BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { framedDoorMaterial, type PartDefinition } from "@/core/model/public";

/** The same sill cavities, frame, leaf and retained pin joints used by overlap diagnostics. */
export function buildDoorAssemblyGeometry(definition: PartDefinition, detailed: boolean) {
  const volumes = framedDoorMaterial(definition);
  if (!volumes.length) return null;
  const pieces: BufferGeometry[] = volumes.map((volume) => {
    if (volume.kind === "box") {
      const geometry = new BoxGeometry(
        volume.halfX * 2,
        volume.top - volume.bottom,
        volume.halfZ * 2,
      );
      geometry.translate(volume.x, (volume.top + volume.bottom) / 2, volume.z);
      const surface = geometry.toNonIndexed();
      geometry.dispose();
      return surface;
    }
    const geometry = new LatheGeometry(
      [
        new Vector2(volume.inner, volume.bottom),
        new Vector2(volume.outer, volume.bottom),
        new Vector2(volume.outer, volume.top),
        new Vector2(volume.inner, volume.top),
        new Vector2(volume.inner, volume.bottom),
      ],
      detailed ? 32 : 16,
    );
    geometry.translate(volume.x, 0, volume.z);
    const surface = geometry.toNonIndexed();
    geometry.dispose();
    return surface;
  });
  const result = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!result) throw new Error("Door assembly surfaces must share their vertex attributes.");
  return result;
}
