import type { Model, PartInstance, QuarterTurn, SampleVariant } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";
import { partDefinitions } from "../catalog";
import { assemblySample, instructionSample, part } from "./build";

const instances: PartInstance[] = [];
const add = (...input: Parameters<typeof part>) => instances.push(part(...input));
const moduleParts = {
  entrance: [] as string[],
  mainRoof: [] as string[],
  towerRoof: [] as string[],
  stairs: [] as string[],
};
function recordModule(module: keyof typeof moduleParts, start: number) {
  moduleParts[module].push(...instances.slice(start).map((instance) => instance.id));
}
type Opening = { from: number; to: number; first: number; last: number };

// Interrupted, staggered courses leave actual openings, rather than painted-on doors.
function wall(
  id: string,
  axis: "x" | "z",
  fixed: number,
  from: number,
  to: number,
  courses: number,
  openings: Opening[] = [],
) {
  for (let course = 0; course < courses; course += 1) {
    const holes = openings
      .filter((hole) => course >= hole.first && course <= hole.last)
      .sort((a, b) => a.from - b.from);
    const segments: [number, number][] = [];
    let edge = from;
    for (const hole of holes) {
      if (hole.from > edge) segments.push([edge, hole.from]);
      edge = Math.max(edge, hole.to);
    }
    if (edge < to) segments.push([edge, to]);
    for (const [segment, [start, end]] of segments.entries()) {
      let cursor = start;
      let index = 0;
      while (cursor < end) {
        const width = Math.min(end - cursor, index === 0 && course % 2 ? 1 : 2);
        const center = cursor + width / 2;
        const color =
          (index + course * 3 + segment) % 17 === 0
            ? "sand"
            : (index * 3 + course) % 5 === 0
              ? "limestone"
              : "ivory";
        add(
          `${id}-${course}-${segment}-${index}`,
          "facade",
          width === 1 ? "demo-brick-1x1" : "demo-brick-1x2",
          color,
          axis === "x" ? center : fixed,
          1.4 + course * 1.2,
          axis === "x" ? fixed : center,
          axis === "x" ? 0 : 90,
        );
        cursor += width;
        index += 1;
      }
    }
  }
}
function windowFrame(id: string, x: number, y: number, z: number, rotation: QuarterTurn = 0) {
  // The glazing is recessed in a true two-course opening; framing joins at its edges.
  add(`${id}-glass`, "facade", "demo-window-inset", "graphite", x, y, z, rotation);
  for (const side of [-1, 1])
    add(`${id}-edge-${side}`, "facade", "demo-window-rail", "timber", x, y + side, z, rotation);
  add(`${id}-mullion`, "facade", "demo-window-divider", "timber", x, y, z, rotation);
}

// A quiet limestone plinth frames the finer, irregular courtyard paving.
for (let row = 0; row < 6; row += 1) {
  for (let column = 0; column < 7; column += 1)
    add(
      `base-${row}-${column}`,
      "base",
      "demo-plate-4x4",
      "sand",
      -11.5 + column * 4,
      0.2,
      -10 + row * 4,
    );
}
for (let row = 0; row < 11; row += 1) {
  for (let column = 0; column < 13; column += 1) {
    const x = column * 2 - 12;
    const z = row * 2 - 10;
    if (x > -10 && x < 10 && z > -4 && z < 8) continue;
    add(
      `edge-paving-${row}-${column}`,
      "courtyard",
      "demo-tile-2x2",
      (row + column) % 7 === 0 ? "paving-gray" : "limestone",
      x + 0.5,
      0.6,
      z,
    );
  }
}
for (let row = 0; row < 10; row += 1) {
  for (let column = 0; column < 18; column += 1) {
    const color = ["ivory", "limestone", "ivory", "paving-gray", "sand", "ivory", "limestone"][
      (row * 7 + column * 3 + Math.floor(column / 4)) % 7
    ];
    add(
      `paving-${row}-${column}`,
      "courtyard",
      "demo-tile-1x1",
      color,
      -8 + column,
      0.6,
      -2.5 + row,
    );
  }
}

// A narrow paved planting strip supports the pots beside the outer stair wall.
for (let row = 0; row < 6; row += 1)
  add(`garden-base-${row}`, "base", "demo-plate-2x4", "sand", 15.5, 0.2, -10 + row * 4, 90);
for (let row = 0; row < 12; row += 1)
  add(`garden-paving-${row}`, "courtyard", "demo-tile-2x2", "limestone", 15.5, 0.6, -11 + row * 2);

const entranceStart = instances.length;
// Four full-height brick courses enclose the courtyard, with a genuinely open barred gate.
wall("front", "x", 8.5, -10.5, 10.5, 4, [
  { from: -2.5, to: 2.5, first: 0, last: 3 },
  { from: -7.5, to: -5.5, first: 1, last: 2 },
  { from: 5.5, to: 7.5, first: 1, last: 2 },
]);
add("entry-arch", "facade", "demo-gate-arch", "limestone", 0, 3.2, 8.5);
add("entry-gate", "facade", "demo-gate-frame", "teal", 0, 2.7, 8.5);
for (const x of [-1, -0.5, 0, 0.5, 1])
  add(
    `gate-board-${x}`,
    "facade",
    Math.abs(x) === 1 ? "demo-gate-bar-outer" : "demo-gate-bar-tall",
    "teal",
    x,
    Math.abs(x) === 1 ? 2.5 : 2.7,
    8.5,
  );
for (const y of [1, 2.8]) add(`gate-rail-${y}`, "facade", "demo-gate-rail", "teal", 0, y, 8.5);
for (const x of [-0.5, 0.5])
  add(`gate-handle-${x}`, "facade", "demo-detail-1x1", "ochre", x, 2.9, 8.7);
windowFrame("front-window-west", -6.5, 3.2, 8.5);
windowFrame("front-window-east", 6.5, 3.2, 8.5);
for (let column = 0; column < 10; column += 1)
  add(
    `front-coping-${column}`,
    "facade",
    "demo-plate-1x2",
    "limestone",
    -9.5 + column * 2,
    5.8,
    8.5,
  );
add("front-coping-end", "facade", "demo-plate-1x1", "limestone", 10, 5.8, 8.5);
for (const x of [-3.5, 3.5]) {
  add(`gate-lantern-bracket-${x}`, "facade", "demo-lantern-arm", "graphite", x, 3.6, 9.5);
  add(`gate-lantern-${x}`, "facade", "demo-lantern", "ochre", x, 3.2, 9.5);
}

recordModule("entrance", entranceStart);

// A smaller enclosed rear room replaces the unsupported pavilion. Its tiled roof lifts as one group.
wall("west", "z", -10, -9, 8, 3);
wall("rear-garden", "x", -9.5, -10.5, -5.5, 3);
wall("east", "z", 10, -3, 8, 2);
for (let row = 0; row < 8; row += 1)
  add(`west-coping-${row}`, "facade", "demo-plate-1x2", "limestone", -10, 4.6, -8 + row * 2, 90);
add("west-coping-end", "facade", "demo-plate-1x1", "limestone", -10, 4.6, 7.5);
for (let row = 0; row < 5; row += 1)
  add(`east-coping-${row}`, "facade", "demo-plate-1x2", "limestone", 10, 3.4, -2 + row * 2, 90);
add("east-coping-end", "facade", "demo-plate-1x1", "limestone", 10, 3.4, 7.5);
wall("room-front", "x", -3.5, -5.5, 4.5, 6, [{ from: -2.5, to: 2.5, first: 0, last: 3 }]);
wall("room-back", "x", -9.5, -5.5, 4.5, 6);
wall("room-west", "z", -5, -9, -4, 6, [{ from: -8, to: -6, first: 2, last: 3 }]);
wall("room-east", "z", 4, -9, -4, 6);
add("room-door-arch", "facade", "demo-gate-arch", "limestone", 0, 3.2, -3.5);
add("room-door", "facade", "demo-arched-gate", "teal", 0, 2.7, -3.5);
windowFrame("room-side-window", -5, 4.4, -7, 90);
for (const z of [-9.5, -3.5])
  for (let column = 0; column < 5; column += 1)
    add(
      `room-cornice-${z}-${column}`,
      "facade",
      "demo-plate-1x2",
      "limestone",
      -4.5 + column * 2,
      8.2,
      z,
    );

// The tower's door opens directly onto the supported stair landing.
wall("tower-front", "x", -3.5, 4.5, 10.5, 8, [{ from: 6.5, to: 8.5, first: 5, last: 6 }]);
wall("tower-back", "x", -9.5, 4.5, 10.5, 8);
wall("tower-west", "z", 5, -9, -4, 8);
wall("tower-east", "z", 10, -9, -4, 8, [{ from: -6, to: -4, first: 5, last: 6 }]);
windowFrame("tower-window", 7.5, 8, -3.5);
add("tower-landing-door", "facade", "demo-door-leaf", "teal", 10, 8.2, -5, 90);
add("tower-door-handle", "facade", "demo-detail-1x1", "ochre", 10.2, 7.8, -4.5);
for (const z of [-9.5, -3.5])
  for (let column = 0; column < 3; column += 1)
    add(
      `tower-cornice-${z}-${column}`,
      "facade",
      "demo-plate-1x2",
      "limestone",
      5.5 + column * 2,
      10.6,
      z,
    );

// Complete the side cornices so the roof beds bear on the entire masonry perimeter.
for (const [name, x, y] of [
  ["room-west", -5, 8.2],
  ["room-east", 4, 8.2],
  ["tower-west", 5, 10.6],
  ["tower-east", 10, 10.6],
] as const) {
  for (const z of [-8, -6])
    add(`${name}-cornice-${z}`, "facade", "demo-plate-1x2", "limestone", x, y, z, 90);
  add(`${name}-cornice-end`, "facade", "demo-plate-1x1", "limestone", x, y, -4.5);
}

// Sloped timber beds support the curved coppi. Ridge caps meet their high ends without crossing them.
for (const [prefix, startX, columns, roofY] of [
  ["", -4.5, 5, 9],
  ["tower-", 5.5, 3, 11.4],
] as const) {
  const roofStart = instances.length;
  for (let column = 0; column < columns; column += 1) {
    for (const side of [-1, 1])
      add(
        `${prefix}roof-bed-${column}-${side}`,
        "roof",
        "demo-roof-bed",
        "timber",
        startX + column * 2,
        roofY,
        -6 + side * 2,
        side < 0 ? 180 : 0,
      );
    add(
      `${prefix}ridge-${column}`,
      "roof",
      "demo-roof-ridge",
      "terracotta",
      startX + column * 2,
      roofY + 0.8,
      -6,
    );
  }
  for (let column = 0; column < columns * 2; column += 1)
    for (let row = 0; row < 4; row += 1)
      add(
        `${prefix}roof-${column}-${row}`,
        "roof",
        "demo-roof-tile",
        "terracotta",
        startX - 0.5 + column,
        roofY + 0.1 + (row === 1 || row === 2 ? 0.3 : 0),
        [-9, -7.5, -4.5, -3][row],
        row < 2 ? 180 : 0,
      );
  recordModule(prefix ? "towerRoof" : "mainRoof", roofStart);
}
const chimneyStart = instances.length;
// The chimney is seated on the flat ridge cap; no roof tile passes through its body.
add("chimney-0", "roof", "demo-brick-1x1", "ivory", 8, 13, -6);
add("chimney-1", "roof", "demo-brick-1x1", "ivory", 8, 14.2, -6);
add("chimney-cap", "roof", "demo-plate-1x3", "limestone", 8, 15, -6);

recordModule("towerRoof", chimneyStart);
const stairsStart = instances.length;
// Studded treads rest on full masonry stacks; the outer parapet grows from the base.
for (let step = 0; step < 11; step += 1) {
  const top = 1.2 + step * 0.6;
  const z = 6.5 - step;
  // Custom risers and standard plates give each tread a supported six-tenths rise.
  const bodyHeight = top - 1.2;
  let filled = 0;
  let level = 0;
  while (filled + 1.2 <= bodyHeight + 0.01) {
    add(
      `stair-${step}-${level++}`,
      "courtyard",
      "demo-stair-riser",
      "limestone",
      11.5,
      1.2 + filled,
      z,
    );
    add(
      `stair-fill-${step}-${level}`,
      "courtyard",
      "demo-stair-block",
      "limestone",
      11.5,
      1.8 + filled,
      z,
    );
    filled += 1.2;
  }
  if (bodyHeight - filled > 0.01)
    add(`stair-half-${step}`, "courtyard", "demo-stair-half", "limestone", 11.5, 1.1 + filled, z);
  add(`stair-tread-${step}`, "courtyard", "demo-stair-block", "limestone", 11.5, top - 0.2, z);
  for (let level = 0; level < Math.ceil((top + 1.2 - 0.8) / 1.2); level += 1)
    add(
      `stair-parapet-${step}-${level}`,
      "facade",
      "demo-brick-1x1",
      "sand",
      13,
      1.4 + level * 1.2,
      z,
    );
}
for (const z of [-4.5, -5.5]) {
  for (let level = 0; level < 5; level += 1)
    add(
      `landing-support-${z}-${level}`,
      "courtyard",
      "demo-brick-1x2",
      "limestone",
      11.5,
      1.4 + level * 1.2,
      z,
    );
  add(`landing-${z}`, "courtyard", "demo-plate-1x2", "ivory", 11.5, 7, z);
}

recordModule("stairs", stairsStart);

for (const x of [-3.5, -0.5])
  for (const z of [-6.5, -5.5])
    add(`room-table-leg-${x}-${z}`, "courtyard", "demo-brick-1x1", "timber", x, 1.4, z);
add("room-table-top", "courtyard", "demo-tile-2x4", "timber", -2, 2.2, -6);
for (let level = 0; level < 2; level += 1)
  add(`room-cabinet-${level}`, "courtyard", "demo-brick-1x2", "timber", 2.5, 1.4 + level * 1.2, -8);
add("room-cabinet-top", "courtyard", "demo-tile-1x2", "timber", 2.5, 3.4, -8);
for (const x of [0, 3])
  add(`room-bench-leg-${x}`, "courtyard", "demo-brick-1x1", "timber", x, 1.4, -4.5);
add("room-bench-top", "courtyard", "demo-tile-1x4", "timber", 1.5, 2.2, -4.5);

// Wall courses and stair risers share X-integer/Z-half-integer stud centers with their support plates.
const definitions = new Map(partDefinitions.map((definition) => [definition.id, definition]));
const bearings = instances.flatMap((instance) => {
  const definition = definitions.get(instance.partId)!;
  if (Math.abs(instance.transform.y - definition.height / 2 - 0.8) > 0.01) return [];
  if (
    instance.groupId !== "facade" &&
    !instance.id.startsWith("stair-") &&
    !instance.id.startsWith("landing-")
  )
    return [];
  const turned = instance.transform.rotation % 180 !== 0;
  return [
    {
      x: instance.transform.x,
      z: instance.transform.z,
      width: turned ? definition.depth : definition.width,
      depth: turned ? definition.width : definition.depth,
    },
  ];
});
for (let index = 0; index < instances.length; index += 1) {
  const instance = instances[index];
  if (!instance.id.startsWith("edge-paving-")) continue;
  if (
    bearings.some(
      (bearing) =>
        Math.abs(instance.transform.x - bearing.x) < 1 + bearing.width / 2 - 0.01 &&
        Math.abs(instance.transform.z - bearing.z) < 1 + bearing.depth / 2 - 0.01,
    )
  )
    instances[index] = { ...instance, partId: "demo-plate-2x2" };
}

const decorativeStart = instances.length;
// The left pergola is a light timber structure, softened by climbing plants.
for (const x of [-8.5, -4.5]) {
  for (const z of [-0.5, 5.5])
    add(`pergola-post-${x}-${z}`, "courtyard", "demo-pergola-post", "timber", x, 2.2, z);
  for (const z of [0.5, 4.5])
    add(`pergola-beam-${x}-${z}`, "courtyard", "demo-beam-1x4", "timber", x, 4.1, z, 90);
}
for (let row = 0; row < 7; row += 1)
  add(`pergola-slat-${row}`, "courtyard", "demo-beam-1x4", "timber", -6.5, 4.4, -0.5 + row);
for (const x of [-8.5, -4.5]) {
  for (let level = 0; level < 6; level += 1)
    add(
      `pergola-vine-${x}-${level}`,
      "vegetation",
      "demo-leaf-small",
      level % 2 ? "olive" : "sage",
      x,
      1 + level * 0.6,
      5.5,
      level % 2 ? 90 : 0,
    );
}
for (let index = 0; index < 8; index += 1)
  add(
    `pergola-canopy-${index}`,
    "vegetation",
    "demo-leaf-sprig",
    index % 3 ? "olive" : "silver-leaf",
    -8 + (index % 4),
    4.5,
    2.5 + Math.floor(index / 4) * 2,
    index % 2 ? 90 : 0,
  );

// An olive tree is assembled from slender branches and many fine leaf sprigs.
add("tree-planter", "vegetation", "demo-stone-planter", "limestone", -0.5, 0.7, 2.5);
add("tree-trunk-low", "vegetation", "demo-olive-trunk", "timber", -0.5, 2.2, 2.5);
add("tree-trunk-high", "vegetation", "demo-tree-branch", "timber", -0.5, 4.9, 2.5, 90);
for (const [index, x, z, rotation] of [
  [0, 0, 2.5, 0],
  [1, -1, 2.5, 180],
  [2, -0.5, 2, 90],
  [3, -0.5, 3, 270],
] as const)
  add(`tree-fork-${index}`, "vegetation", "demo-olive-fork", "timber", x, 4.6, z, rotation);
add("tree-upper-trunk", "vegetation", "demo-tree-branch", "timber", -0.5, 7, 2.5);
for (const [index, x, z, rotation] of [
  [0, 0, 2.5, 0],
  [1, -1, 2.5, 180],
  [2, -0.5, 2, 90],
] as const)
  add(`tree-upper-fork-${index}`, "vegetation", "demo-olive-fork", "timber", x, 6.8, z, rotation);
for (let layer = 0; layer < 4; layer += 1) {
  for (let row = -2; row <= 2; row += 1) {
    for (let column = -2; column <= 2; column += 1) {
      const radius = layer === 3 ? 1 : layer === 1 ? 5 : 3;
      if (column * column + row * row > radius || (column === 2 && row === 0 && layer === 1))
        continue;
      const color = ["olive", "deep-leaf", "silver-leaf", "olive", "sage"][
        Math.abs(column + row * 2 + layer) % 5
      ];
      add(
        `olive-leaves-${layer}-${row}-${column}`,
        "vegetation",
        "demo-leaf-sprig",
        color,
        -0.5 + column,
        5.8 + layer * 0.7 + ((row + column) % 2 ? 0.2 : 0),
        2.5 + row,
        (((row + column + 8) % 4) * 90) as QuarterTurn,
      );
    }
  }
}

// Distribute the outer sprigs through a rounded crown instead of stacking flat foliage discs.
for (let index = 0; index < 30; index += 1) {
  const angle = index * 2.4;
  const latitude = 1 - (2 * (index + 0.5)) / 30;
  const radius = 2.3 * Math.sqrt(1 - latitude * latitude) * (index % 4 === 0 ? 0.8 : 1);
  add(
    `olive-clump-${index}`,
    "vegetation",
    index % 3 === 0 ? "demo-leaf-upright" : "demo-leaf-sprig",
    index % 4 === 0 ? "silver-leaf" : index % 3 === 0 ? "deep-leaf" : "olive",
    Math.round((-0.5 + Math.cos(angle) * radius) * 10) / 10,
    6.7 + latitude * 1.5,
    Math.round((2.5 + Math.sin(angle) * radius) * 10) / 10,
    ((index % 4) * 90) as QuarterTurn,
  );
}
for (let index = 0; index < 10; index += 1) {
  add(
    `pergola-extra-vine-${index}`,
    "vegetation",
    "demo-leaf-sprig",
    index % 2 ? "olive" : "deep-leaf",
    -8 + (index % 4),
    4.3 + (index % 3) * 0.2,
    1 + Math.floor(index / 4) * 1.5,
    ((index % 4) * 90) as QuarterTurn,
  );
}
const frontVinesStart = instances.length;
for (let index = 0; index < 10; index += 1) {
  add(
    `front-vine-clump-${index}`,
    "vegetation",
    "demo-leaf-upright",
    index % 3 ? "olive" : "silver-leaf",
    -9.5 + (index % 3) * 0.5,
    1.3 + index * 0.3,
    9,
    (index % 2 ? 180 : 0) as QuarterTurn,
  );
  if (index % 3 === 0)
    add(
      `front-flower-${index}`,
      "vegetation",
      "demo-detail-1x1",
      "white",
      -9 + (index % 2) * 0.5,
      1.5 + index * 0.3,
      9.1,
    );
}
recordModule("entrance", frontVinesStart);
for (const [index, x, y, z] of [
  [0, 11.5, 7.4, -5.5],
  [1, 8, 1, 5],
  [2, 6, 1, -1],
] as const) {
  add(`terrace-pot-${index}`, "vegetation", "demo-terracotta-pot", "terracotta", x, y, z);
  add(`terrace-pot-leaves-${index}`, "vegetation", "demo-leaf-sprig", "olive", x, y + 0.6, z);
}

const cornerVinesStart = instances.length;
for (let level = 0; level < 11; level += 1) {
  for (const side of [-1, 1])
    add(
      `corner-climber-${side}-${level}`,
      "vegetation",
      "demo-leaf-upright",
      level % 3 ? "olive" : "deep-leaf",
      side * (9 - (level % 3) * 0.5),
      1.2 + level * 0.35,
      9,
      (level % 2 ? 180 : 0) as QuarterTurn,
    );
  if (level % 3 === 0)
    add(
      `corner-blossom-${level}`,
      "vegetation",
      "demo-detail-1x1",
      "white",
      8.5,
      1.5 + level * 0.35,
      9.1,
    );
}
recordModule("entrance", cornerVinesStart);
for (const [index, z] of [
  [0, 6.5],
  [1, 3.5],
  [2, 0.5],
] as const) {
  add(`stair-garden-pot-${index}`, "vegetation", "demo-terracotta-pot", "terracotta", 15.5, 1, z);
  add(`stair-garden-stem-${index}`, "vegetation", "demo-cactus-stem", "olive", 15.5, 2.1, z);
  for (const side of [-1, 1])
    add(
      `stair-garden-arm-${index}-${side}`,
      "vegetation",
      "demo-cactus-arm",
      "olive",
      15.5 + side * 0.5,
      2.1,
      z,
      side < 0 ? 180 : 0,
    );
}

// Courtyard details remain individually counted original demo parts.
for (const [index, x, z] of [
  [0, -8, 6.5],
  [1, -4, 6.5],
  [2, 5.5, 6.5],
  [3, 7.5, -1.5],
  [4, 2.5, -1.5],
  [5, -8, -7],
] as const) {
  add(`planter-${index}`, "vegetation", "demo-terracotta-pot", "terracotta", x, 1, z);
  add(
    `planter-sprig-${index}`,
    "vegetation",
    "demo-leaf-sprig",
    index % 2 ? "silver-leaf" : "olive",
    x,
    1.6,
    z,
    index % 2 ? 90 : 0,
  );
  add(`planter-flower-${index}`, "vegetation", "demo-detail-1x1", "white", x, 1.8, z);
}
const gateVinesStart = instances.length;
for (let level = 0; level < 6; level += 1) {
  add(
    `gate-vine-${level}`,
    "vegetation",
    "demo-leaf-upright",
    level % 2 ? "olive" : "silver-leaf",
    -9.5 + (level % 2 ? 0.5 : 0),
    0.9 + level * 0.6,
    9,
    level % 2 ? 180 : 0,
  );
  if (level % 2)
    add(
      `gate-vine-flower-${level}`,
      "vegetation",
      "demo-detail-1x1",
      "white",
      -9,
      1 + level * 0.6,
      9,
    );
}
recordModule("entrance", gateVinesStart);
for (const x of [-8, -5])
  add(`bench-foot-${x}`, "courtyard", "demo-plate-1x1", "limestone", x, 0.6, 1);
add("bench-seat", "courtyard", "demo-tile-1x4", "timber", -6.5, 1, 1);
for (const z of [-5.5, -3.5]) add(`barrel-${z}`, "courtyard", "demo-barrel", "timber", -8, 1, z);

for (const instance of [...instances]) {
  if (instance.partId !== "demo-terracotta-pot") continue;
  const { x, y, z } = instance.transform;
  add(`${instance.id}-soil`, "vegetation", "demo-pot-soil", "timber", x, y + 0.1, z);
  if (!instance.id.startsWith("stair-garden-"))
    add(`${instance.id}-stem`, "vegetation", "demo-branch-short", "olive", x, y + 0.3, z);
}
add("tree-planter-soil", "vegetation", "demo-tree-soil", "timber", -0.5, 0.9, 2.5);

for (let index = decorativeStart; index < instances.length; index += 1) {
  const instance = instances[index];
  instances[index] = {
    ...instance,
    transform: { ...instance.transform, y: Math.round((instance.transform.y + 0.4) * 10) / 10 },
  };
}

export const model: Model = {
  id: "masseria",
  title: "The courtyard house",
  baselineRevision: "masseria-r4",
  revision: "masseria-r4",
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
  for (let row = 0; row < 4; row += 1)
    additions.push(
      part(
        `simple-roof-${column}-${row}`,
        "roof",
        "demo-tile-2x2",
        "terracotta",
        -4.5 + column * 2,
        8.6,
        -9 + row * 2,
      ),
    );
}
export const variant: SampleVariant = {
  id: "masseria-roof-simple",
  title: "A quieter roofline",
  description:
    "Replace the rear room's curved tiled roof with a 20-piece terracotta terrace. The tower and protected facade remain untouched.",
  baseRevision: model.baselineRevision,
  removeIds: instances
    .filter((instance) => instance.id.startsWith("roof-") || instance.id.startsWith("ridge-"))
    .map((instance) => instance.id),
  additions,
};
moduleParts.stairs.push(
  "terrace-pot-0",
  "terrace-pot-leaves-0",
  "terrace-pot-0-soil",
  "terrace-pot-0-stem",
);

export const fixture: SceneFixture = {
  model,
  variant,
  instructions: { ...instructionSample(model), revision: "masseria-instructions-r4" },
  assemblyView: assemblySample(model, [
    {
      id: "main-roof",
      name: "Main roof",
      description: "The roof beds, curved tiles and ridge remain one removable roof module.",
      partIds: [...moduleParts.mainRoof, ...additions.map((instance) => instance.id)],
      offset: { x: 0, y: 4, z: 0 },
      views: ["roof", "modules"],
    },
    {
      id: "tower-roof",
      name: "Tower roof and chimney",
      description: "The tower roof, chimney and cap move together.",
      partIds: moduleParts.towerRoof,
      offset: { x: 0, y: 3, z: 0 },
      views: ["modules"],
    },
    {
      id: "entrance",
      name: "Entrance facade",
      description: "The front wall, gate, windows, lanterns and climbing plants move together.",
      partIds: moduleParts.entrance,
      offset: { x: 0, y: 0, z: 4 },
      views: ["modules"],
    },
    {
      id: "stairs",
      name: "Exterior stairs and landing",
      description: "The tread stacks, outer parapet, landing and its planter remain together.",
      partIds: moduleParts.stairs,
      offset: { x: 6, y: 0, z: 0 },
      views: ["modules"],
    },
  ]),
};
export default fixture;
