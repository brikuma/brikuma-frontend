import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
const origin = "http://127.0.0.1:4173";
const chrome =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(chrome))
  throw new Error(
    "Set CHROME_PATH to an already installed Chrome executable; no browser installation is automatic.",
  );
const response = await fetch(origin);
if (!response.ok) throw new Error("Production static preview must be running on port4173.");
mkdirSync("artifacts/lighthouse", { recursive: true });
const reports = [];
for (const [name, route] of [
  ["workspace", "/"],
  ["community", "/community/"],
]) {
  for (let run = 1; run <= 3; run += 1) {
    const output = `artifacts/lighthouse/${name}-${run}`;
    const args = [
      "node_modules/lighthouse/cli/index.js",
      `${origin}${route}`,
      "--preset=desktop",
      "--chrome-flags=--headless",
      "--output=json",
      "--output=html",
      `--output-path=${output}`,
      "--only-categories=performance,accessibility,best-practices",
      "--no-enable-error-reporting",
    ];
    console.log(`Lighthouse ${name} ${run}/3: desktop preset, simulated throttling.`);
    let log = "";
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        env: { ...process.env, CHROME_PATH: chrome },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => {
        log += chunk;
      });
      child.stderr.on("data", (chunk) => {
        log += chunk;
      });
      child.once("error", reject);
      child.once("exit", resolve);
    });
    writeFileSync(`${output}.log`, log);
    if (code !== 0) throw new Error(`Lighthouse failed with exit ${code}; inspect ${output}.log`);
    const report = JSON.parse(readFileSync(`${output}.report.json`, "utf8"));
    if (report.runtimeError) throw new Error(report.runtimeError.message);
    reports.push({
      name,
      run,
      report: `${output}.report.json`,
      html: `${output}.report.html`,
      fetchedAt: report.fetchTime,
      browser: report.environment.hostUserAgent,
      configuration: report.configSettings,
      performance: report.categories.performance.score,
      accessibility: report.categories.accessibility.score,
      bestPractices: report.categories["best-practices"].score,
      lcpMs: report.audits["largest-contentful-paint"].numericValue,
      cls: report.audits["cumulative-layout-shift"].numericValue,
      tbtMs: report.audits["total-blocking-time"].numericValue,
    });
  }
}
const median = (values) => [...values].sort((a, b) => a - b)[1];
const metrics = ["performance", "accessibility", "bestPractices", "lcpMs", "cls", "tbtMs"];
const medians = ["workspace", "community"].map((name) => ({
  name,
  ...Object.fromEntries(
    metrics.map((metric) => [
      metric,
      median(reports.filter((report) => report.name === name).map((report) => report[metric])),
    ]),
  ),
}));
const summary = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  chrome: path.resolve(chrome),
  method:
    "Three sequential uncached Lighthouse13.5 desktop-preset production runs per route; median of each metric. Local lab evidence, not field INP or scene-ready.",
  reports,
  medians,
};
writeFileSync("artifacts/lighthouse/summary.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(medians, null, 2));
if (medians.some((result) => result.performance < 0.95)) {
  console.error("Performance target95 was not met; retain metric reports and investigate.");
  process.exitCode = 1;
}
