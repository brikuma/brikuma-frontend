import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";

test.beforeAll(async ({ browser, browserName }) => {
  await mkdir("artifacts/editor", { recursive: true });
  await writeFile(
    `artifacts/editor/environment-${browserName}.json`,
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        browser: browserName,
        version: browser.version(),
        os: os.platform(),
        release: os.release(),
        arch: os.arch(),
        node: process.version,
        buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
        viewport: "1440x900 default; explicit reflow matrix in named test",
        reducedMotion: "reduce",
        hardwareDevices: "not tested",
      },
      null,
      2,
    ) + "\n",
  );
});

async function ready(page: Page) {
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 20000 });
}
async function openStudy(page: Page, study: string) {
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Local project files", exact: true });
  await dialog.getByRole("combobox", { name: "Study", exact: true }).selectOption(study);
  const discard = dialog.getByRole("checkbox", { name: "Discard current unsaved edits" });
  if (await discard.count()) await discard.check();
  await dialog.getByRole("button", { name: "Open study", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await ready(page);
}
async function add(page: Page, name = "Brick 2 × 4") {
  await page.getByRole("button", { name: `Add ${name}`, exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
}
const revision = (page: Page) => page.locator(".workbench-shell").getAttribute("data-revision");

test("EDT-001,011,016,017: first-time building uses real picking, explained connections and bounded cancel", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor/?project=blank");
  await ready(page);
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await page.getByRole("button", { name: "Fit model to view", exact: true }).click();
  await add(page);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("combobox", { name: "Choose a logical part" })).toHaveValue(
    "added-1",
  );
  await page.screenshot({ path: "artifacts/editor/selected-brick.png" });
  await page.getByRole("button", { name: "Add Plate 1 × 3", exact: true }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const candidates = page.getByRole("list", { name: "Connector candidates" }).getByRole("button");
  await expect(candidates.first()).toBeVisible();
  await candidates.filter({ hasText: "No supported conflict" }).first().click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await page.getByRole("button", { name: "Undo local edit" }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Redo local edit" }).click();
  const before = await revision(page);
  await page.getByRole("button", { name: "Add Brick 1 × 1", exact: true }).click();
  await page.keyboard.press("Escape");
  expect(await revision(page)).toBe(before);
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  expect(errors).toEqual([]);
});

test("EDT-021,022,027: typed preview coordinates and mode guards cannot silently mutate", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Free position", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Placement X", exact: true }).fill("2.5");
  await expect(page.getByRole("button", { name: "Place brick", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Update preview", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).toHaveValue(
    "2.5",
  );
  const before = await revision(page);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo local edit" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Apply position" })).toBeDisabled();
  await page.getByRole("region", { name: "Modeling workspace", exact: true }).focus();
  await page.keyboard.press("Control+z");
  expect(await revision(page)).toBe(before);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  expect(await revision(page)).toBe(before);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Undo local edit" }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
});

test("EDT-009,026,040: hidden obstacle diagnostics and focus preserve physical membership", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await openStudy(page, "placement-lab");
  await expect(page.getByRole("button", { name: "Show hidden parts (1)" })).toBeVisible();
  const before = await revision(page);
  await page.getByRole("button", { name: "Checks", exact: true }).click();
  await page.getByRole("button", { name: "Run supported checks" }).click();
  await page.screenshot({ path: "artifacts/editor/occupied-conflict.png" });
  await page.getByRole("button", { name: /Reveal lab-obstacle \/ lab-conflict/ }).click();
  await expect(page.getByText("Focus lens · 2 pieces")).toBeVisible();
  await page.screenshot({ path: "artifacts/editor/interior-focus.png" });
  expect(await revision(page)).toBe(before);
  await page.getByRole("button", { name: "Restore view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show hidden parts (1)" })).toBeVisible();
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-count", "28");
});

test("EDT-023,041,042,045: protected facade, atomic roof experiment and stale plan", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await openStudy(page, "courtyard-study");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Select Facade", exact: true }).click();
  await expect(page.getByRole("button", { name: "Apply rigid translation" })).toBeDisabled();
  await page.getByRole("button", { name: "Select Rear roof", exact: true }).click();
  await page.getByRole("button", { name: "Changes · local experiment Open", exact: true }).click();
  const before = await revision(page);
  await page.getByRole("button", { name: "Preview local edit", exact: true }).click();
  expect(await revision(page)).toBe(before);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.getByRole("button", { name: "Current", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Proposed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-model-revision", before!);
  await page.getByRole("button", { name: "Proposed", exact: true }).click();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByRole("button", { name: "Build", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByText(
      "Choose Current or discard the local experiment before presenting the canonical model.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  expect(await revision(page)).toBe(before);
  await page.getByRole("button", { name: "Preview local edit", exact: true }).click();
  await page.getByRole("button", { name: "Current", exact: true }).click();
  await page.getByRole("button", { name: "Rotate selection 90°", exact: true }).click();
  await expect(page.getByText(/This proposal is stale/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept edit", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Recalculate proposal", exact: true }).click();
  await page.getByRole("button", { name: "Accept edit", exact: true }).click();
  await page.getByRole("button", { name: "Undo local edit" }).click();
  await page.getByRole("button", { name: "Undo local edit" }).click();
  expect(await revision(page)).toBe(before);
  await page
    .getByRole("button", { name: "Changes · local experiment Collapse", exact: true })
    .click();
  await page.getByText("Precision & inspection", { exact: true }).click();
  await page.getByRole("button", { name: "Open step preview", exact: true }).click();
  await expect(page.getByText(/Step 1 of/)).toBeVisible();
  await page.getByRole("button", { name: "Return to assembled Build", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open step preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exploded view", exact: true }).click();
  await page.screenshot({ path: "artifacts/editor/exploded.png" });
  expect(await revision(page)).toBe(before);
  await expect(page.getByRole("button", { name: "Apply rigid translation" })).toBeDisabled();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reassemble", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apply rigid translation" })).toBeEnabled();
});

test("EDT-046,048: actual PNG and local project round trip preserve canonical data", async ({
  page,
}) => {
  await mkdir("artifacts/editor", { recursive: true });
  await page.goto("/editor/?project=blank");
  await ready(page);
  await add(page);
  const before = await revision(page);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await page.screenshot({ path: "artifacts/editor/present.png" });
  await page.getByText("Export PNG", { exact: true }).click();
  const canvas = page.locator("canvas");
  const cameraBefore = await canvas.getAttribute("data-camera-position");
  const targetBefore = await canvas.getAttribute("data-camera-target");
  const pngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const png = await pngPromise;
  await png.saveAs("artifacts/editor/current-scene.png");
  const bytes = await readFile("artifacts/editor/current-scene.png");
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(1024);
  expect(bytes.readUInt32BE(20)).toBe(1024);
  expect(bytes.length).toBeGreaterThan(5000);
  expect(await revision(page)).toBe(before);
  await expect(canvas).toHaveAttribute("data-camera-position", cameraBefore!);
  await expect(canvas).toHaveAttribute("data-camera-target", targetBefore!);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project file" }).click();
  const download = await downloadPromise;
  await download.saveAs("artifacts/editor/roundtrip.brikuma.json");
  await page
    .getByLabel("Load project file", { exact: true })
    .setInputFiles("artifacts/editor/roundtrip.brikuma.json");
  await page.getByRole("button", { name: "Replace with file" }).click();
  expect(await revision(page)).toBe(before);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Add Brick 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Free position", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await expect(page.getByRole("combobox", { name: "Choose a logical part" })).toHaveValue(
    "added-2",
  );
});

test("EDT-015,028,035: Space-pan owns the pointer during placement and keeps the proposal", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  const canvas = page.locator("canvas");
  await canvas.focus();
  const before = await revision(page);
  const targetBefore = await canvas.getAttribute("data-camera-target");
  const box = (await canvas.boundingBox())!;
  await page.keyboard.down("Space");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect(canvas).not.toHaveAttribute("data-camera-target", targetBefore!);
  await expect(page.getByRole("button", { name: "Place brick", exact: true })).toBeVisible();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  expect(await revision(page)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Place brick", exact: true })).toHaveCount(0);
});

test("EDT-030,036: real rendering screenshot and reflow matrix", async ({ page }) => {
  test.setTimeout(90000);
  await mkdir("artifacts/editor", { recursive: true });
  await page.goto("/editor/?project=blank");
  await ready(page);
  await openStudy(page, "courtyard-study");
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
    [320, 568],
    [1280, 500],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator("canvas")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/editor/build-${width}x${height}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Parts & structure", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Parts & structure", exact: true })
    .getByRole("button", { name: "Structure", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/editor/touch-sheet.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Parts & structure", exact: true })).toBeFocused();
});

test("EDT-014,015,020,031: real openings, overlay isolation and context recovery", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await page.getByRole("button", { name: "Add Stone gate surround", exact: true }).click();
  await page.getByRole("button", { name: "Free position", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.getByRole("button", { name: "Front view", exact: true }).click();
  await page.getByRole("button", { name: "Fit selection", exact: true }).click();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("combobox", { name: "Choose a logical part" })).toHaveValue("");
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Add Brick 2 × 2", exact: true }).click();
  const before = await revision(page);
  await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Editor shortcuts" })
    .getByRole("button", { name: "Close dialog" })
    .click();
  expect(await revision(page)).toBe(before);
  const supportsLoss = await page.locator("canvas").evaluate((canvas) => {
    const extension = (canvas as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    if (extension) extension.loseContext();
    return Boolean(extension);
  });
  expect(supportsLoss).toBe(true);
  await expect(page.getByText(/WebGL is unavailable/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Pending brick placement" })).toHaveCount(0);
  await page.getByRole("button", { name: "Retry interactive 3D" }).click();
  await ready(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-part-count", "1");
  expect(await revision(page)).toBe(before);
});

test("EDT-047: an actual rendered PNG encoding failure restores the editor", async ({ page }) => {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await add(page);
  const before = await revision(page);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await page.getByText("Export PNG", { exact: true }).click();
  // Failure injection affects encoding once; WebGL rendering and readback remain real.
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      HTMLCanvasElement.prototype.toBlob = original;
      queueMicrotask(() => callback(null));
    };
  });
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  await expect(page.getByText("PNG encoding failed. The model is unchanged.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PNG", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Rotate 90°", exact: true }).click();
  expect(await revision(page)).not.toBe(before);
  await expect(page.locator("canvas")).toHaveAttribute("data-part-count", "1");
});
