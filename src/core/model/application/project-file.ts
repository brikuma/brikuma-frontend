import { createModel, failure } from "../domain/model";
import type {
  EditingPolicy,
  GridTransform,
  Model,
  PartInstance,
  Result,
  Subassembly,
} from "../domain/types";

export const PROJECT_SCHEMA_VERSION = 1;
export const PROJECT_TEXT_LIMIT = 5 * 1024 * 1024;
export function serializeProject(model: Model): string {
  return JSON.stringify(
    {
      format: "brikuma-scene",
      schemaVersion: PROJECT_SCHEMA_VERSION,
      coordinates: "stud-y-up-quarter-turn-v1",
      model,
    },
    null,
    2,
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function string(value: unknown): value is string {
  return typeof value === "string";
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
function part(value: unknown): value is PartInstance {
  if (
    !record(value) ||
    !exactKeys(value, ["id", "partId", "colorId", "groupId", "transform"]) ||
    ![value.id, value.partId, value.colorId, value.groupId].every(string) ||
    !record(value.transform)
  )
    return false;
  const t = value.transform;
  return (
    exactKeys(t, ["x", "y", "z", "rotation"]) &&
    [t.x, t.y, t.z, t.rotation].every((item) => typeof item === "number" && Number.isFinite(item))
  );
}
function group(value: unknown): value is Subassembly {
  return (
    record(value) &&
    exactKeys(value, ["id", "name", "protected", "parentId"]) &&
    string(value.id) &&
    string(value.name) &&
    typeof value.protected === "boolean" &&
    (value.parentId === undefined || string(value.parentId))
  );
}

/** Validate completely before callers replace the active document; no partial import. */
export function parseProject(text: string, policy: EditingPolicy): Result<Model> {
  let byteLength = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    byteLength += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (byteLength > PROJECT_TEXT_LIMIT) break;
  }
  if (byteLength > PROJECT_TEXT_LIMIT)
    return failure("invalid-file", "Project exceeds the 5 MiB text limit.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return failure("invalid-file", "The project is not valid JSON.");
  }
  if (!record(value) || value.format !== "brikuma-scene")
    return failure("invalid-file", "Choose a BRIKUMA scene document.");
  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION)
    return failure("unsupported-version", "This project schema version is not supported.");
  if (
    !exactKeys(value, ["format", "schemaVersion", "coordinates", "model"]) ||
    value.coordinates !== "stud-y-up-quarter-turn-v1" ||
    !record(value.model)
  )
    return failure("invalid-file", "The project coordinate contract is invalid.");
  const model = value.model;
  if (
    !exactKeys(model, ["id", "title", "baselineRevision", "revision", "instances", "groups"]) ||
    ![model.id, model.title, model.baselineRevision, model.revision].every(string) ||
    !Array.isArray(model.instances) ||
    !Array.isArray(model.groups) ||
    model.groups.length > 1000 ||
    model.instances.length > policy.maxInstances ||
    !model.instances.every(part) ||
    !model.groups.every(group)
  )
    return failure("invalid-file", "The project contains invalid or excessive model data.");
  // Rebuild only recognized data; never retain prototype keys or arbitrary serialized fields.
  return createModel(
    {
      id: model.id as string,
      title: model.title as string,
      baselineRevision: model.baselineRevision as string,
      revision: model.revision as string,
      groups: model.groups.map((item) => ({ ...item })),
      instances: model.instances.map((item) => ({
        ...item,
        transform: { ...item.transform } as GridTransform,
      })),
    },
    policy,
  );
}
