import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { instructionSample, part } from "../scenes/build";

const instances: PartInstance[] = [];
for (let column = 0; column < 5; column += 1)
  for (let row = 0; row < 4; row += 1)
    instances.push(
      part(
        `lab-base-${column}-${row}`,
        "base",
        "demo-plate-2x2",
        "sand",
        column * 2 - 4,
        0.2,
        row * 2 - 3,
      ),
    );
instances.push(
  part("lab-odd-width", "contacts", "demo-plate-1x3", "teal", -2.5, 0.6, -3.5),
  part("lab-even-width", "contacts", "demo-brick-2x2", "ivory", 2, 1, -3),
  part("lab-legal-stack", "contacts", "demo-brick-2x2", "teal", 2, 2.2, -3),
  part("lab-tile", "contacts", "demo-tile-2x2", "terracotta", 2, 3, -3),
  part("lab-obstacle", "obstacles", "demo-brick-2x2", "graphite", -2, 1, 1),
  part("lab-conflict", "obstacles", "demo-brick-2x2", "terracotta", -1, 1, 1),
  part("lab-unsupported", "details", "demo-slope-2x4", "clay", 3, 1, 2),
  part("lab-hole", "details", "demo-terracotta-pot", "terracotta", -6, 0.6, -3),
);
export const model: Model = {
  id: "placement-lab",
  title: "Placement lab",
  baselineRevision: "placement-lab-r1",
  revision: "placement-lab-r1",
  instances,
  groups: [
    { id: "base", name: "Studded base", protected: false },
    { id: "contacts", name: "Legal contacts", protected: false },
    { id: "obstacles", name: "Intentional overlap", protected: false },
    { id: "details", name: "Unsupported details", protected: false },
  ],
};
export const fixture: SceneFixture = {
  model,
  initiallyHiddenIds: ["lab-obstacle"],
  variant: null,
  instructions: instructionSample(model),
};
