import { assessAttachments } from "../domain/attachment-status";
import { generateArchitectureParts, type ArchitectureRequest } from "../domain/architecture-layout";
import { diagnosePlacement, hasSupportedDiagnosticGeometry } from "../domain/diagnostics";
import { failure } from "../domain/model";
import { diagnoseModel } from "../domain/placement";
import type { EditingPolicy, Model, Result } from "../domain/types";
import { previewExperiment, type ExperimentPreview } from "./experiments";

export interface ArchitecturePreview {
  readonly experiment: ExperimentPreview;
  readonly request: ArchitectureRequest;
  readonly summary: {
    readonly addedCount: number;
    readonly groundedCount: number;
    readonly connectedCount: number;
    readonly width: number;
    readonly depth: number;
    readonly height: number;
    readonly sections: Readonly<{ foundation: number; walls: number; roof: number }>;
  };
}

/** Creates a checked additive proposal. Existing experiment acceptance rejects a stale base. */
export function createArchitecturePreview(
  model: Model,
  policy: EditingPolicy,
  request: ArchitectureRequest,
): Result<ArchitecturePreview> {
  const generated = generateArchitectureParts(
    request,
    policy.parts,
    model.instances.map((part) => part.id),
  );
  if (!generated.ok) return generated;
  const preview = previewExperiment(
    model,
    {
      type: "apply-variant",
      variant: {
        id: `${request.idPrefix}-proposal`,
        title: request.layout === "courtyard" ? "Courtyard building" : "House building",
        description: "Deterministic local construction from editable demo parts.",
        baseRevision: model.revision,
        removeIds: [],
        additions: generated.value.instances,
      },
    },
    policy,
  );
  if (!preview.ok) return preview;
  const proposed = preview.value.proposed;
  const additions = new Set(preview.value.impact.addedIds);
  const diagnosis = diagnoseModel(proposed, policy.parts);
  const conflict = diagnosis.conflicts.find((pair) => pair.ids.some((id) => additions.has(id)));
  if (conflict)
    return failure(
      "occupied-volume",
      `The building overlaps existing or proposed pieces (${conflict.ids.join(", ")}). Move its origin or choose a different section.`,
    );
  const catalog = new Map(policy.parts.map((part) => [part.id, part]));
  const unknown = model.instances.filter((part) => {
    const definition = catalog.get(part.partId);
    return !definition || !hasSupportedDiagnosticGeometry(definition);
  });
  if (unknown.length) {
    const uncheckedModel = { ...model, instances: unknown };
    for (const part of generated.value.instances) {
      const result = diagnosePlacement(
        uncheckedModel,
        policy.parts,
        catalog.get(part.partId)!,
        part.transform,
      );
      if (result.uncheckedIds.length)
        return failure(
          "unsupported-connector",
          "The building intersects geometry that cannot be checked. Move its origin before applying.",
        );
    }
  }
  const attachments = assessAttachments(proposed, policy.parts).instances.filter((part) =>
    additions.has(part.id),
  );
  if (attachments.some((part) => part.status === "unattached" || part.status === "unsupported"))
    return failure(
      "missing-connection",
      request.section === "roof"
        ? "Build the matching foundation and walls before adding this roof."
        : "Build a matching foundation first so every new part has a supported connection to the ground.",
    );
  return {
    ok: true,
    value: {
      experiment: preview.value,
      request,
      summary: {
        addedCount: attachments.length,
        groundedCount: attachments.filter((part) => part.status === "ground-supported").length,
        connectedCount: attachments.filter((part) => part.status === "connected-to-ground").length,
        width: request.width,
        depth: request.depth,
        height: generated.value.height,
        sections: generated.value.counts,
      },
    },
  };
}
