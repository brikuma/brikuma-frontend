import type { ProjectId } from "./projects";
import type { SceneFixture } from "./scene-types";

export async function loadScene(id: ProjectId): Promise<SceneFixture> {
  switch (id) {
    case "masseria":
      return (await import("./scenes/masseria")).fixture;
    case "rover":
      return (await import("./scenes/rover")).fixture;
    case "creature":
      return (await import("./scenes/creature")).fixture;
    case "blank":
      return (await import("./scenes/blank")).fixture;
  }
}
