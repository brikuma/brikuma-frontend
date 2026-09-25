import {
  encodeProjectSnapshot,
  parseProjectSnapshot,
  parseProject,
  type EditingPolicy,
  type Model,
  type ProjectSnapshot,
} from "@/core/model/public";
import {
  decodeProjectContext,
  emptyProjectContext,
  encodeProjectContext,
  snapshotProjectContext,
  type ProjectContextState,
} from "./project-context-file";

export const PROJECT_PACKAGE_BYTES = 96 * 1024 * 1024;
export class WorkspaceReferencePendingError extends Error {
  constructor() {
    super("Checking reference images before saving…");
  }
}
export type ProjectPackage = {
  snapshot: ProjectSnapshot;
  context: ProjectContextState;
};
export type WorkspaceProject = {
  snapshot?: ProjectSnapshot;
  baseline?: Model;
  context: ProjectContextState;
};
type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

/** Explicit portable backup; browser URLs and model/editorial history are never exported. */
export async function serializeProjectPackage(project: ProjectPackage): Promise<string> {
  const snapshot = encodeProjectSnapshot(project.snapshot);
  const context = await encodeProjectContext(project.context);
  const text = JSON.stringify({ format: "brikuma-project", schemaVersion: 1, snapshot, context });
  if (new TextEncoder().encode(text).byteLength > PROJECT_PACKAGE_BYTES)
    throw new Error("This project exceeds the 96 MiB backup limit. Remove a reference and retry.");
  return text;
}

/** Validate the entire file, including reference bytes, before offering document replacement. */
export async function parseProjectPackage(
  text: string,
  policy: EditingPolicy,
): Promise<Parsed<ProjectPackage>> {
  if (!text || new TextEncoder().encode(text).byteLength > PROJECT_PACKAGE_BYTES)
    return { ok: false, error: "Choose a nonempty project file no larger than 96 MiB." };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "The project is not valid JSON." };
  }
  if (record(value) && value.format === "brikuma-scene") {
    const scene = parseProject(text, policy);
    return scene.ok
      ? { ok: true, value: { snapshot: { model: scene.value }, context: emptyProjectContext() } }
      : { ok: false, error: scene.error.message };
  }
  if (
    !record(value) ||
    value.format !== "brikuma-project" ||
    value.schemaVersion !== 1 ||
    !keys(value, ["format", "schemaVersion", "snapshot", "context"])
  )
    return { ok: false, error: "Choose a supported BRIKUMA project or scene file." };
  const snapshot = parseProjectSnapshot(value.snapshot, policy);
  if (!snapshot.ok) return { ok: false, error: snapshot.error.message };
  const context = await decodeProjectContext(value.context);
  return context.ok
    ? { ok: true, value: { snapshot: snapshot.value, context: context.value } }
    : context;
}

/** IndexedDB structured cloning retains image Blobs without repeatedly encoding them to text. */
export function snapshotWorkspaceProject(project: WorkspaceProject) {
  if (
    project.context.references.some(
      (reference) =>
        reference.type.startsWith("image/") &&
        (!reference.validated || !reference.width || !reference.height),
    )
  )
    throw new WorkspaceReferencePendingError();
  return {
    format: "brikuma-workspace-project",
    schemaVersion: 1,
    ...(project.snapshot ? { snapshot: encodeProjectSnapshot(project.snapshot) } : {}),
    ...(project.baseline ? { baseline: encodeProjectSnapshot({ model: project.baseline }) } : {}),
    context: snapshotProjectContext(project.context),
  };
}

export async function parseWorkspaceProject(
  value: unknown,
  policy: EditingPolicy,
): Promise<Parsed<WorkspaceProject>> {
  if (
    !record(value) ||
    value.format !== "brikuma-workspace-project" ||
    value.schemaVersion !== 1 ||
    !keys(value, ["format", "schemaVersion", "snapshot", "baseline", "context"])
  )
    return { ok: false, error: "This saved project has an unsupported format." };
  const snapshot =
    value.snapshot === undefined ? undefined : parseProjectSnapshot(value.snapshot, policy);
  const baseline =
    value.baseline === undefined ? undefined : parseProjectSnapshot(value.baseline, policy);
  if (snapshot && !snapshot.ok) return { ok: false, error: snapshot.error.message };
  if (baseline && !baseline.ok) return { ok: false, error: baseline.error.message };
  if (!!snapshot !== !!baseline || (baseline?.ok && baseline.value.instructions))
    return { ok: false, error: "The saved model baseline is incomplete." };
  if (snapshot?.ok && baseline?.ok && snapshot.value.model.id !== baseline.value.model.id)
    return { ok: false, error: "The saved baseline belongs to a different model." };
  const context = await decodeProjectContext(value.context);
  if (!context.ok) return context;
  return {
    ok: true,
    value: {
      snapshot: snapshot?.ok ? snapshot.value : undefined,
      baseline: baseline?.ok ? baseline.value.model : undefined,
      context: context.value,
    },
  };
}
