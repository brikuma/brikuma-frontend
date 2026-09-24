import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { assemblySample, instructionSample, part } from "./build";

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
        1.4,
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
        side * 5,
        1,
        wheel * 3 - 3,
      ),
    );
    instances.push(
      part(
        `axle-${side}-${wheel}`,
        "chassis",
        "demo-axle-beam",
        "slate",
        side * 3,
        1,
        wheel * 3 - 3,
      ),
    );
  }
}
for (let course = 0; course < 2; course += 1) {
  for (const side of [-1, 1]) {
    instances.push(
      part(
        `frame-${side}-${course}`,
        "body",
        course === 0 ? "demo-brick-2x4" : "demo-plate-2x4",
        course === 1 ? "ochre" : "teal",
        side * 2,
        2.2 + course * 0.8,
        0,
        90,
      ),
    );
    instances.push(
      part(
        `nose-${side}-${course}`,
        "body",
        course === 0 ? "demo-brick-1x2" : "demo-plate-1x2",
        "ochre",
        side * 2,
        2.2 + course * 0.8,
        2.5,
      ),
    );
    instances.push(
      part(
        `battery-${side}-${course}`,
        "body",
        course === 0 ? "demo-brick-1x2" : "demo-plate-1x2",
        "graphite",
        side * 2,
        2.2 + course * 0.8,
        -2.5,
      ),
    );
  }
}
for (const side of [-1, 1]) {
  instances.push(part(`bonnet-${side}`, "body", "demo-slope-2x4", "teal", side * 2, 3.8, 1));
  instances.push(part(`rear-deck-${side}`, "body", "demo-plate-2x4", "ochre", side * 2, 3.4, -1));
  instances.push(part(`lamp-${side}`, "details", "demo-brick-1x1", "white", side * 2.5, 2.2, 3.5));
  instances.push(
    part(`camera-eye-${side}`, "details", "demo-brick-1x1", "graphite", side * 0.5, 5.4, 0.5),
  );
}
for (let level = 0; level < 1; level += 1)
  instances.push(
    part(`mast-${level}`, "details", "demo-brick-1x1", "slate", 0, 4.2 + level * 1.2, -0.5),
  );
instances.push(part("camera-bar", "details", "demo-brick-1x2", "ivory", 0, 5.4, -0.5));
for (const side of [-1, 1]) {
  for (let level = 0; level < 1; level += 1)
    instances.push(
      part(
        `rear-rail-${side}-${level}`,
        "details",
        "demo-brick-1x1",
        "slate",
        side * 2.5,
        4.2 + level * 1.2,
        -2.5,
      ),
    );
  instances.push(part(`solar-${side}`, "details", "demo-plate-2x4", "slate", side * 2, 5, -2));
}
export const model: Model = {
  id: "rover",
  title: "Field rover",
  revision: "rover-r2",
  baselineRevision: "rover-r2",
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
  instructions: { ...instructionSample(model), revision: "rover-instructions-r2" },
  assemblyView: assemblySample(model, [
    {
      id: "upper-body",
      name: "Body and instruments",
      description:
        "Body panels, lamps, mast, cameras and solar supports stay together above the chassis.",
      partIds: instances
        .filter((instance) => instance.groupId === "body" || instance.groupId === "details")
        .map((instance) => instance.id),
      offset: { x: 0, y: 3, z: 0 },
      views: ["modules"],
    },
    ...([-1, 1] as const).map((side) => ({
      id: side < 0 ? "left-wheels" : "right-wheels",
      name: side < 0 ? "Left wheel set" : "Right wheel set",
      description: "The three wheels pull away from the chassis along their axle direction.",
      partIds: instances
        .filter(
          (instance) => instance.groupId === "wheels" && Math.sign(instance.transform.x) === side,
        )
        .map((instance) => instance.id),
      offset: { x: side * 3, y: 0, z: 0 },
      views: ["modules"] as const,
    })),
  ]),
};
export default fixture;
