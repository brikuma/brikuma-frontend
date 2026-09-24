export const maximumReferenceBytes = 10 * 1024 * 1024;

export function validateEditorReference(
  file: Pick<File, "type" | "size">,
  count: number,
): string | null {
  if (count >= 6) return "Choose up to six local reference images.";
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return "Use a PNG, JPEG or WebP image.";
  if (file.size === 0) return "An empty image cannot be decoded.";
  if (file.size > maximumReferenceBytes) return "Each reference must be 10 MB or smaller.";
  return null;
}

export type ReferenceCalibration = {
  readonly first: { readonly x: number; readonly y: number };
  readonly second: { readonly x: number; readonly y: number };
  readonly length: number;
  readonly plane: "XZ" | "XY" | "YZ";
};

/** User-declared scale only; a photo provides no unknown depth or physical verification. */
export function referenceScale(calibration: ReferenceCalibration): number | null {
  const { first, second, length } = calibration;
  if (![first.x, first.y, second.x, second.y, length].every(Number.isFinite) || length <= 0)
    return null;
  const pixels = Math.hypot(second.x - first.x, second.y - first.y);
  return pixels > 0 ? length / pixels : null;
}
