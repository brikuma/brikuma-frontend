import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import os from "node:os";
const output = "artifacts/editor-performance";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const report = {
  timestamp: new Date().toISOString(),
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  diffHash: createHash("sha256")
    .update(execFileSync("git", ["diff", "HEAD"]))
    .digest("hex"),
  buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  exportedEditorHtmlHash: createHash("sha256")
    .update(await readFile("out/editor/index.html"))
    .digest("hex"),
  environment: {
    browser: browser.version(),
    os: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    viewport: { width: 1440, height: 900 },
    dpr: 1,
    quality: "Auto / conservative",
    network: "loopback static export, no throttle",
    cpuThrottle: "none",
    cache: "fresh browser context then warm scene switches",
  },
  methodology:
    "Input-to-next-render-submission is a local latency proxy, not measured input-to-displayed pixels or field INP. Gesture wall times include Playwright automation and DOM observations, not human completion times. Frame intervals observe renderer frame counters; browser scheduling and software GPU apply. No participant results.",
  errors: [],
  network: [],
  scenes: [],
  resetCycles: [],
  manipulations: [],
};
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) report.errors.push(`HTTP ${response.status()}: ${response.url()}`);
});
page.on("request", (request) => {
  if (!request.url().startsWith("http://127.0.0.1:4173") && !/^(data|blob):/.test(request.url()))
    report.network.push(request.url());
});
await page.addInitScript(() => {
  window.editorMeasurement = {
    firstFrame: null,
    sceneReady: null,
    frames: [],
    latencies: [],
    start: null,
  };
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target instanceof HTMLCanvasElement)
        window.editorMeasurement.start = performance.now();
    },
    true,
  );
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.attributeName === "data-render-frames") {
        const now = performance.now(),
          data = window.editorMeasurement;
        data.firstFrame ??= now;
        data.frames.push(now);
        if (data.start !== null) {
          data.latencies.push(now - data.start);
          data.start = null;
        }
      }
      if (
        record.attributeName === "data-scene-ready" &&
        record.target.getAttribute("data-scene-ready") === "true"
      )
        window.editorMeasurement.sceneReady ??= performance.now();
    }
  });
  observer.observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-render-frames", "data-scene-ready"],
  });
});
async function ready() {
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas"),
      shell = document.querySelector(".workbench-shell");
    return (
      canvas?.dataset.modelRevision === shell?.getAttribute("data-revision") &&
      canvas?.dataset.partCount === shell?.getAttribute("data-count")
    );
  });
}
async function frames() {
  return page.locator("canvas").evaluate((canvas) => ({ ...canvas.dataset }));
}
async function selectedModelState() {
  const shell = page.locator(".workbench-shell");
  const values = await Promise.all(
    ["X", "Y", "Z"].map((axis) =>
      page.getByRole("spinbutton", { name: `Position ${axis}`, exact: true }).inputValue(),
    ),
  );
  return {
    revision: await shell.getAttribute("data-revision"),
    count: Number(await shell.getAttribute("data-count")),
    selectedId: await page
      .getByRole("combobox", { name: "Choose a logical part", exact: true })
      .inputValue(),
    position: values.map(Number),
  };
}
async function historyCount() {
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  const text = await page.getByText(/^\d+ undoable changes$/).textContent();
  await page.getByRole("button", { name: "Selection", exact: true }).click();
  return Number.parseInt(text, 10);
}
async function measureDragLifecycle() {
  await ready();
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await page.getByRole("button", { name: "Fit selection", exact: true }).click();
  await page.getByRole("button", { name: "Move tool", exact: true }).click();
  const canvas = page.locator("canvas"),
    box = await canvas.boundingBox();
  assert.ok(box, "A measured drag needs a visible canvas rectangle.");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const before = await selectedModelState(),
    historyBefore = await historyCount();
  let start = performance.now();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y + 15, { steps: 8 });
  const preview = await selectedModelState();
  assert.deepEqual(preview, before, "A live drag must not mutate the canonical model.");
  await canvas.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
  await page.mouse.up();
  await ready();
  const cancelledMs = performance.now() - start;
  const cancelled = await selectedModelState(),
    historyAfterCancel = await historyCount();
  assert.deepEqual(
    cancelled,
    before,
    "Pointer cancellation must restore the exact model and selection.",
  );
  assert.equal(historyAfterCancel, historyBefore, "Pointer cancellation cannot create history.");
  report.manipulations.push({
    operation: "drag-preview-cancel",
    durationMs: cancelledMs,
    before,
    preview,
    after: cancelled,
    historyBefore,
    historyAfter: historyAfterCancel,
  });
  start = performance.now();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y + 15, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(
    (revision) =>
      document.querySelector(".workbench-shell")?.getAttribute("data-revision") !== revision,
    before.revision,
  );
  await ready();
  const committedMs = performance.now() - start;
  const committed = await selectedModelState(),
    historyAfterCommit = await historyCount();
  assert.equal(committed.count, before.count, "Dragging cannot add or remove parts.");
  assert.equal(
    committed.selectedId,
    before.selectedId,
    "Dragging preserves the selected identity.",
  );
  assert.notDeepEqual(
    committed.position,
    before.position,
    "The measured completed drag must move the part.",
  );
  assert.equal(
    historyAfterCommit,
    historyBefore + 1,
    "A completed drag adds exactly one history transaction.",
  );
  report.manipulations.push({
    operation: "drag-commit",
    durationMs: committedMs,
    before,
    after: committed,
    historyBefore,
    historyAfter: historyAfterCommit,
  });
  start = performance.now();
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await ready();
  const undoneMs = performance.now() - start,
    undone = await selectedModelState();
  assert.deepEqual(undone, before, "One undo restores the complete measured drag state.");
  report.manipulations.push({
    operation: "undo-drag",
    durationMs: undoneMs,
    before: committed,
    after: undone,
    historyAfter: await historyCount(),
  });
  await page.getByRole("button", { name: "Select tool", exact: true }).click();
}
async function study(id) {
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Local project files", exact: true });
  await dialog.getByRole("combobox", { name: "Study", exact: true }).selectOption(id);
  const discard = dialog.getByRole("checkbox", { name: "Discard current unsaved edits" });
  if (await discard.count()) await discard.check();
  await dialog.getByRole("button", { name: "Open study", exact: true }).click();
  const revisionPrefix = id === "empty" ? "blank-r" : `${id}-`;
  await page.locator(`.workbench-shell[data-revision^="${revisionPrefix}"]`).waitFor();
  await dialog.waitFor({ state: "hidden" });
  await ready();
}
const distribution = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: sorted[Math.floor(sorted.length * 0.5)] ?? null,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? null,
    max: sorted.at(-1) ?? null,
  };
};
try {
  const start = performance.now();
  await page.goto("http://127.0.0.1:4173/editor/?project=blank");
  await page
    .getByRole("heading", { name: "Untitled exploration", exact: true, level: 1 })
    .waitFor();
  report.shellReadyMs = performance.now() - start;
  await ready();
  report.initial = await page.evaluate(() => ({
    measurement: window.editorMeasurement,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
  }));
  report.environment.gpu = await page.locator("canvas").evaluate((canvas) => {
    const gl = canvas.getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "not exposed";
  });
  const manipulation = performance.now();
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.locator('.workbench-shell[data-count="1"]').waitFor();
  report.firstManipulationMs = performance.now() - manipulation;
  await measureDragLifecycle();
  for (const id of ["courtyard-study", "stress-1000", "stress-5000"]) {
    const activation = performance.now();
    await study(id);
    const sceneReadyMs = performance.now() - activation;
    const canvas = page.locator("canvas"),
      box = await canvas.boundingBox();
    const beforeOrbit = await frames();
    await page.evaluate(() => {
      window.editorMeasurement.frames = [];
      window.editorMeasurement.latencies = [];
    });
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down({ button: "right" });
    for (let i = 0; i < 60; i++)
      await page.mouse.move(
        box.x + box.width * 0.5 + i * 2,
        box.y + box.height * 0.5 + Math.sin(i / 10) * 25,
      );
    await page.mouse.up({ button: "right" });
    const measured = await page.evaluate(() => window.editorMeasurement);
    const afterOrbit = await frames();
    assert.notEqual(
      afterOrbit.cameraQuaternion,
      beforeOrbit.cameraQuaternion,
      "Measured orbit must change the camera orientation.",
    );
    assert.equal(
      afterOrbit.modelRevision,
      beforeOrbit.modelRevision,
      "Camera orbit cannot change model revision.",
    );
    const intervals = measured.frames.slice(1).map((time, index) => time - measured.frames[index]);
    const beforePan = await frames();
    await page.evaluate(() => {
      window.editorMeasurement.frames = [];
      window.editorMeasurement.start = null;
    });
    const panStart = performance.now();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down({ button: "middle" });
    for (let i = 0; i < 40; i++)
      await page.mouse.move(box.x + box.width * 0.5 + i * 1.5, box.y + box.height * 0.5 + i * 0.5);
    await page.mouse.up({ button: "middle" });
    const panDurationMs = performance.now() - panStart;
    const panMeasured = await page.evaluate(() => window.editorMeasurement.frames);
    const panIntervals = panMeasured.slice(1).map((time, index) => time - panMeasured[index]);
    const afterPan = await frames();
    assert.notEqual(
      afterPan.cameraTarget,
      beforePan.cameraTarget,
      "Measured pan must change the camera target.",
    );
    assert.equal(
      afterPan.modelRevision,
      beforePan.modelRevision,
      "Camera pan cannot change model revision.",
    );
    assert.equal(afterPan.partCount, beforePan.partCount, "Camera pan cannot change part count.");
    await page.getByRole("button", { name: "Top view", exact: true }).click();
    await page.getByRole("button", { name: "Fit model to view", exact: true }).click();
    await page.evaluate(() => {
      window.editorMeasurement.latencies = [];
    });
    for (let i = 0; i < 30; i++)
      await page.mouse.click(
        box.x + box.width * (0.35 + (i % 6) * 0.05),
        box.y + box.height * (0.35 + Math.floor(i / 6) * 0.05),
      );
    const latency = await page.evaluate(() => window.editorMeasurement.latencies);
    const active = await frames();
    await page.waitForTimeout(1200);
    const idleBefore = await frames();
    await page.waitForTimeout(800);
    const idleAfter = await frames();
    const hash = createHash("sha256")
      .update(
        await readFile(
          id.startsWith("stress")
            ? "src/fixtures/editor/stress.ts"
            : "src/fixtures/editor/courtyard-study.ts",
        ),
      )
      .digest("hex");
    report.scenes.push({
      id,
      sourceHash: hash,
      sceneReadyMs,
      active,
      attemptedSelectionClicks: 30,
      renderFrameIntervalMs: distribution(intervals),
      orbit: {
        cameraQuaternionBefore: beforeOrbit.cameraQuaternion,
        cameraQuaternionAfter: afterOrbit.cameraQuaternion,
        modelRevisionBefore: beforeOrbit.modelRevision,
        modelRevisionAfter: afterOrbit.modelRevision,
      },
      pan: {
        durationMs: panDurationMs,
        renderFrameIntervalMs: distribution(panIntervals),
        modelRevisionBefore: beforePan.modelRevision,
        modelRevisionAfter: afterPan.modelRevision,
        partCountBefore: beforePan.partCount,
        partCountAfter: afterPan.partCount,
        cameraTargetBefore: beforePan.cameraTarget,
        cameraTargetAfter: afterPan.cameraTarget,
      },
      inputToNextRenderSubmissionMs: distribution(latency),
      idleFramesAdded: Number(idleAfter.renderFrames) - Number(idleBefore.renderFrames),
    });
    await page.screenshot({ path: `${output}/${id}.png` });
  }
  for (let i = 0; i < 20; i++) {
    await study(i % 2 === 0 ? "empty" : "courtyard-study");
    await page.waitForTimeout(80);
    report.resetCycles.push({ cycle: i + 1, ...(await frames()) });
  }
  const current = await frames();
  const other = await browser.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await page.waitForTimeout(700);
  report.hiddenTab = {
    actualHidden: await page.evaluate(() => document.hidden),
    framesBefore: current.renderFrames,
    framesAfter: (await frames()).renderFrames,
  };
  await other.close();
  await page.bringToFront();
  report.performanceEntries = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      duration: entry.duration,
    })),
  );
} catch (error) {
  report.errors.push(error.stack);
  process.exitCode = 1;
} finally {
  if (report.errors.length) process.exitCode = 1;
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
console.log(
  JSON.stringify(
    { scenes: report.scenes, resets: report.resetCycles.length, errors: report.errors },
    null,
    2,
  ),
);
