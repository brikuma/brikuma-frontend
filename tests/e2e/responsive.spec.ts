import counts from "../../src/fixtures/scene-counts.json";
import { chromium, expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("FE-019: responsive editor, reduced motion and screenshot matrix", async ({ page }) => {
  await mkdir("artifacts/screenshots", { recursive: true });
  const viewports = [
    [320, 568],
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1440, 900],
    [1536, 1024],
    [1920, 1080],
    [1280, 500],
    [2560, 1080],
  ];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/editor/?project=masseria&noWebgl=1");
    await expect(
      page.getByRole("heading", { name: "The courtyard house", exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/WebGL is unavailable/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/screenshots/editor-fallback-${width}x${height}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width < 1024) {
      await page.getByRole("button", { name: "Parts & structure", exact: true }).click();
      const dialog = page.getByRole("dialog", {
        name: "Parts & structure",
        exact: true,
      });
      await dialog.getByRole("button", { name: "Structure", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Select Roof" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Parts & structure", exact: true }),
      ).toBeFocused();
    }
  }
});

test("FE-004: actual renderer activation preserves accessible HTML selection", async ({ page }) => {
  const renderingErrors: string[] = [];
  page.on("pageerror", (error) => renderingErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|WebGL|shader/i.test(message.text()))
      renderingErrors.push(message.text());
  });
  await mkdir("artifacts/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor/?project=masseria");
  await expect(
    page.getByRole("heading", { name: "The courtyard house", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByText("Right drag orbit · middle drag pan · scroll zoom · click selects"),
  ).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({
    path: "artifacts/screenshots/editor-studio-1440x900.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const quality of ["standard", "low", "studio"]) {
    await page.getByRole("combobox", { name: "Render quality", exact: true }).selectOption(quality);
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Render quality", exact: true })).toHaveValue(
      quality,
    );
    await page.screenshot({
      path: `artifacts/screenshots/editor-quality-${quality}.png`,
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: "Show workspace grid", exact: true }).click();
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await page.getByRole("button", { name: "Show dimensions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show dimensions", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Show dimensions", exact: true }).click();
  await page.getByRole("button", { name: "Show workspace grid", exact: true }).click();
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Select Roof" }).click();
  await page.getByRole("combobox", { name: "Choose a logical part" }).selectOption("roof-0-0");
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Zoom in model" }).click();
  await page.getByRole("button", { name: "Reset camera" }).click();
  await page.screenshot({
    path: "artifacts/screenshots/editor-3d-1440x900.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Roof access", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Assembly separation" })).toHaveValue("100");
  await expect(page.getByRole("button", { name: "Show dimensions" })).toBeDisabled();
  await page.screenshot({ path: "artifacts/screenshots/editor-roof-access.png", fullPage: true });
  await page.getByRole("button", { name: "Focus canvas", exact: true }).click();
  await expect(page.locator("canvas")).toHaveJSProperty("clientWidth", 1440);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({ path: "artifacts/screenshots/editor-focus-roof.png", fullPage: true });
  await page.getByRole("button", { name: "Focus canvas", exact: true }).click();
  await page.getByRole("button", { name: "Exploded view", exact: true }).click();
  await expect(page.getByLabel("Assembly separation controls")).toContainText("Entrance facade");
  await page.getByRole("slider", { name: "Assembly separation" }).fill("100");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: "artifacts/screenshots/editor-assembly-modules.png",
    fullPage: true,
  });
  await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  await expect(page.getByRole("button", { name: "Undo local edit" })).toBeDisabled();
  await page.getByRole("button", { name: "Reassemble", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show dimensions" })).toBeEnabled();
  await page.locator("canvas").dispatchEvent("webglcontextlost");
  await expect(page.getByText(/WebGL is unavailable/)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
  expect(renderingErrors).toEqual([]);
});

test("FE-019: mobile starts as a deliberate viewer with accessible inspector", async ({ page }) => {
  await mkdir("artifacts/screenshots", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor/?project=masseria");
  await expect(page.getByRole("button", { name: "Activate interactive 3D" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText(/Precision placement is best on desktop/)).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/editor-mobile-390x844.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  const inspector = page.getByRole("dialog", { name: "Project inspector" });
  await inspector.getByRole("combobox", { name: "Choose a logical part" }).selectOption("roof-0-0");
  await expect(inspector.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Inspector", exact: true })).toBeFocused();
});

test("Studio: canvas dragging commits once and pointer cancellation leaves the model unchanged", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Front view", exact: true }).click();
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await expect(page.getByRole("button", { name: "Isometric view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Front view", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Right view", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.getByRole("button", { name: "Right view", exact: true }).click();
  await page.getByRole("button", { name: "Move tool", exact: true }).click();
  await expect(page.getByRole("button", { name: "Isometric view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Front view", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Right view", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await page.getByRole("button", { name: "Move tool", exact: true }).click();
  const canvas = page.locator("canvas");
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y + 15, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).not.toHaveValue(
    "0",
  );
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: "Position Z", exact: true })).toHaveValue("0");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y + 15, { steps: 8 });
  await canvas.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
  await page.mouse.up();
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: "Position Z", exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Redo local edit", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).not.toHaveValue(
    "0",
  );
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  const revision = await page.locator(".workbench-shell").getAttribute("data-revision");
  // EDT-018/019: capture survives leaving/re-entering; an unseen release cancels.
  await page.mouse.click(x, y);
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-revision", revision!);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(box.x - 12, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-revision", revision!);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(box.x - 12, y, { steps: 8 });
  await page.mouse.move(x + 65, y + 15, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).not.toHaveValue(
    "0",
  );
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-revision", revision!);
  // EDT-020: the native window interruption handler cancels an active real-pointer drag.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y + 15, { steps: 8 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-revision", revision!);
});

test("Studio: surface placement aligns a single brick to the support connectors", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await page.getByRole("button", { name: "Add Brick 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4);
  await expect(page.getByText("1 stud aligned · click to attach").first()).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/brick-connector-preview.png" });
  await page.mouse.click(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4);
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).toHaveValue(
    "0.5",
  );
  await expect(page.getByRole("spinbutton", { name: "Position Z", exact: true })).toHaveValue(
    "0.5",
  );
  await expect(page.getByRole("spinbutton", { name: "Position Y", exact: true })).toHaveValue(
    "1.8",
  );
  await page.getByRole("button", { name: "Isometric view", exact: true }).click();
  await page.screenshot({ path: "artifacts/screenshots/brick-surface-connection.png" });
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
});

test("Studio: brick inspection exposes the underside without changing the assembly", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.getByRole("button", { name: "Inspect selected brick", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect selected brick", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.screenshot({ path: "artifacts/screenshots/brick-inspection-top.png" });
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.35, { steps: 12 });
  await page.mouse.up({ button: "right" });
  await page.screenshot({ path: "artifacts/screenshots/brick-inspection-underside.png" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/screenshots/brick-inspection-mobile-320.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Exit brick inspection", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect selected brick", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-count]")).toHaveAttribute("data-count", "1");
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.locator("[data-count]")).toHaveAttribute("data-count", "0");
});

test("FE-019: narrow routes reflow without page-level horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of [
    "/",
    "/new/",
    "/inventory/?project=masseria",
    "/instructions/?project=masseria",
    "/community/",
    "/marketplace/",
    "/plans/",
    "/design-system/",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    if (path.startsWith("/inventory"))
      await expect(page.getByTestId("inventory-total")).toContainText(String(counts.masseria));
    if (path.startsWith("/instructions"))
      await expect(page.getByText("Step 1 of 5 · Baseline layout")).toBeVisible();
    const layout = await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= window.innerWidth + 1,
      offenders: Array.from(document.querySelectorAll("main *"))
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 12)
        .map((element) => ({
          tag: element.tagName,
          classes: element.getAttribute("class"),
          right: element.getBoundingClientRect().right,
        })),
    }));
    expect(layout.fits, `Page-level overflow at ${path}: ${JSON.stringify(layout.offenders)}`).toBe(
      true,
    );
  }
});

test("FE-019: a browser with WebGL disabled preserves the full fallback", async ({ baseURL }) => {
  const browser = await chromium.launch({
    channel: process.env.CI ? undefined : "chrome",
    args: ["--disable-webgl"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${baseURL}/editor/?project=masseria`);
    await expect(page.getByText(/WebGL is unavailable/)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "Retry interactive 3D" })).toBeVisible();
    await page.getByRole("button", { name: "Structure", exact: true }).click();
    await page.getByRole("button", { name: "Select Roof", exact: true }).click();
    await page.getByRole("combobox", { name: "Choose a logical part" }).selectOption("roof-0-0");
    await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
    await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  } finally {
    await browser.close();
  }
});
