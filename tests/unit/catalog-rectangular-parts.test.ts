import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createSession,
  findStudContacts,
  getPartConnections,
  hasSupportedDiagnosticGeometry,
  rotateVector,
  validatePlacement,
  worldStudSites,
  type Model,
  type QuarterTurn,
} from "../../src/core/model/public";
import { editPolicy, partDefinitions } from "../../src/fixtures/catalog";

const additions = [
  "demo-brick-1x3",
  "demo-brick-1x6",
  "demo-brick-1x8",
  "demo-brick-2x3",
  "demo-brick-2x6",
  "demo-brick-2x8",
  "demo-plate-1x4",
  "demo-plate-1x6",
  "demo-plate-1x8",
  "demo-plate-2x6",
  "demo-plate-2x8",
  "demo-plate-4x6",
  "demo-plate-4x8",
  "demo-plate-8x8",
  "demo-plate-16x16",
  "demo-tile-1x6",
  "demo-tile-1x8",
  "demo-tile-2x6",
];
const blank: Model = {
  id: "general-build",
  title: "General brick study",
  revision: "r1",
  baselineRevision: "r1",
  groups: [{ id: "assembly", name: "Assembly", protected: false }],
  instances: [],
};

describe("General rectangular catalog extensions", () => {
  it("preserves existing first-part selection and unique original demo identities", () => {
    expect(partDefinitions[0].id).toBe("demo-brick-2x4");
    expect(new Set(partDefinitions.map((part) => part.id)).size).toBe(partDefinitions.length);
    expect(additions.every((id) => partDefinitions.some((part) => part.id === id))).toBe(true);
  });

  it.each(additions)(
    "places %s on the ground and seats all underside receivers through quarter turns",
    (id) => {
      const part = partDefinitions.find((definition) => definition.id === id)!;
      const connections = getPartConnections(part);
      expect(hasSupportedDiagnosticGeometry(part)).toBe(true);
      expect(connections.receivers).toHaveLength(part.width * part.depth);
      expect(connections.studs).toHaveLength(part.studs ? part.width * part.depth : 0);
      for (const rotation of [0, 90, 180, 270] as QuarterTurn[]) {
        const ground = {
          ...rotateVector(
            { x: (part.width % 2) / 2, y: part.height / 2, z: (part.depth % 2) / 2 },
            rotation,
          ),
          rotation,
        };
        const initial = createSession(blank);
        const placed = applyCommand(
          initial,
          {
            type: "place",
            placement: "grid",
            baseRevision: blank.revision,
            instance: {
              id: "ground",
              partId: id,
              colorId: "blue",
              groupId: "assembly",
              transform: ground,
            },
          },
          editPolicy,
        );
        expect(placed.ok, placed.ok ? "" : placed.error.message).toBe(true);
        expect(initial.present.instances).toEqual([]);
        const supports: Model = {
          ...blank,
          instances: worldStudSites(connections.receivers, ground).map((site, index) => ({
            id: `support-${index}`,
            partId: "demo-brick-1x1",
            colorId: "yellow",
            groupId: "assembly",
            transform: { x: site.x, y: 0.6, z: site.z, rotation: 0 as const },
          })),
        };
        const mounted = { ...ground, y: Number((1.2 + part.height / 2).toFixed(2)) };
        expect(findStudContacts(supports, partDefinitions, part, mounted)).toHaveLength(
          part.width * part.depth,
        );
        expect(
          validatePlacement(supports, partDefinitions, part, mounted, "connect", editPolicy.bounds),
        ).toMatchObject({ ok: true });
        if (placed.ok && part.studs) {
          expect(
            validatePlacement(
              placed.value.present,
              partDefinitions,
              part,
              { ...ground, y: Number((part.height * 1.5).toFixed(2)) },
              "connect",
              editPolicy.bounds,
            ),
          ).toMatchObject({ ok: true });
        }
        if (placed.ok && !part.studs) {
          expect(
            validatePlacement(
              placed.value.present,
              partDefinitions,
              part,
              { ...ground, y: Number((part.height * 1.5).toFixed(2)) },
              "connect",
              editPolicy.bounds,
            ),
          ).toMatchObject({ ok: false, error: { code: "missing-connection" } });
        }
      }
    },
  );
});
