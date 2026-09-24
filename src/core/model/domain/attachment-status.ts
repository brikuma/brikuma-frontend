import { findStudContacts, getPartConnections } from "./connections";
import { hasSupportedDiagnosticGeometry } from "./diagnostics";
import type { Model, PartDefinition } from "./types";

export type AttachmentStatus =
  "ground-supported" | "connected-to-ground" | "unattached" | "unsupported";

export interface InstanceAttachment {
  readonly id: string;
  readonly status: AttachmentStatus;
  readonly contactIds: readonly string[];
}

export interface AttachmentAssessment {
  readonly modelRevision: string;
  readonly instances: readonly InstanceAttachment[];
  readonly counts: Readonly<Record<AttachmentStatus, number>>;
  readonly physicalAssessment: "not-evaluated";
}

/** Nominal contact paths to the ground, independent of overlap, strength and manufacturing fit. */
export function assessAttachments(
  model: Model,
  definitions: readonly PartDefinition[],
): AttachmentAssessment {
  const catalog = new Map(definitions.map((definition) => [definition.id, definition]));
  const supported = model.instances.filter((instance) => {
    const definition = catalog.get(instance.partId);
    return definition && hasSupportedDiagnosticGeometry(definition);
  });
  const supportedModel = { ...model, instances: supported };
  const contacts = new Map(supported.map((instance) => [instance.id, new Set<string>()]));
  const grounded = new Set<string>();

  for (const instance of supported) {
    const definition = catalog.get(instance.partId)!;
    if (Math.abs(instance.transform.y - definition.height / 2) < 0.00001) grounded.add(instance.id);
    if (!getPartConnections(definition).receivers.length) continue;
    for (const contact of findStudContacts(
      supportedModel,
      definitions,
      definition,
      instance.transform,
      instance.id,
    )) {
      contacts.get(instance.id)!.add(contact.supportId);
      contacts.get(contact.supportId)!.add(instance.id);
    }
  }

  const reached = new Set(grounded);
  const queue = [...grounded];
  for (let index = 0; index < queue.length; index++) {
    for (const id of contacts.get(queue[index])!) {
      if (reached.has(id)) continue;
      reached.add(id);
      queue.push(id);
    }
  }

  const counts: Record<AttachmentStatus, number> = {
    "ground-supported": 0,
    "connected-to-ground": 0,
    unattached: 0,
    unsupported: 0,
  };
  const instances = model.instances.map((instance): InstanceAttachment => {
    const status: AttachmentStatus = !contacts.has(instance.id)
      ? "unsupported"
      : grounded.has(instance.id)
        ? "ground-supported"
        : reached.has(instance.id)
          ? "connected-to-ground"
          : "unattached";
    counts[status]++;
    return { id: instance.id, status, contactIds: [...(contacts.get(instance.id) ?? [])].sort() };
  });
  return { modelRevision: model.revision, instances, counts, physicalAssessment: "not-evaluated" };
}
