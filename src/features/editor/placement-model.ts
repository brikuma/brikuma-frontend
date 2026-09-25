import type { Model } from "@/core/model/public";
import type { PlacementPreview } from "./viewport-types";

/** The moving piece stays in the document, but cannot obstruct or support its own preview. */
export function getPlacementModel(model: Model, placement?: PlacementPreview | null): Model {
  const id = placement?.editing?.instanceId;
  return id ? { ...model, instances: model.instances.filter((part) => part.id !== id) } : model;
}
