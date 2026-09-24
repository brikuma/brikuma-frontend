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
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(instance.id)) {
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
    !input.id ||
    !input.title ||
    !input.revision ||
    !input.baselineRevision ||
    input.groups.length === 0 ||
    new Set(input.groups.map((group) => group.id)).size !== input.groups.length ||
    input.groups.some((group) => !group.id || !group.name)
  ) {
    return failure(
      "invalid-model",
      "A model needs an identity, revisions, and uniquely named subassemblies.",
    );
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
  const group = model.groups.find((candidate) => candidate.id === groupId);
  if (!group) return failure("unknown-group", "This subassembly does not belong to the model.");
  if (group.protected) {
    return failure(
      "protected-group",
      `${group.name} is protected. Unprotect it explicitly before editing.`,
    );
  }
  return { ok: true, value: true };
}
