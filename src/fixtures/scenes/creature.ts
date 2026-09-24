import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { instructionSample, part } from "./build";

const instances: PartInstance[] = [];
for (const side of [-1, 1]) {
  instances.push(
    part(`foot-${side}`, "feet", "demo-plate-2x4", "terracotta", side * 1.5, 0.1, 1, 90),
  );
  for (let level = 0; level < 2; level += 1)
    instances.push(
      part(
        `leg-${side}-${level}`,
        "feet",
        "demo-brick-2x2",
        "olive",
        side * 1.5,
        0.5 + level * 0.6,
        0,
      ),
    );
}
for (let level = 0; level < 6; level += 1) {
  for (const side of [-1, 1]) {
    instances.push(
      part(
        `belly-${side}-${level}`,
        "body",
        "demo-brick-2x2",
        level < 4 ? "ochre" : "sage",
        side,
        1.7 + level * 0.6,
        1,
      ),
    );
    instances.push(
      part(`back-${side}-${level}`, "body", "demo-brick-2x2", "olive", side, 1.7 + level * 0.6, -1),
    );
  }
  if (level < 4) {
    for (const side of [-1, 1])
      instances.push(
        part(
          `wing-${side}-${level}`,
          "body",
          "demo-brick-1x2",
          "sage",
          side * 2.5,
          2.3 + level * 0.6,
          -0.5,
          90,
        ),
      );
  }
}
for (let level = 0; level < 4; level += 1) {
  for (const side of [-1, 1]) {
    for (const z of [-1, 1])
      instances.push(
        part(
          `head-${side}-${z}-${level}`,
          "head",
          "demo-brick-2x2",
          "sage",
          side,
          5.3 + level * 0.6,
          z,
        ),
      );
  }
}
for (const side of [-1, 1]) {
  instances.push(part(`eye-white-${side}`, "face", "demo-brick-2x2", "white", side, 6.5, 2));
  instances.push(part(`pupil-${side}`, "face", "demo-brick-1x1", "graphite", side, 6.5, 3));
  instances.push(part(`brow-${side}`, "face", "demo-brick-1x2", "olive", side, 7.1, 2));
  instances.push(part(`ear-${side}-0`, "head", "demo-brick-1x1", "olive", side * 1.5, 7.7, -0.5));
  instances.push(part(`ear-${side}-1`, "head", "demo-brick-1x1", "olive", side * 1.5, 8.3, -0.5));
}
instances.push(part("beak", "face", "demo-brick-1x1", "terracotta", 0, 5.9, 2.5));
instances.push(part("tail", "body", "demo-slope-2x4", "olive", 0, 2.3, -3, 180));
export const model: Model = {
  id: "creature",
  title: "Moss & mischief",
  revision: "creature-r1",
  baselineRevision: "creature-r1",
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
  instructions: instructionSample(model),
};
export default fixture;
