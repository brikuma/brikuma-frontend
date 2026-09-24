import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { assemblySample, instructionSample, part } from "../scenes/build";

const instances: PartInstance[] = [];
for (let column = 0; column < 8; column += 1)
  for (let row = 0; row < 6; row += 1)
    instances.push(
      part(
        `court-base-${column}-${row}`,
        "base",
        "demo-plate-2x2",
        "sand",
        column * 2 - 7,
        0.2,
        row * 2 - 5,
      ),
    );
// One-stud walls sit exactly over the half-stud centers of the foundation studs.
for (let course = 0; course < 5; course += 1) {
  const y = 1 + course * 1.2;
  for (let column = 0; column < 8; column += 1) {
    const x = column * 2 - 7;
    instances.push(
      part(
        `court-back-${course}-${column}`,
        "facade",
        "demo-brick-1x2",
        course === 4 ? "sand" : "limestone",
        x,
        y,
        -5.5,
      ),
    );
    if (column < 3 || column > 4 || course > 2)
      instances.push(
        part(`court-front-${course}-${column}`, "facade", "demo-brick-1x2", "limestone", x, y, 5.5),
      );
  }
  for (let row = 0; row < 5; row += 1)
    for (const side of [-1, 1])
      instances.push(
        part(
          `court-side-${side}-${course}-${row}`,
          "facade",
          "demo-brick-1x2",
          "limestone",
          side * 7.5,
          y,
          row * 2 - 4,
          90,
        ),
      );
}
// A rear room leaves the front half open; roof panels form a removable rigid module.
for (let course = 0; course < 4; course += 1)
  for (let column = 0; column < 7; column += 1)
    if (column !== 3 || course === 3)
      instances.push(
        part(
          `court-room-${course}-${column}`,
          "interior",
          "demo-brick-1x2",
          "ivory",
          column * 2 - 6,
          1 + course * 1.2,
          -0.5,
        ),
      );
for (let column = 0; column < 4; column += 1)
  for (let row = 0; row < 3; row += 1)
    instances.push(
      part(
        `court-roof-${column}-${row}`,
        "roof",
        "demo-plate-2x4",
        "terracotta",
        column * 4 - 6,
        6.6,
        row * 2 - 5,
      ),
    );
for (const x of [-4, 4]) {
  instances.push(part(`court-seat-${x}`, "interior", "demo-brick-2x2", "teal", x, 1, 2));
  instances.push(part(`court-seat-top-${x}`, "interior", "demo-tile-2x2", "teal", x, 1.8, 2));
}
export const model: Model = {
  id: "courtyard-study",
  title: "Courtyard study",
  baselineRevision: "courtyard-study-r1",
  revision: "courtyard-study-r1",
  instances,
  groups: [
    { id: "base", name: "Foundation", protected: false },
    { id: "facade", name: "Facade", protected: true },
    { id: "interior", name: "Courtyard and rear room", protected: false },
    { id: "roof", name: "Rear roof", protected: false },
  ],
};
export const fixture: SceneFixture = {
  model,
  variant: null,
  instructions: instructionSample(model),
  assemblyView: assemblySample(model, [
    {
      id: "rear-roof",
      name: "Rear roof",
      description: "Lift the roof to inspect the rear room.",
      partIds: instances
        .filter((instance) => instance.groupId === "roof")
        .map((instance) => instance.id),
      offset: { x: 0, y: 5, z: 0 },
      views: ["roof", "modules"],
    },
  ]),
};
