import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
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
    "src/fixtures/catalog.ts",
  ],
  { stdio: "inherit" },
);
const { partDefinitions, colors, editPolicy } = require(resolve(buildPath, "fixtures/catalog.js"));
const { applyCommand, createSession } = require(resolve(buildPath, "core/model/public.js"));
const output = resolve("public/assets/previews");
mkdirSync(output, { recursive: true });
const definitions = new Map(partDefinitions.map((part) => [part.id, part]));
const palette = new Map(colors.map((color) => [color.id, color.hex]));
const counts = {};
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
  const ordered = [...parts].sort(
    (a, b) =>
      a.transform.x +
      a.transform.z +
      a.transform.y * 1.7 -
      (b.transform.x + b.transform.z + b.transform.y * 1.7),
  );
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
    if (definition.shape === "cylinder") {
      const wheel = definition.id === "demo-wheel-2x2";
      const points = Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return wheel
          ? [0, Math.sin(a) * w, Math.cos(a) * d]
          : [Math.sin(a) * w, 0, Math.cos(a) * d];
      });
      const lower = points.map(([px, py, pz]) =>
        rotate(wheel ? [px - h, py, pz] : [px, py - h, pz]),
      );
      const upper = points.map(([px, py, pz]) =>
        rotate(wheel ? [px + h, py, pz] : [px, py + h, pz]),
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
      const upper = corners.map(([px, pz]) =>
        rotate([px, definition.shape === "slope" && pz > 0 ? -h + 0.06 : h, pz]),
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560" role="img" aria-label="${escape(model.title)}"><title>${escape(model.title)} — original BRIKUMA demo rendering</title><style>.p{stroke:#344248;stroke-opacity:.17;stroke-width:.55;stroke-linejoin:round}</style><defs><g id="stud"><ellipse cy="${number(scale * 0.04)}" rx="${number(scale * 0.29)}" ry="${number(scale * 0.17)}" fill="currentColor"/><ellipse cy="${number(scale * 0.04)}" rx="${number(scale * 0.29)}" ry="${number(scale * 0.17)}" fill="#000" opacity=".2"/><ellipse cy="${number(-scale * 0.04)}" rx="${number(scale * 0.29)}" ry="${number(scale * 0.16)}" fill="currentColor" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/></g><radialGradient id="bg"><stop stop-color="#FCFAF4"/><stop offset="1" stop-color="#E9E7DC"/></radialGradient><filter id="shadow" x="-.3" y="-.5" width="1.6" height="2"><feGaussianBlur stdDeviation="13"/></filter></defs><path fill="url(#bg)" d="M0 0H800V560H0Z"/><ellipse cx="405" cy="${number(offsetY + maxY * scale - 7)}" rx="${number((maxX - minX) * scale * 0.39)}" ry="30" fill="#344248" opacity=".14" filter="url(#shadow)"/>${shapes.join("")}</svg>\n`;
}

for (const id of ["masseria", "rover", "creature", "blank"]) {
  const fixture = require(resolve(buildPath, `fixtures/scenes/${id}.js`)).fixture;
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
console.log("Generated original scene previews and counts:", counts);
