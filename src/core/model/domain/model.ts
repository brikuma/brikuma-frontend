import type {
  DomainError,
  EditingPolicy,
  GridTransform,
  Model,
  PartInstance,
  Result,
} from "./types";

export function failure(code: DomainError["code"], message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

function onGrid(value: number, unit: number): boolean {
  return Math.abs(value / unit - Math.round(value / unit)) < 0.000001;
}

export function isValidTransform(transform: GridTransform, bounds: number): boolean {
  return (
    Object.keys(transform).every((key) => ["x", "y", "z", "rotation"].includes(key)) &&
    [transform.x, transform.y, transform.z].every(Number.isFinite) &&
    Math.abs(transform.x) <= bounds &&
    Math.abs(transform.z) <= bounds &&
    transform.y >= 0 &&
    transform.y <= bounds &&
    onGrid(transform.x, 0.1) &&
    onGrid(transform.z, 0.1) &&
    onGrid(transform.y, 0.05) &&
    [0, 90, 180, 270].includes(transform.rotation)
  );
}

export function validateInstance(
  instance: PartInstance,
  model: Model,
  policy: EditingPolicy,
): Result<PartInstance> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(instance.id)) {
    return failure("invalid-model", "Part identities must be stable, nonempty identifiers.");
  }
  if (!policy.parts.some((part) => part.id === instance.partId)) {
    return failure("unknown-part", "Choose a supported demo part.");
  }
  if (!policy.colors.includes(instance.colorId)) {
    return failure("unknown-color", "Choose a supported demo color.");
  }
  if (!model.groups.some((group) => group.id === instance.groupId)) {
    return failure("unknown-group", "This subassembly does not belong to the model.");
  }
  if (!isValidTransform(instance.transform, policy.bounds)) {
    return failure(
      "invalid-transform",
      "Use tenth-stud horizontal steps, twentieth-stud height steps, and a position inside the demo bounds.",
    );
  }
  return { ok: true, value: instance };
}

export function createModel(input: Model, policy: EditingPolicy): Result<Model> {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(input.id) ||
    !input.title ||
    !input.revision ||
    !input.baselineRevision ||
    input.revision.length > 160 ||
    input.baselineRevision.length > 160 ||
    input.groups.length === 0 ||
    new Set(input.groups.map((group) => group.id)).size !== input.groups.length ||
    input.groups.some(
      (group) => !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(group.id) || !isSafeLabel(group.name),
    ) ||
    !isSafeLabel(input.title)
  ) {
    return failure(
      "invalid-model",
      "A model needs an identity, revisions, and uniquely named subassemblies.",
    );
  }
  if (input.revision.startsWith(`${input.id}-local-`)) {
    const counter = Number(input.revision.slice(`${input.id}-local-`.length));
    if (!Number.isSafeInteger(counter) || counter < 1 || counter >= Number.MAX_SAFE_INTEGER - 1)
      return failure("invalid-model", "The local revision counter is invalid or exhausted.");
  }
  for (const group of input.groups) {
    const visited = new Set([group.id]);
    let parentId = group.parentId;
    while (parentId !== undefined) {
      if (visited.has(parentId))
        return failure("group-cycle", "A group cannot contain itself or an ancestor.");
      visited.add(parentId);
      const parent = input.groups.find((item) => item.id === parentId);
      if (!parent)
        return failure("unknown-group", "The parent group does not belong to this model.");
      parentId = parent.parentId;
    }
  }
  if (input.instances.length > policy.maxInstances) {
    return failure("piece-limit", "The demo piece limit has been reached.");
  }
  if (new Set(input.instances.map((instance) => instance.id)).size !== input.instances.length) {
    return failure("duplicate-id", "Every logical part must have a unique identity.");
  }
  for (const instance of input.instances) {
    const checked = validateInstance(instance, input, policy);
    if (!checked.ok) return checked;
  }
  return {
    ok: true,
    value: {
      ...input,
      groups: input.groups.map((group) => ({ ...group })),
      instances: input.instances.map((instance) => ({
        ...instance,
        transform: { ...instance.transform },
      })),
    },
  };
}

export function ensureEditable(model: Model, groupId: string): Result<true> {
  const visited = new Set<string>();
  let currentId: string | undefined = groupId;
  while (currentId !== undefined) {
    if (visited.has(currentId))
      return failure("group-cycle", "The group hierarchy contains a cycle.");
    visited.add(currentId);
    const group = model.groups.find((candidate) => candidate.id === currentId);
    if (!group) return failure("unknown-group", "This subassembly does not belong to the model.");
    if (group.protected)
      return failure(
        "protected-group",
        `${group.name} is protected. Unprotect it explicitly before editing.`,
      );
    currentId = group.parentId;
  }
  return { ok: true, value: true };
}

export function isSafeLabel(value: string): boolean {
  return value.trim().length > 0 && value.length <= 160 && !/[\u0000-\u001f\u007f]/.test(value);
}

export function getDescendantGroupIds(model: Model, groupId: string): readonly string[] {
  const descendants = new Set([groupId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of model.groups) {
      if (group.parentId && descendants.has(group.parentId) && !descendants.has(group.id)) {
        descendants.add(group.id);
        changed = true;
      }
    }
  }
  return [...descendants];
}

export function getGroupInstanceIds(model: Model, groupId: string): readonly string[] {
  const descendants = new Set(getDescendantGroupIds(model, groupId));
  return model.instances.filter((part) => descendants.has(part.groupId)).map((part) => part.id);
}

export function isGroupProtected(model: Model, groupId: string): boolean {
  const outcome = ensureEditable(model, groupId);
  return !outcome.ok && outcome.error.code === "protected-group";
}

/** Convert a local horizontal vector to this model's Y-up world axes. */
export function rotateVector(
  vector: Readonly<{ x: number; y: number; z: number }>,
  rotation: GridTransform["rotation"],
) {
  switch (rotation) {
    case 0:
      return { ...vector };
    case 90:
      return { x: vector.z, y: vector.y, z: -vector.x };
    case 180:
      return { x: -vector.x, y: vector.y, z: -vector.z };
    case 270:
      return { x: -vector.z, y: vector.y, z: vector.x };
  }
}

/** LDraw coordinates use 20 units per stud and Y down; flip Y and Z together. */
export function fromLDrawPoint(point: Readonly<{ x: number; y: number; z: number }>) {
  return { x: point.x / 20 || 0, y: -point.y / 20 || 0, z: -point.z / 20 || 0 };
}
