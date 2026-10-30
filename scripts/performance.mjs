import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
function walk(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  });
}
const assets = walk("out");
const routes = [
  "/",
  "/new/",
  "/editor/",
  "/instructions/",
  "/inventory/",
  "/community/",
  "/marketplace/",
  "/plans/",
  "/design-system/",
];
const sum = (files) =>
  files.reduce((total, file) => total + gzipSync(readFileSync(file)).length, 0);
const failures = [];
const initialFiles = new Set();
const results = [];
for (const route of routes) {
  const html = readFileSync(path.join("out", route, "index.html"), "utf8");
  const scripts = [
    ...new Set(
      [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => path.join("out", match[1])),
    ),
  ];
  const styles = [
    ...new Set(
      [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"?]*)[^\"]*"/g)].map((match) =>
        path.join("out", match[1]),
      ),
    ),
  ];
  scripts.forEach((file) => initialFiles.add(file));
  const javascript = sum(scripts);
  const css = sum(styles);
  const budget = route === "/editor/" ? 300 * 1024 : 250 * 1024;
  if (javascript > budget)
    failures.push(
      `${route} JavaScript ${(javascript / 1024).toFixed(1)}KiB exceeds ${budget / 1024}KiB`,
    );
  if (css > 50 * 1024) failures.push(`${route} CSS exceeds 50KiB`);
  results.push({
    route,
    initialJavascriptGzipBytes: javascript,
    initialCssGzipBytes: css,
    scriptFiles: scripts,
    cssFiles: styles,
    javascriptBudgetBytes: budget,
  });
}
const remaining = assets.filter((file) => file.endsWith(".js") && !initialFiles.has(file));
const lazyUpperBound = sum(remaining);
if (lazyUpperBound > 900 * 1024)
  failures.push(
    "All noninitial JS chunks together exceed the lazy 3D budget; isolate measured renderer transfer before any exception.",
  );
const previews = assets.filter((file) => file.includes("/assets/previews/"));
const fonts = assets.filter((file) => /\.(woff2?|ttf|otf)$/.test(file));
const downloadedFontBytes = fonts.reduce((total, file) => total + readFileSync(file).length, 0);
if (downloadedFontBytes > 120 * 1024) failures.push("Font assets exceed 120KiB.");
const report = {
  measuredAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  baseCommit: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  workingTree: spawnSync("git", ["status", "--short"], { encoding: "utf8" }).stdout.trim(),
  method:
    "Sum gzip sizes of unique initial script/style URLs in exported HTML. All remaining JS chunks form a conservative lazy-code upper bound, not measured network or scene-ready timing.",
  routes: results,
  lazyAllChunksGzipBytes: lazyUpperBound,
  lazyFiles: remaining,
  downloadedFontBytes,
  previews: previews.map((file) => {
    const content = readFileSync(file);
    return { file, bytes: content.length, gzipBytes: gzipSync(content).length };
  }),
  failures,
};
mkdirSync("artifacts/performance", { recursive: true });
writeFileSync("artifacts/performance/budgets.json", JSON.stringify(report, null, 2) + "\n");
for (const result of results)
  console.log(
    `${result.route}: JS ${(result.initialJavascriptGzipBytes / 1024).toFixed(1)} KiB; CSS ${(result.initialCssGzipBytes / 1024).toFixed(1)} KiB gzip`,
  );
console.log(
  `Noninitial JS upper bound: ${(lazyUpperBound / 1024).toFixed(1)} KiB gzip. Fonts: ${downloadedFontBytes} bytes.`,
);
failures.forEach((failure) => console.error(failure));
process.exitCode = failures.length ? 1 : 0;
