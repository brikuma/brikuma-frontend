import {
  maximumReferenceBytes,
  referenceScale,
  type ReferenceCalibration,
} from "./local-reference";

export type ProjectBrief = {
  subject: string;
  visualLanguage: string;
  constructionApproach: string;
  technique: string;
  maxPieces: string;
  footprint: string;
  colors: string;
  intendedUse: string;
};

export type ProjectReference = {
  id: number;
  filename: string;
  type: string;
  size: number;
  blob?: Blob;
  url?: string;
  validated?: boolean;
  width?: number;
  height?: number;
};

export type ProjectContextState = {
  brief: ProjectBrief;
  references: ProjectReference[];
  calibrations: Record<number, ReferenceCalibration>;
};
export type StoredProjectContext = Omit<ProjectContextState, "references"> & {
  references: Omit<ProjectReference, "url" | "validated">[];
};
export type SerializedProjectContext = Omit<ProjectContextState, "references"> & {
  references: (Omit<ProjectReference, "url" | "blob" | "validated"> & { imageData?: string })[];
};
export type ProjectContextResult =
  { ok: true; value: ProjectContextState } | { ok: false; error: string };

export const referenceTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export function validateReference(file: Pick<File, "type" | "size">, count: number): string | null {
  if (count >= 6) return "Choose up to six reference files.";
  if (!referenceTypes.includes(file.type))
    return "Use PNG, JPEG, WebP or PDF files. Other file types are not supported.";
  if (file.size > maximumReferenceBytes) return "Each reference must be 10 MB or smaller.";
  if (file.size === 0) return "Empty files cannot be used as references.";
  return null;
}

export function emptyProjectContext(): ProjectContextState {
  return {
    brief: {
      subject: "",
      visualLanguage: "Warm and minimal",
      constructionApproach: "Stud-based bricks",
      technique: "Upright stacking (supported subset)",
      maxPieces: "500",
      footprint: "Desktop · up to 32 × 32 studs",
      colors: "",
      intendedUse: "Display",
    },
    references: [],
    calibrations: {},
  };
}

/** IndexedDB can retain Blob values directly; object URLs belong only to the mounted provider. */
export function snapshotProjectContext(context: ProjectContextState): StoredProjectContext {
  const invalid = contextMetadataError(context);
  if (invalid) throw new Error(invalid);
  return {
    brief: { ...context.brief },
    references: context.references.map((reference) => ({
      id: reference.id,
      filename: reference.filename,
      type: reference.type,
      size: reference.size,
      ...(reference.blob && reference.type.startsWith("image/") ? { blob: reference.blob } : {}),
      ...(reference.width !== undefined ? { width: reference.width } : {}),
      ...(reference.height !== undefined ? { height: reference.height } : {}),
    })),
    calibrations: Object.fromEntries(
      Object.entries(context.calibrations).map(([id, calibration]) => [
        id,
        {
          first: { ...calibration.first },
          second: { ...calibration.second },
          length: calibration.length,
          plane: calibration.plane,
        },
      ]),
    ),
  };
}

function bytesOf(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error("The reference image could not be read."));
    reader.onerror = () => reject(new Error("The reference image could not be read."));
    reader.readAsArrayBuffer(blob);
  });
}

export async function encodeProjectContext(
  context: ProjectContextState,
): Promise<SerializedProjectContext> {
  const checked = await decodeProjectContext(snapshotProjectContext(context));
  if (!checked.ok) throw new Error(checked.error);
  const snapshot = snapshotProjectContext(checked.value);
  const references: SerializedProjectContext["references"] = [];
  for (const { blob, ...metadata } of snapshot.references) {
    if (!metadata.type.startsWith("image/")) {
      references.push(metadata);
      continue;
    }
    if (!blob) throw new Error("A reference image is missing its local bytes.");
    const bytes = new Uint8Array(await bytesOf(blob));
    let binary = "";
    for (let index = 0; index < bytes.length; index += 8192)
      binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    references.push({ ...metadata, imageData: btoa(binary) });
  }
  return { ...snapshot, references };
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));
const text = (value: unknown, maximum: number): value is string =>
  typeof value === "string" &&
  value.length <= maximum &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const dimension = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 40_000_000;

function contextMetadataError(context: ProjectContextState): string | null {
  if (
    !(Object.keys(emptyProjectContext().brief) as (keyof ProjectBrief)[]).every((key) =>
      text(context.brief[key], key === "maxPieces" ? 100 : 10_000),
    )
  )
    return "Project brief fields must contain bounded text.";
  if (context.references.length > 6) return "Choose up to six reference files.";
  const ids = new Set<number>();
  for (const reference of context.references) {
    if (
      !Number.isSafeInteger(reference.id) ||
      reference.id < 0 ||
      reference.id > 1_000_000_000 ||
      ids.has(reference.id) ||
      !text(reference.filename, 1024) ||
      !reference.filename ||
      !Number.isSafeInteger(reference.size) ||
      reference.size <= 0 ||
      validateReference(reference, 0)
    )
      return "A reference has invalid identity, metadata, type or size.";
    ids.add(reference.id);
    if (reference.type === "application/pdf") {
      if (reference.blob || reference.width !== undefined || reference.height !== undefined)
        return "PDF references may contain metadata only.";
    } else {
      if (
        !reference.blob ||
        reference.blob.size !== reference.size ||
        reference.blob.type !== reference.type
      )
        return "A reference image is missing its matching local bytes.";
      if (
        (reference.width !== undefined || reference.height !== undefined) &&
        (!dimension(reference.width) ||
          !dimension(reference.height) ||
          reference.width * reference.height > 40_000_000)
      )
        return "A reference image has invalid dimensions or exceeds 40 million pixels.";
    }
  }
  for (const [id, calibration] of Object.entries(context.calibrations)) {
    const reference = context.references.find((item) => String(item.id) === id);
    const width = reference?.width;
    const height = reference?.height;
    const scale = referenceScale(calibration);
    if (
      !width ||
      !height ||
      (calibration.plane !== "XZ" && calibration.plane !== "XY" && calibration.plane !== "YZ") ||
      scale === null ||
      !Number.isFinite(scale) ||
      [calibration.first, calibration.second].some(
        (point) => point.x < 0 || point.x > width || point.y < 0 || point.y > height,
      )
    )
      return "A reference calibration is invalid or has no matching image.";
  }
  return null;
}

async function imageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  let url: string | undefined;
  let image: HTMLImageElement | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const decoding =
      typeof createImageBitmap === "function"
        ? createImageBitmap(blob).then((bitmap) => {
            try {
              return { width: bitmap.width, height: bitmap.height };
            } finally {
              bitmap.close();
            }
          })
        : new Promise<{ width: number; height: number }>((resolve, reject) => {
            image = new Image();
            image.onload = () =>
              resolve({ width: image!.naturalWidth, height: image!.naturalHeight });
            image.onerror = () => reject(new Error("A reference image cannot be decoded."));
            url = URL.createObjectURL(blob);
            image.src = url;
          });
    return await Promise.race([
      decoding,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("A reference image took too long to decode.")),
          10_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    if (image) {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
    }
    if (url) URL.revokeObjectURL(url);
  }
}

function matchesImageType(bytes: Uint8Array, type: string) {
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return (
    type === "image/webp" &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  );
}

/** Validate an entire context before replacing state; imported URLs are never trusted or fetched. */
export async function decodeProjectContext(value: unknown): Promise<ProjectContextResult> {
  const invalid = (error: string): ProjectContextResult => ({ ok: false, error });
  if (
    !record(value) ||
    !keys(value, ["brief", "references", "calibrations"]) ||
    !record(value.brief) ||
    !Array.isArray(value.references) ||
    value.references.length > 6 ||
    !record(value.calibrations)
  )
    return invalid("The project brief or references are invalid.");
  const rawBrief = value.brief;
  const briefKeys = Object.keys(emptyProjectContext().brief) as (keyof ProjectBrief)[];
  if (
    !keys(rawBrief, briefKeys) ||
    !briefKeys.every((key) => text(rawBrief[key], key === "maxPieces" ? 100 : 10_000))
  )
    return invalid("Project brief fields must contain bounded text.");
  const brief = Object.fromEntries(briefKeys.map((key) => [key, rawBrief[key]])) as ProjectBrief;
  const references: ProjectReference[] = [];
  const usedIds = new Set<number>();
  try {
    for (const raw of value.references) {
      if (
        !record(raw) ||
        !keys(raw, ["id", "filename", "type", "size", "width", "height", "blob", "imageData"]) ||
        typeof raw.id !== "number" ||
        !Number.isSafeInteger(raw.id) ||
        raw.id < 0 ||
        raw.id > 1_000_000_000 ||
        usedIds.has(raw.id) ||
        !text(raw.filename, 1024) ||
        !raw.filename ||
        typeof raw.type !== "string" ||
        typeof raw.size !== "number" ||
        !Number.isSafeInteger(raw.size) ||
        raw.size <= 0 ||
        validateReference({ type: raw.type, size: raw.size }, references.length)
      )
        return invalid("A reference has invalid identity, metadata, type or size.");
      usedIds.add(raw.id);
      const metadata = {
        id: raw.id,
        filename: raw.filename,
        type: raw.type,
        size: raw.size,
      };
      if (raw.type === "application/pdf") {
        if (["blob", "imageData", "width", "height"].some((key) => key in raw))
          return invalid("PDF references may contain metadata only.");
        references.push(metadata);
        continue;
      }
      const hasBlob = "blob" in raw;
      if (hasBlob === "imageData" in raw)
        return invalid("Each image reference needs exactly one copy of its local bytes.");
      let blob: Blob;
      if (hasBlob) {
        if (!(raw.blob instanceof Blob) || raw.blob.type !== raw.type)
          return invalid("A stored reference image is invalid.");
        blob = raw.blob;
      } else {
        if (
          typeof raw.imageData !== "string" ||
          raw.imageData.length > Math.ceil(maximumReferenceBytes / 3) * 4 ||
          raw.imageData.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(raw.imageData)
        )
          return invalid("A reference image has invalid or oversized encoded bytes.");
        const binary = atob(raw.imageData);
        blob = new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], {
          type: raw.type,
        });
      }
      if (blob.size !== raw.size || blob.size <= 0 || blob.size > maximumReferenceBytes)
        return invalid("A reference image's bytes do not match its declared size.");
      if (!matchesImageType(new Uint8Array(await bytesOf(blob)), raw.type))
        return invalid("A reference image's bytes do not match its declared image type.");
      const decoded = await imageDimensions(blob);
      if (
        !dimension(decoded.width) ||
        !dimension(decoded.height) ||
        decoded.width * decoded.height > 40_000_000 ||
        (raw.width !== undefined && raw.width !== decoded.width) ||
        (raw.height !== undefined && raw.height !== decoded.height)
      )
        return invalid("A reference image has invalid dimensions or exceeds 40 million pixels.");
      references.push({ ...metadata, blob, ...decoded, validated: true });
    }
  } catch {
    return invalid("A reference image could not be read or decoded. Current work is unchanged.");
  }
  const calibrations: Record<number, ReferenceCalibration> = {};
  for (const [key, raw] of Object.entries(value.calibrations)) {
    const reference = references.find((item) => String(item.id) === key);
    const width = reference?.width;
    const height = reference?.height;
    if (
      !reference ||
      !width ||
      !height ||
      !record(raw) ||
      !keys(raw, ["first", "second", "length", "plane"]) ||
      typeof raw.length !== "number" ||
      !Number.isFinite(raw.length) ||
      raw.length <= 0 ||
      (raw.plane !== "XZ" && raw.plane !== "XY" && raw.plane !== "YZ")
    )
      return invalid("A reference calibration is invalid or has no matching image.");
    const validPoint = (point: unknown): point is { x: number; y: number } =>
      !(
        !record(point) ||
        !keys(point, ["x", "y"]) ||
        typeof point.x !== "number" ||
        typeof point.y !== "number" ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        point.x < 0 ||
        point.x > width ||
        point.y < 0 ||
        point.y > height
      );
    if (!validPoint(raw.first) || !validPoint(raw.second))
      return invalid("Reference calibration points must lie within their image.");
    const calibration: ReferenceCalibration = {
      first: raw.first,
      second: raw.second,
      length: raw.length,
      plane: raw.plane,
    };
    const scale = referenceScale(calibration);
    if (scale === null || !Number.isFinite(scale))
      return invalid("Reference calibration needs two distinct points and a finite scale.");
    calibrations[reference.id] = {
      first: { ...calibration.first },
      second: { ...calibration.second },
      length: calibration.length,
      plane: calibration.plane,
    };
  }
  return { ok: true, value: { brief, references, calibrations } };
}
