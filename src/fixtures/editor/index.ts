import type { SceneFixture } from "../scene-types";

export const editorFixtureOptions = [
  { id: "empty", name: "Empty scene", detail: "Build from your first part." },
  {
    id: "placement-lab",
    name: "Placement lab",
    detail: "Contacts, an overlap and unsupported details.",
  },
  {
    id: "courtyard-study",
    name: "Courtyard study",
    detail: "An original small house with a protected facade.",
  },
  {
    id: "rover-study",
    name: "Rover study",
    detail: "Original visual assembly; no verified mechanism.",
  },
  {
    id: "stress-1000",
    name: "Stress · 1,000 parts",
    detail: "Opt-in deterministic diagnostic workload.",
  },
  {
    id: "stress-5000",
    name: "Stress · 5,000 parts",
    detail: "Opt-in deterministic diagnostic workload.",
  },
] as const;

export type EditorFixtureId = (typeof editorFixtureOptions)[number]["id"];

/** Only the explicitly selected scene is imported. Stress models are never preloaded. */
export async function loadEditorFixture(id: EditorFixtureId): Promise<SceneFixture> {
  switch (id) {
    case "empty":
      return (await import("../scenes/blank")).fixture;
    case "placement-lab":
      return (await import("./placement-lab")).fixture;
    case "courtyard-study":
      return (await import("./courtyard-study")).fixture;
    case "rover-study":
      return (await import("../scenes/rover")).fixture;
    case "stress-1000":
      return (await import("./stress")).createStressFixture(1000);
    case "stress-5000":
      return (await import("./stress")).createStressFixture(5000);
  }
}
