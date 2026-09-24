import type { Model, PartInstance } from "../../core/model/public";
import type { SceneFixture } from "../scene-types";

/** Fixed seed 260924 determines colors; stable row/column/layer IDs determine identity. */
export function createStressFixture(count: 1000 | 5000): SceneFixture {
  const palette = ["limestone", "teal", "terracotta", "slate"];
  let seed = 260924;
  const instances: PartInstance[] = Array.from({ length: count }, (_, index) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const column = index % 50;
    const row = Math.floor(index / 50) % 50;
    const layer = Math.floor(index / 2500);
    return {
      id: `stress-${layer}-${row}-${column}`,
      partId: "demo-brick-1x1",
      colorId: palette[seed % palette.length],
      groupId: "workload",
      transform: { x: column - 24.5, y: layer * 1.2 + 0.6, z: row - 24.5, rotation: 0 },
    };
  });
  const model: Model = {
    id: `stress-${count}`,
    title: `${count.toLocaleString("en-US")} part diagnostic workload`,
    baselineRevision: `stress-${count}-seed260924-r1`,
    revision: `stress-${count}-seed260924-r1`,
    instances,
    groups: [{ id: "workload", name: "Deterministic workload", protected: false }],
  };
  return { model, variant: null, instructions: null };
}
