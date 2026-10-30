import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { once } from "node:events";
import { createPreviewServer } from "./preview.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "brikuma-tooling-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, file, text) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
}
function run(root, script, preload) {
  const args = preload ? ["--import", path.join(root, preload)] : [];
  const result = spawnSync(process.execPath, [...args, path.join(scripts, script)], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
}

test("license validation and content use the same opened file after pathname replacement", (t) => {
  const root = fixture(t);
  write(
    root,
    "package-lock.json",
    JSON.stringify({ packages: { "node_modules/fixture": { version: "1.0.0", license: "MIT" } } }),
  );
  write(root, "node_modules/fixture/package.json", JSON.stringify({ name: "fixture" }));
  write(root, "node_modules/fixture/LICENSE", "Original license text.\n");
  mkdirSync(path.join(root, "public"));
  write(
    root,
    "swap.mjs",
    `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const target = 'node_modules/fixture/LICENSE';
    let replaced = false;
    for (const name of ['statSync', 'fstatSync']) {
      const original = fs[name];
      fs[name] = (...args) => {
        const result = original(...args);
        if (!replaced && (name === 'fstatSync' || args[0] === target)) {
          replaced = true;
          fs.renameSync(target, target + '.old');
          fs.writeFileSync(target, 'Replacement bytes must not be read.');
        }
        return result;
      };
    }
    syncBuiltinESMExports();
  `,
  );
  run(root, "licenses.mjs", "swap.mjs");
  const notices = readFileSync(path.join(root, "public/THIRD_PARTY_LICENSES.txt"), "utf8");
  assert.match(notices, /Original license text/);
  assert.doesNotMatch(notices, /Replacement bytes/);
});

test("performance reports raw and compressed sizes from the same preview bytes", (t) => {
  const root = fixture(t);
  for (const route of [
    "",
    "new",
    "editor",
    "instructions",
    "inventory",
    "community",
    "marketplace",
    "plans",
    "design-system",
  ])
    write(root, path.join("out", route, "index.html"), "<!doctype html><title>Fixture</title>");
  const original = "Original preview.";
  const replacement = "Replacement preview with different bytes.";
  write(root, "out/assets/previews/fixture.svg", original);
  write(
    root,
    "swap.mjs",
    `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const original = fs.statSync;
    fs.statSync = (...args) => {
      const result = original(...args);
      return new Proxy(result, {
        get(target, property) {
          const value = Reflect.get(target, property);
          if (property === 'size' && args[0] === 'out/assets/previews/fixture.svg')
            fs.writeFileSync(args[0], ${JSON.stringify(replacement)});
          return value;
        },
      });
    };
    syncBuiltinESMExports();
  `,
  );
  run(root, "performance.mjs", "swap.mjs");
  const report = JSON.parse(
    readFileSync(path.join(root, "artifacts/performance/budgets.json"), "utf8"),
  );
  assert.deepEqual(report.previews, [
    {
      file: "out/assets/previews/fixture.svg",
      bytes: Buffer.byteLength(original),
      gzipBytes: gzipSync(original).length,
    },
  ]);
});

test("preview routes serve a fixed export and never follow initial or later symlinks", async (t) => {
  const root = fixture(t);
  write(root, "out/index.html", "Home");
  write(root, "out/editor/index.html", "Editor");
  write(root, "out/about.html", "About");
  write(root, "out/asset.js", "export default 1;");
  write(root, "outside/index.html", "Outside private content");
  write(root, "outside/secret.txt", "Outside private content");
  symlinkSync(path.join(root, "outside/secret.txt"), path.join(root, "out/linked.txt"));
  symlinkSync(path.join(root, "outside"), path.join(root, "out/linked-directory"));
  const server = await createPreviewServer(path.join(root, "out"));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [route, expected] of [
    ["/", "Home"],
    ["/editor/", "Editor"],
    ["/editor", "Editor"],
    ["/about", "About"],
  ])
    assert.equal(await (await fetch(base + route)).text(), expected);
  const head = await fetch(base + "/asset.js", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), "text/javascript");
  assert.equal(head.headers.get("cache-control"), "no-store");
  assert.equal(head.headers.get("x-content-type-options"), "nosniff");
  assert.equal(await head.text(), "");
  for (const route of ["/missing", "/linked.txt", "/linked-directory/", "/%00", "/%E0%A4%A"])
    assert.equal((await fetch(base + route)).status, 404);
  assert.equal((await fetch(base + "/%2e%2e%2foutside/secret.txt")).status, 403);
  renameSync(path.join(root, "out/editor"), path.join(root, "out/editor-old"));
  symlinkSync(path.join(root, "outside"), path.join(root, "out/editor"));
  rmSync(path.join(root, "out/index.html"));
  symlinkSync(path.join(root, "outside/index.html"), path.join(root, "out/index.html"));
  assert.equal(await (await fetch(base + "/editor/")).text(), "Editor");
  assert.equal(await (await fetch(base + "/")).text(), "Home");
});
