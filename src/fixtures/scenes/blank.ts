import type { Model } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";

export const model: Model = {
  id: "blank",
  title: "Untitled exploration",
  baselineRevision: "blank-r1",
  revision: "blank-r1",
  instances: [],
  groups: [{ id: "workspace", name: "Free-form workspace", protected: false }],
};
export const fixture: SceneFixture = {
  model,
  variant: null,
  instructions: null,
};
export default fixture;
