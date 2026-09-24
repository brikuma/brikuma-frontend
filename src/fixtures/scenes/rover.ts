import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { instructionSample, part } from "./build";

const instances: PartInstance[] = [];
for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 2; column += 1)
    instances.push(
      part(
        `chassis-${row}-${column}`,
        "chassis",
        "demo-plate-2x4",
        "graphite",
        column * 4 - 2,
        1.3,
        row * 2 - 2,
      ),
    );
}
for (const side of [-1, 1]) {
  for (let wheel = 0; wheel < 3; wheel += 1) {
    instances.push(
      part(
        `wheel-${side}-${wheel}`,
        "wheels",
        "demo-wheel-2x2",
        "graphite",
        side * 4.5,
        1,
        wheel * 3 - 3,
      ),
    );
    instances.push(
      part(
        `axle-${side}-${wheel}`,
        "chassis",
        "demo-brick-1x2",
        "slate",
        side * 3,
        1.1,
        wheel * 3 - 3,
      ),
    );
  }
}
for (let course = 0; course < 3; course += 1) {
  for (const side of [-1, 1]) {
    instances.push(
      part(
        `frame-${side}-${course}`,
        "body",
        "demo-brick-2x4",
        course === 1 ? "ochre" : "teal",
        side * 2,
        1.7 + course * 0.6,
        0,
        90,
      ),
    );
    instances.push(
      part(
        `nose-${side}-${course}`,
        "body",
        "demo-brick-1x2",
        "ochre",
        side * 2,
        1.7 + course * 0.6,
        2.5,
      ),
    );
    instances.push(
      part(
        `battery-${side}-${course}`,
        "body",
        "demo-brick-1x2",
        "graphite",
        side * 2,
        1.7 + course * 0.6,
        -2.5,
      ),
    );
  }
}
for (const side of [-1, 1]) {
  instances.push(part(`bonnet-${side}`, "body", "demo-slope-2x4", "teal", side * 2, 3.5, 1));
  instances.push(part(`rear-deck-${side}`, "body", "demo-plate-2x4", "ochre", side * 2, 3.3, -1));
  instances.push(part(`lamp-${side}`, "details", "demo-brick-1x1", "white", side * 2.5, 2.9, 3));
  instances.push(
    part(`camera-eye-${side}`, "details", "demo-brick-1x1", "graphite", side * 0.5, 5.1, 0.5),
  );
}
for (let level = 0; level < 3; level += 1)
  instances.push(
    part(`mast-${level}`, "details", "demo-brick-1x1", "slate", 0, 3.5 + level * 0.6, -0.5),
  );
instances.push(part("camera-bar", "details", "demo-brick-1x2", "ivory", 0, 5.1, -0.5));
for (const side of [-1, 1]) {
  for (let level = 0; level < 3; level += 1)
    instances.push(
      part(
        `rear-rail-${side}-${level}`,
        "details",
        "demo-brick-1x1",
        "slate",
        side * 2.5,
        3.5 + level * 0.6,
        -2.5,
      ),
    );
  instances.push(part(`solar-${side}`, "details", "demo-plate-2x4", "slate", side * 2, 5.1, -2));
}
export const model: Model = {
  id: "rover",
  title: "Field rover",
  revision: "rover-r1",
  baselineRevision: "rover-r1",
  instances,
  groups: [
    { id: "chassis", name: "Chassis", protected: false },
    { id: "wheels", name: "Wheels", protected: false },
    { id: "body", name: "Body", protected: false },
    { id: "details", name: "Sensors and details", protected: false },
  ],
};
export const fixture: SceneFixture = {
  model,
  variant: null,
  instructions: instructionSample(model),
};
export default fixture;
