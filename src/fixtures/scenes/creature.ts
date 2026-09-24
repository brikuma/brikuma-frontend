import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { assemblySample, instructionSample, part } from "./build";

const instances: PartInstance[] = [];
for (const side of [-1, 1]) {
  instances.push(
    part(`foot-${side}`, "feet", "demo-plate-2x4", "terracotta", side * 1.5, 0.2, 1, 90),
  );
  for (let level = 0; level < 1; level += 1)
    instances.push(
      part(
        `leg-${side}-${level}`,
        "feet",
        "demo-brick-2x2",
        "olive",
        side * 1.5,
        1 + level * 1.2,
        0,
      ),
    );
}
for (let level = 0; level < 3; level += 1) {
  for (const side of [-1, 1]) {
    instances.push(
      part(
        `belly-${side}-${level}`,
        "body",
        "demo-brick-2x2",
        level < 2 ? "ochre" : "sage",
        side,
        2.2 + level * 1.2,
        1,
      ),
    );
    instances.push(
      part(`back-${side}-${level}`, "body", "demo-brick-2x2", "olive", side, 2.2 + level * 1.2, -1),
    );
  }
  if (level < 2) {
    for (const side of [-1, 1])
      instances.push(
        part(
          `wing-${side}-${level}`,
          "body",
          "demo-brick-1x2",
          "sage",
          side * 2.5,
          3.4 + level * 1.2,
          -0.5,
          90,
        ),
      );
  }
}
for (let level = 0; level < 2; level += 1) {
  for (const side of [-1, 1]) {
    for (const z of [-1, 1])
      instances.push(
        part(
          `head-${side}-${z}-${level}`,
          "head",
          "demo-brick-2x2",
          "sage",
          side,
          5.8 + level * 1.2,
          z,
        ),
      );
  }
}
for (const side of [-1, 1]) {
  instances.push(part(`eye-white-${side}`, "face", "demo-brick-1x2", "white", side, 7, 2.5));
  instances.push(part(`pupil-${side}`, "face", "demo-brick-1x1", "graphite", side, 7, 3.5));
  instances.push(part(`brow-${side}`, "face", "demo-plate-1x2", "olive", side, 7.8, 2.5));
  instances.push(part(`ear-${side}-0`, "head", "demo-brick-1x1", "olive", side * 1.5, 8.2, -0.5));
}
instances.push(part("beak", "face", "demo-brick-1x1", "terracotta", 0, 5.8, 2.5));
instances.push(part("tail", "body", "demo-slope-2x4", "olive", 0, 2.2, -3, 180));
export const model: Model = {
  id: "creature",
  title: "Moss & mischief",
  revision: "creature-r2",
  baselineRevision: "creature-r2",
  instances,
  groups: [
    { id: "feet", name: "Feet", protected: false },
    { id: "body", name: "Body and wings", protected: false },
    { id: "head", name: "Head", protected: false },
    { id: "face", name: "Face", protected: false },
  ],
};
export const fixture: SceneFixture = {
  model,
  variant: null,
  instructions: { ...instructionSample(model), revision: "creature-instructions-r2" },
  assemblyView: assemblySample(model, [
    {
      id: "torso",
      name: "Torso, wings and tail",
      description: "The whole torso lifts above the feet with its side details in place.",
      partIds: instances
        .filter((instance) => instance.groupId === "body")
        .map((instance) => instance.id),
      offset: { x: 0, y: 1.6, z: 0 },
      views: ["modules"],
    },
    {
      id: "head",
      name: "Head and face",
      description: "The eyes, beak and ears remain on the head while the neck interface opens.",
      partIds: instances
        .filter((instance) => instance.groupId === "head" || instance.groupId === "face")
        .map((instance) => instance.id),
      offset: { x: 0, y: 3.6, z: 0 },
      views: ["modules"],
    },
  ]),
};
export default fixture;
