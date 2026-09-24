import { describe, expect, it } from "vitest";
import type { PartInstance } from "../../src/core/model/public";
import { partDefinitions } from "../../src/fixtures/catalog";
import { model as house } from "../../src/fixtures/scenes/masseria";
import { model as rover } from "../../src/fixtures/scenes/rover";
import { model as creature } from "../../src/fixtures/scenes/creature";

const definitions = new Map(partDefinitions.map((definition) => [definition.id, definition]));
function extent(instance: PartInstance) {
  const definition = definitions.get(instance.partId)!;
  const turned = instance.transform.rotation % 180 !== 0;
  return {
    width: turned ? definition.depth : definition.width,
    depth: turned ? definition.width : definition.depth,
    height: definition.height,
  };
}
function studs(instance: PartInstance) {
  const { width, depth } = extent(instance);
  return Array.from({ length: width }, (_, x) =>
    Array.from({ length: depth }, (_, z) => ({
      x: instance.transform.x - (width - 1) / 2 + x,
      z: instance.transform.z - (depth - 1) / 2 + z,
    })),
  ).flat();
}

describe("Authored fixture assembly dimensions", () => {
  it("keeps ordinary bricks and plates at the documented one-stud proportions", () => {
    for (const definition of partDefinitions) {
      if (definition.id.startsWith("demo-brick-") || definition.id === "demo-round-2x2")
        expect(definition.height, definition.id).toBe(1.2);
      if (definition.id.startsWith("demo-plate-") || definition.id.startsWith("demo-tile-"))
        expect(definition.height, definition.id).toBe(0.4);
    }
  });

  it("seats wall and stair bottom courses on matching studded floor plates", () => {
    const floor = house.instances.filter(
      (instance) => instance.transform.y === 0.6 && definitions.get(instance.partId)!.studs,
    );
    const floorStuds = new Set(floor.flatMap(studs).map(({ x, z }) => `${x}:${z}`));
    const bottomCourses = house.instances.filter((instance) => {
      const definition = definitions.get(instance.partId)!;
      return (
        definition.studs &&
        (instance.groupId === "facade" ||
          instance.id.startsWith("stair-") ||
          instance.id.startsWith("landing-")) &&
        Math.abs(instance.transform.y - definition.height / 2 - 0.8) < 0.001
      );
    });
    expect(bottomCourses.length).toBeGreaterThan(50);
    for (const instance of bottomCourses)
      for (const { x, z } of studs(instance))
        expect(
          floorStuds.has(`${x}:${z}`),
          `${instance.id} has no matching support stud at ${x}, ${z}`,
        ).toBe(true);
  });

  it("keeps the authored masonry and stair bodies from crossing one another", () => {
    const bodies = house.instances.filter(
      (instance) =>
        (instance.groupId === "facade" && instance.partId.startsWith("demo-brick-")) ||
        instance.id.startsWith("stair-") ||
        instance.id.startsWith("landing-"),
    );
    for (let a = 0; a < bodies.length; a += 1) {
      for (let b = a + 1; b < bodies.length; b += 1) {
        const first = bodies[a],
          second = bodies[b];
        if (first.groupId === "vegetation" || second.groupId === "vegetation") continue;
        const p = extent(first),
          q = extent(second);
        const overlap = [
          (p.width + q.width) / 2 - Math.abs(first.transform.x - second.transform.x),
          (p.height + q.height) / 2 - Math.abs(first.transform.y - second.transform.y),
          (p.depth + q.depth) / 2 - Math.abs(first.transform.z - second.transform.z),
        ];
        expect(
          overlap.some((value) => value < 0.01),
          `${first.id} crosses ${second.id}`,
        ).toBe(true);
      }
    }
  });

  it("aligns standard brick and smooth-tile underside connectors at authored vertical contacts", () => {
    const supports = house.instances.filter((instance) => definitions.get(instance.partId)!.studs);
    const standardParts = house.instances.filter((instance) =>
      /^demo-(brick|plate|tile)-/.test(instance.partId),
    );
    let checked = 0;
    for (const upper of standardParts) {
      const upperSize = extent(upper);
      const bottom = upper.transform.y - upperSize.height / 2;
      const sockets = new Set(studs(upper).map(({ x, z }) => `${x}:${z}`));
      for (const lower of supports) {
        if (Math.abs(lower.transform.y + extent(lower).height / 2 - bottom) > 0.001) continue;
        for (const { x, z } of studs(lower)) {
          if (
            Math.abs(x - upper.transform.x) >= upperSize.width / 2 - 0.001 ||
            Math.abs(z - upper.transform.z) >= upperSize.depth / 2 - 0.001
          )
            continue;
          checked += 1;
          expect(
            sockets.has(`${x}:${z}`),
            `${lower.id} misses ${upper.id}'s underside connector at ${x}, ${z}`,
          ).toBe(true);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("keeps every migrated fixture body above its ground plane", () => {
    for (const model of [house, rover, creature])
      for (const instance of model.instances)
        expect(
          instance.transform.y - extent(instance).height / 2,
          instance.id,
        ).toBeGreaterThanOrEqual(-0.001);
  });
});
