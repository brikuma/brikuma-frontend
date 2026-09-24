import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const sceneModules = {
  masseria: "scenes/masseria",
  rover: "scenes/rover",
  creature: "scenes/creature",
  blank: "scenes/blank",
  "placement-lab": "editor/placement-lab",
  "courtyard-study": "editor/courtyard-study",
};
const requested = process.argv.slice(2);
const selectedIds = requested.length ? requested : Object.keys(sceneModules);
for (const id of selectedIds)
  if (!Object.hasOwn(sceneModules, id)) throw new Error(`Unknown preview fixture: ${id}`);
const buildPath = resolve("artifacts/fixture-build");
mkdirSync(buildPath, { recursive: true });
writeFileSync(resolve(buildPath, "package.json"), '{"type":"commonjs"}\n');
execFileSync(
  process.execPath,
  [
    require.resolve("typescript/bin/tsc"),
    "--target",
    "ES2022",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node",
    "--strict",
    "--skipLibCheck",
    "--outDir",
    buildPath,
    "src/fixtures/load-scene.ts",
    "src/fixtures/editor/index.ts",
    "src/fixtures/catalog.ts",
  ],
  { stdio: "inherit" },
);
const { partDefinitions, colors, editPolicy } = require(resolve(buildPath, "fixtures/catalog.js"));
const { applyCommand, createSession } = require(resolve(buildPath, "core/model/public.js"));
// Architectural and joinery parts share the viewer's original geometry, including hollow portals.
const typescript = require("typescript");
for (const name of ["brick-geometry", "architectural-geometry", "joinery-geometry"]) {
  const generated = typescript
    .transpileModule(readFileSync(`src/features/editor/scene/${name}.ts`, "utf8"), {
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.ESNext,
      },
    })
    .outputText.replaceAll('from "./brick-geometry"', 'from "./brick-geometry.mjs"');
  writeFileSync(resolve(buildPath, `${name}.mjs`), generated);
}
const { buildArchitecturalGeometry } = await import(
  pathToFileURL(resolve(buildPath, "architectural-geometry.mjs")).href
);
const { buildJoineryGeometry } = await import(
  pathToFileURL(resolve(buildPath, "joinery-geometry.mjs")).href
);
const architecturalGeometry = new Map(
  partDefinitions.map((definition) => [
    definition.id,
    buildJoineryGeometry(definition, false) ?? buildArchitecturalGeometry(definition, false),
  ]),
);
const output = resolve("public/assets/previews");
mkdirSync(output, { recursive: true });
const definitions = new Map(partDefinitions.map((part) => [part.id, part]));
const palette = new Map(colors.map((color) => [color.id, color.hex]));
const counts = JSON.parse(readFileSync("src/fixtures/scene-counts.json", "utf8"));
const number = (value) => Math.round(value * 10) / 10;
const project = ([x, y, z]) => [(x - z) * 0.866, (x + z) * 0.48 - y];
const shade = (color, factor) =>
  `#${color
    .slice(1)
    .match(/../g)
    .map((channel) =>
      Math.min(255, Math.round(parseInt(channel, 16) * factor))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
const escape = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

function render(model, parts) {
  const allBounds = model.instances.flatMap((instance) => {
    const part = definitions.get(instance.partId);
    return [
      [
        instance.transform.x - part.width / 2,
        instance.transform.y - part.height / 2,
        instance.transform.z - part.depth / 2,
      ],
      [
        instance.transform.x + part.width / 2,
        instance.transform.y + part.height / 2,
        instance.transform.z + part.depth / 2,
      ],
    ].map(project);
  });
  const minX = Math.min(-4, ...allBounds.map(([x]) => x));
  const maxX = Math.max(4, ...allBounds.map(([x]) => x));
  const minY = Math.min(-4, ...allBounds.map(([, y]) => y));
  const maxY = Math.max(4, ...allBounds.map(([, y]) => y));
  const scale = Math.min(720 / (maxX - minX + 4), 470 / (maxY - minY + 3));
  const offsetX = 400 - ((minX + maxX) / 2) * scale;
  const offsetY = 278 - ((minY + maxY) / 2) * scale;
  const screen = (point) => {
    const [x, y] = project(point);
    return `${number(x * scale + offsetX)},${number(y * scale + offsetY)}`;
  };
  const shapes = [];
  function polygon(points, color, stroke = true) {
    return `<path d="M${points.map(screen).join("L")}Z" fill="${color}"${stroke ? ' class="p"' : ""}/>`;
  }
  let ordered = [...parts].sort(
    (a, b) =>
      a.transform.x +
      a.transform.z +
      a.transform.y * 1.7 -
      (b.transform.x + b.transform.z + b.transform.y * 1.7),
  );
  if (parts.some((instance) => architecturalGeometry.get(instance.partId))) {
    // Preserve support-before-cover order when wide beams and fine tiles share a footprint.
    const bounds = ordered.map((instance) => {
      const definition = definitions.get(instance.partId);
      const turned = instance.transform.rotation % 180 !== 0;
      return {
        x: instance.transform.x,
        y: instance.transform.y,
        z: instance.transform.z,
        w: (turned ? definition.depth : definition.width) / 2,
        h: definition.height / 2,
        d: (turned ? definition.width : definition.depth) / 2,
        roofBed: definition.id === "demo-roof-bed",
        roofTile: definition.shape === "roof-tile",
        joinery: definition.id === "demo-pergola-post" || definition.id === "demo-beam-1x4",
      };
    });
    const edges = ordered.map(() => []);
    const pending = ordered.map(() => 0);
    for (let lower = 0; lower < bounds.length; lower += 1) {
      for (let upper = 0; upper < bounds.length; upper += 1) {
        const a = bounds[lower],
          b = bounds[upper];
        if (
          (a.y + a.h <= b.y - b.h + 0.015 ||
            (a.roofBed && b.roofTile && Math.abs(a.y - b.y) < 0.5) ||
            (a.joinery && b.joinery && a.y < b.y)) &&
          Math.abs(a.x - b.x) < a.w + b.w - 0.025 &&
          Math.abs(a.z - b.z) < a.d + b.d - 0.025
        ) {
          edges[lower].push(upper);
          pending[upper] += 1;
        }
      }
    }
    const queue = pending.flatMap((count, index) => (count === 0 ? [index] : []));
    const coveredOrder = [];
    while (queue.length) {
      queue.sort((a, b) => a - b);
      const index = queue.shift();
      coveredOrder.push(ordered[index]);
      for (const next of edges[index]) {
        pending[next] -= 1;
        if (pending[next] === 0) queue.push(next);
      }
    }
    if (coveredOrder.length !== ordered.length)
      throw new Error("Preview support ordering must be acyclic.");
    ordered = coveredOrder;
  }
  for (const instance of ordered) {
    const definition = definitions.get(instance.partId);
    const color = palette.get(instance.colorId);
    const { x, y, z, rotation } = instance.transform;
    const angle = (rotation * Math.PI) / 180;
    const rotate = ([px, py, pz]) => [
      x + px * Math.cos(angle) + pz * Math.sin(angle),
      y + py,
      z - px * Math.sin(angle) + pz * Math.cos(angle),
    ];
    const w = definition.width / 2 - 0.025;
    const h = definition.height / 2 - 0.015;
    const d = definition.depth / 2 - 0.025;
    const curvedGeometry = architecturalGeometry.get(definition.id);
    if (definition.shape === "leaf" || definition.shape === "leaf-upright") {
      const upright = definition.shape === "leaf-upright";
      const leafDepth = upright ? definition.height : definition.depth;
      const leafHeight = (upright ? definition.depth : definition.height) / 2;
      const leafPoint = ([px, py, pz]) => rotate(upright ? [px, -pz, py] : [px, py, pz]);
      // A seven-leaf silhouette keeps card assets light while retaining each logical sprig.
      for (let row = 0; row < 3; row += 1) {
        for (const side of [-1, 1]) {
          const dz = (row - 1) * leafDepth * 0.25;
          shapes.push(
            polygon(
              [
                leafPoint([0, 0, dz]),
                leafPoint([side * definition.width * 0.22, leafHeight * 0.3, dz - leafDepth * 0.2]),
                leafPoint([
                  side * definition.width * 0.48,
                  leafHeight * 0.45,
                  dz - leafDepth * 0.12,
                ]),
                leafPoint([side * definition.width * 0.23, 0, dz + leafDepth * 0.07]),
              ],
              shade(color, 0.83 + row * 0.07 + (side > 0 ? 0.08 : 0)),
              false,
            ),
          );
        }
      }
      shapes.push(
        polygon(
          [
            leafPoint([0, 0, leafDepth * 0.1]),
            leafPoint([-definition.width * 0.1, leafHeight, -leafDepth * 0.15]),
            leafPoint([0, leafHeight, -leafDepth * 0.49]),
            leafPoint([definition.width * 0.1, leafHeight, -leafDepth * 0.15]),
          ],
          shade(color, 1.03),
          false,
        ),
      );
    } else if (curvedGeometry) {
      const positions = curvedGeometry.getAttribute("position");
      const vertexColors = curvedGeometry.getAttribute("color");
      const index = curvedGeometry.index;
      const triangles = [];
      for (let offset = 0; offset < (index?.count ?? positions.count); offset += 3) {
        const indices = [0, 1, 2].map((corner) =>
          index ? index.getX(offset + corner) : offset + corner,
        );
        const points = indices.map((vertex) =>
          rotate([positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)]),
        );
        const a = points[1].map((value, axis) => value - points[0][axis]);
        const b = points[2].map((value, axis) => value - points[0][axis]);
        const normal = [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ];
        const magnitude = Math.hypot(...normal);
        if (!magnitude || normal[0] + normal[1] * 0.96 + normal[2] <= 0) continue;
        const light = Math.max(
          0,
          (-normal[0] * 0.5 + normal[1] * 0.82 + normal[2] * 0.46) / magnitude,
        );
        const tone = vertexColors
          ? indices.reduce((sum, vertex) => sum + vertexColors.getX(vertex), 0) / 3
          : 1;
        triangles.push({
          depth: points.reduce((sum, point) => sum + point[0] + point[1] * 0.96 + point[2], 0),
          path: polygon(points, shade(color, (0.72 + light * 0.34) * tone), false),
        });
      }
      triangles.sort((a, b) => a.depth - b.depth);
      shapes.push(...triangles.map((triangle) => triangle.path));
    } else if (definition.shape === "cylinder") {
      const wheel = definition.id === "demo-wheel-2x2";
      const points = Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return wheel
          ? [0, Math.sin(a) * h, Math.cos(a) * d]
          : [Math.sin(a) * w, 0, Math.cos(a) * d];
      });
      const lower = points.map(([px, py, pz]) =>
        rotate(wheel ? [px - w, py, pz] : [px, py - h, pz]),
      );
      const upper = points.map(([px, py, pz]) =>
        rotate(wheel ? [px + w, py, pz] : [px, py + h, pz]),
      );
      shapes.push(polygon(lower, shade(color, 0.78)));
      for (let i = 0; i < 16; i += 1) {
        const next = (i + 1) % 16;
        if (lower[i][0] + lower[i][2] + lower[next][0] + lower[next][2] >= 2 * (x + z))
          shapes.push(
            polygon([lower[i], lower[next], upper[next], upper[i]], shade(color, 0.8 + i / 90)),
          );
      }
      shapes.push(polygon(upper, shade(color, wheel ? 0.86 : 1.07)));
    } else {
      const corners = [
        [-w, -d],
        [w, -d],
        [w, d],
        [-w, d],
      ];
      const lower = corners.map(([px, pz]) => rotate([px, -h, pz]));
      const slopeToe =
        definition.id === "demo-roof-bed"
          ? 0.46
          : definition.id === "demo-slope-2x4" || definition.id === "demo-slope-1x2"
            ? 0.36
            : 0.06;
      const upper = corners.map(([px, pz]) =>
        rotate([px, definition.shape === "slope" && pz > 0 ? -h + slopeToe : h, pz]),
      );
      for (let side = 0; side < 4; side += 1) {
        const next = (side + 1) % 4;
        const normalX = (lower[side][0] + lower[next][0]) / 2 - x;
        const normalZ = (lower[side][2] + lower[next][2]) / 2 - z;
        if (normalX + normalZ > 0.01)
          shapes.push(
            polygon(
              [lower[side], lower[next], upper[next], upper[side]],
              shade(color, normalX > normalZ ? 0.81 : 0.93),
            ),
          );
      }
      shapes.push(polygon(upper, shade(color, 1.04)));
    }
    if (definition.studs) {
      for (let sx = 0; sx < definition.width; sx += 1) {
        for (let sz = 0; sz < definition.depth; sz += 1) {
          const location = rotate([
            sx - (definition.width - 1) / 2,
            h + 0.1,
            sz - (definition.depth - 1) / 2,
          ]);
          const covered = parts.some((other) => {
            if (other.id === instance.id) return false;
            const otherDef = definitions.get(other.partId);
            const otherWidth =
              other.transform.rotation % 180 === 0 ? otherDef.width : otherDef.depth;
            const otherDepth =
              other.transform.rotation % 180 === 0 ? otherDef.depth : otherDef.width;
            const otherBottom = other.transform.y - otherDef.height / 2;
            return (
              otherBottom >= location[1] - 0.2 &&
              otherBottom < location[1] + 0.3 &&
              Math.abs(other.transform.x - location[0]) < otherWidth / 2 &&
              Math.abs(other.transform.z - location[2]) < otherDepth / 2
            );
          });
          if (!covered) {
            const [cx, cy] = project(location);
            shapes.push(
              `<use href="#stud" x="${number(cx * scale + offsetX)}" y="${number(cy * scale + offsetY)}" color="${color}"/>`,
            );
          }
        }
      }
    }
  }
  if (parts.length === 0) {
    for (let line = -5; line <= 5; line += 1) {
      shapes.push(
        `<path d="M${screen([line, 0, -5])}L${screen([line, 0, 5])}M${screen([-5, 0, line])}L${screen([5, 0, line])}" stroke="#CBCFC5" stroke-width="1"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560" role="img" aria-label="${escape(model.title)}"><title>${escape(model.title)} — original BRIKUMA demo rendering</title><style>.p{stroke:#344248;stroke-opacity:.17;stroke-width:.55;stroke-linejoin:round}</style><defs><g id="stud"><ellipse cy="${number(scale * 0.1)}" rx="${number(scale * 0.3)}" ry="${number(scale * 0.17)}" fill="currentColor"/><ellipse cy="${number(scale * 0.1)}" rx="${number(scale * 0.3)}" ry="${number(scale * 0.17)}" fill="#000" opacity=".2"/><ellipse cy="${number(-scale * 0.1)}" rx="${number(scale * 0.3)}" ry="${number(scale * 0.16)}" fill="currentColor" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/></g><radialGradient id="bg"><stop stop-color="#FCFAF4"/><stop offset="1" stop-color="#E9E7DC"/></radialGradient><filter id="shadow" x="-.3" y="-.5" width="1.6" height="2"><feGaussianBlur stdDeviation="13"/></filter></defs><path fill="url(#bg)" d="M0 0H800V560H0Z"/><ellipse cx="405" cy="${number(offsetY + maxY * scale - 7)}" rx="${number((maxX - minX) * scale * 0.39)}" ry="30" fill="#344248" opacity=".14" filter="url(#shadow)"/>${shapes.join("")}</svg>\n`;
}

for (const id of selectedIds) {
  const fixture = require(resolve(buildPath, `fixtures/${sceneModules[id]}.js`)).fixture;
  counts[id] = fixture.model.instances.length;
  writeFileSync(resolve(output, `${id}.svg`), render(fixture.model, fixture.model.instances));
  if (fixture.variant) {
    const result = applyCommand(
      createSession(fixture.model),
      { type: "apply-variant", variant: fixture.variant },
      editPolicy,
    );
    if (!result.ok) throw new Error(result.error.message);
    writeFileSync(
      resolve(output, `${id}-variant.svg`),
      render(fixture.model, result.value.present.instances),
    );
  }
  for (const step of fixture.instructions?.steps ?? []) {
    const ids = new Set(step.visiblePartIds);
    writeFileSync(
      resolve(output, `${step.id}.svg`),
      render(
        fixture.model,
        fixture.model.instances.filter((part) => ids.has(part.id)),
      ),
    );
  }
}
writeFileSync(resolve("src/fixtures/scene-counts.json"), `${JSON.stringify(counts, null, 2)}\n`);
for (const geometry of architecturalGeometry.values()) geometry?.dispose();
console.log(
  "Generated original scene previews and counts:",
  Object.fromEntries(selectedIds.map((id) => [id, counts[id]])),
);
