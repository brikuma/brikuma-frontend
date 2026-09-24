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
      page.getByRole("heading", { name: "The courtyard house", exact: true }),
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
  await mkdir("artifacts/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor/?project=masseria");
  await expect(
    page.getByRole("heading", { name: "The courtyard house", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Drag to orbit · Scroll to zoom · Click a brick")).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Select Roof" }).click();
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Zoom in model" }).click();
  await page.getByRole("button", { name: "Reset camera" }).click();
  await page.screenshot({
    path: "artifacts/screenshots/editor-3d-1440x900.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.locator("canvas").dispatchEvent("webglcontextlost");
  await expect(page.getByText(/WebGL is unavailable/)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
});

test("FE-019: mobile starts as a deliberate viewer with accessible inspector", async ({ page }) => {
  await mkdir("artifacts/screenshots", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor/?project=masseria");
  await expect(page.getByRole("button", { name: "Activate interactive 3D" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText("Precision placement is best on desktop.")).toBeVisible();
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
      await expect(page.getByTestId("inventory-total")).toContainText("267");
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
    await page.getByRole("button", { name: "Select Roof", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
    await expect(page.getByTestId("piece-count")).toHaveText("267");
  } finally {
    await browser.close();
  }
});
