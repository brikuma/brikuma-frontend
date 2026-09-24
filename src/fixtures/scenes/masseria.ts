import type { Model, PartInstance, SampleVariant } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { instructionSample, part } from "./build";

const instances: PartInstance[] = [];
for (let row = 0; row < 5; row += 1) {
  for (let column = 0; column < 6; column += 1) {
    instances.push(
      part(
        `base-${row}-${column}`,
        "base",
        "demo-plate-4x4",
        "sand",
        column * 4 - 10,
        0.1,
        row * 4 - 8,
      ),
    );
  }
}
// Rear building and its two lower wings surround an open central courtyard.
for (let course = 0; course < 7; course += 1) {
  for (let column = 0; column < 5; column += 1) {
    instances.push(
      part(
        `rear-${course}-${column}`,
        "facade",
        "demo-brick-2x4",
        course === 0 ? "sand" : "ivory",
        column * 4 - 8,
        0.5 + course * 0.6,
        -8,
      ),
    );
    const isDoor = column === 2 && course < 4;
    const isWindow = (column === 1 || column === 3) && course >= 2 && course <= 3;
    instances.push(
      part(
        `inner-${course}-${column}`,
        "facade",
        "demo-brick-2x4",
        isDoor || isWindow ? "teal" : "limestone",
        column * 4 - 8,
        0.5 + course * 0.6,
        -3,
      ),
    );
  }
  for (const side of [-1, 1]) {
    instances.push(
      part(
        `rear-side-${side}-${course}`,
        "facade",
        "demo-brick-2x4",
        "ivory",
        side * 9,
        0.5 + course * 0.6,
        -5.5,
        90,
      ),
    );
  }
}
for (let course = 0; course < 5; course += 1) {
  for (const side of [-1, 1]) {
    for (let segment = 0; segment < 3; segment += 1) {
      instances.push(
        part(
          `wing-${side}-${course}-${segment}`,
          "facade",
          "demo-brick-2x4",
          course === 2 && segment === 1 ? "teal" : "limestone",
          side * 9,
          0.5 + course * 0.6,
          segment * 4,
          90,
        ),
      );
    }
    instances.push(
      part(
        `wing-inner-${side}-${course}`,
        "facade",
        "demo-brick-2x4",
        "ivory",
        side * 7,
        0.5 + course * 0.6,
        0,
        90,
      ),
    );
    instances.push(
      part(
        `entry-${side}-${course}`,
        "facade",
        "demo-brick-2x4",
        "ivory",
        side * 6,
        0.5 + course * 0.6,
        8,
      ),
    );
  }
}
// A low entry wall and two brick-built columns preserve a view into the courtyard.
for (const side of [-1, 1]) {
  for (let course = 0; course < 4; course += 1)
    instances.push(
      part(
        `gatepost-${side}-${course}`,
        "facade",
        "demo-brick-1x1",
        "limestone",
        side * 2.5,
        0.5 + course * 0.6,
        8,
      ),
    );
  instances.push(part(`gate-cap-${side}`, "facade", "demo-plate-2x2", "white", side * 2.5, 2.7, 8));
}
for (let column = 0; column < 5; column += 1) {
  for (let row = 0; row < 4; row += 1) {
    instances.push(
      part(
        `roof-${column}-${row}`,
        "roof",
        "demo-slope-2x4",
        (column + row) % 3 === 0 ? "clay" : "terracotta",
        column * 4 - 8,
        row === 1 || row === 2 ? 5.3 : 4.7,
        row * 2 - 9,
        row < 2 ? 180 : 0,
      ),
    );
  }
  instances.push(
    part(`ridge-${column}`, "roof", "demo-brick-1x2", "terracotta", column * 4 - 8, 5.8, -6, 0),
  );
}
for (const side of [-1, 1]) {
  for (let segment = 0; segment < 5; segment += 1) {
    instances.push(
      part(
        `wing-roof-${side}-${segment}`,
        "roof",
        "demo-plate-2x4",
        "terracotta",
        side * 8,
        3.3,
        segment * 2,
      ),
    );
  }
}
for (let row = 0; row < 4; row += 1) {
  for (let column = 0; column < 6; column += 1) {
    instances.push(
      part(
        `paving-${row}-${column}`,
        "courtyard",
        "demo-plate-2x2",
        (row + column) % 4 === 0 ? "limestone" : "ivory",
        column * 2 - 5,
        0.3,
        row * 2,
      ),
    );
  }
}
for (const x of [-1, 1]) {
  for (const z of [1, 3])
    instances.push(part(`water-${x}-${z}`, "courtyard", "demo-plate-2x2", "teal", x, 0.5, z));
}
for (const x of [-2.5, 2.5]) {
  for (const z of [1, 3])
    instances.push(
      part(`fountain-rim-${x}-${z}`, "courtyard", "demo-brick-1x2", "limestone", x, 0.5, z, 90),
    );
}
for (const z of [-0.5, 4.5]) {
  for (const x of [-1, 1])
    instances.push(
      part(`fountain-edge-${x}-${z}`, "courtyard", "demo-brick-1x2", "limestone", x, 0.5, z),
    );
}
for (const [treeIndex, x, z] of [
  [0, -5, 5],
  [1, 5, 1],
] as const) {
  for (let level = 0; level < 4; level += 1)
    instances.push(
      part(
        `trunk-${treeIndex}-${level}`,
        "vegetation",
        "demo-brick-1x1",
        "terracotta",
        x,
        0.7 + level * 0.6,
        z,
      ),
    );
  for (const [leafIndex, dx, dy, dz] of [
    [0, -1, 0, 0],
    [1, 1, 0, 0],
    [2, 0, 0.6, 0],
    [3, 0, 0, 1],
    [4, 0, 1.2, 0],
  ] as const) {
    instances.push(
      part(
        `leaves-${treeIndex}-${leafIndex}`,
        "vegetation",
        "demo-brick-2x2",
        leafIndex % 2 ? "sage" : "olive",
        x + dx,
        2.5 + dy,
        z + dz,
      ),
    );
  }
}
for (const side of [-1, 1]) {
  instances.push(
    part(`planter-${side}`, "vegetation", "demo-round-2x2", "terracotta", side * 4, 0.7, 6),
  );
  instances.push(
    part(`planter-leaves-${side}`, "vegetation", "demo-brick-2x2", "sage", side * 4, 1.3, 6),
  );
}

export const model: Model = {
  id: "masseria",
  title: "The courtyard house",
  baselineRevision: "masseria-r1",
  revision: "masseria-r1",
  instances,
  groups: [
    { id: "base", name: "Base", protected: false },
    { id: "facade", name: "Facade", protected: true },
    { id: "roof", name: "Roof", protected: false },
    { id: "courtyard", name: "Courtyard", protected: false },
    { id: "vegetation", name: "Vegetation", protected: false },
  ],
};

const additions: PartInstance[] = [];
for (let column = 0; column < 5; column += 1) {
  for (let row = 0; row < 2; row += 1)
    additions.push(
      part(
        `simple-roof-${column}-${row}`,
        "roof",
        "demo-plate-4x4",
        "terracotta",
        column * 4 - 8,
        4.5,
        row * 4 - 8,
      ),
    );
}
export const variant: SampleVariant = {
  id: "masseria-roof-simple",
  title: "A quieter roofline",
  description:
    "Replace the pitched rear roof with a ten-piece terracotta terrace. The protected facade remains untouched.",
  baseRevision: model.baselineRevision,
  removeIds: instances
    .filter((instance) => instance.groupId === "roof" && !instance.id.startsWith("wing-"))
    .map((instance) => instance.id),
  additions,
};
export const fixture: SceneFixture = {
  model,
  variant,
  instructions: instructionSample(model),
};
export default fixture;
