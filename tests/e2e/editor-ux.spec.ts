import { openDetails as expand, openInspector as inspector } from "./editor-controls";
import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { partDefinitions } from "../../src/fixtures/catalog";

const artifactDirectory = "artifacts/editor-ux";
type BrowserErrors = { page: string[]; console: string[]; http: string[] };
const errorsByPage = new WeakMap<Page, BrowserErrors>();

test.beforeAll(async ({ browser, browserName }) => {
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(
    `${artifactDirectory}/environment-${browserName}.json`,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        browser: browserName,
        version: browser.version(),
        os: os.platform(),
        release: os.release(),
        arch: os.arch(),
        node: process.version,
        buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
        viewport: "1440x900; catalog reflow also checks 390x844, 768x1024 and 1280x500",
        reducedMotion: "reduce",
        realDevices: "not tested",
      },
      null,
      2,
    ) + "\n",
  );
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: BrowserErrors = { page: [], console: [], http: [] };
  errorsByPage.set(page, errors);
  page.on("pageerror", (error) => errors.page.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.console.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.http.push(`${response.status()} ${response.url()}`);
  });
});

test.afterEach(async ({ page, browserName }, testInfo) => {
  const errors = errorsByPage.get(page)!;
  const name = testInfo.title.split(":")[0].toLowerCase();
  await writeFile(
    `${artifactDirectory}/${name}-${browserName}-errors.json`,
    JSON.stringify({ test: testInfo.title, status: testInfo.status, errors }, null, 2) + "\n",
  );
  if (testInfo.status !== testInfo.expectedStatus)
    await page.screenshot({
      path: `${artifactDirectory}/${name}-${browserName}-failure.png`,
      fullPage: true,
    });
  expect(errors, "The real renderer must not produce browser, console or HTTP errors.").toEqual({
    page: [],
    console: [],
    http: [],
  });
});

const shell = (page: Page) => page.locator(".workbench-shell");
const revision = (page: Page) => shell(page).getAttribute("data-revision");

async function ready(page: Page) {
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 20000 });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-model-revision",
    (await revision(page))!,
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-part-count",
    (await shell(page).getAttribute("data-count"))!,
  );
}

async function openBlank(page: Page) {
  await page.goto("/editor/?project=blank");
  await ready(page);
  await expect(shell(page)).toHaveAttribute("data-count", "0");
}

async function addAt(page: Page, name: string, x?: number) {
  await page.getByRole("button", { name: `Add ${name}`, exact: true }).click();
  if (x !== undefined) {
    await expand(page, "Advanced placement");
    await page.getByRole("button", { name: "Grid", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Placement X", exact: true }).fill(String(x * 0.8));
    await page.getByRole("button", { name: "Update preview", exact: true }).click();
  }
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Pending brick placement", exact: true }),
  ).toHaveCount(0);
  await ready(page);
}

async function openStudy(page: Page, id: string) {
  await expand(page, "Project tools");
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Local project files", exact: true });
  await dialog.getByRole("combobox", { name: "Study", exact: true }).selectOption(id);
  await dialog.getByRole("button", { name: "Open study", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(shell(page)).toHaveAttribute("data-revision", new RegExp(`^${id}-`));
  await ready(page);
}

async function logicalIds(page: Page) {
  return page
    .getByRole("combobox", { name: "Choose a logical part", exact: true })
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
    );
}

test("UX-007: at 842px the model stays visible while building and repeat waits for a new position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 842, height: 781 });
  await page.goto("/editor/?project=blank");
  await expect(shell(page)).toHaveAttribute("data-count", "0");
  await page.getByRole("button", { name: "Parts & structure", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Parts and structure", exact: true });
  await panel.getByRole("button", { name: "Add Plate 4 × 4", exact: true }).click();
  await ready(page);
  const canvas = page.locator("canvas");
  const canvasBox = (await canvas.boundingBox())!;
  const panelBox = (await panel.boundingBox())!;
  expect(canvasBox.width).toBeGreaterThan(300);
  expect(canvasBox.height).toBeGreaterThan(200);
  expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await panel.getByRole("checkbox", { name: "Repeat placement", exact: true }).check();
  await panel.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-part-count", "1");
  const pending = panel.getByRole("region", { name: "Pending brick placement", exact: true });
  await expect(pending.getByText(/Placed. Choose the next position/)).toBeVisible();
  await expect(pending.getByRole("button", { name: "Place brick", exact: true })).toBeDisabled();
  await expect(pending.getByText(/This position overlaps another piece/)).toHaveCount(0);
  await expand(page, "Advanced placement");
  await pending.getByRole("button", { name: "Grid", exact: true }).click();
  await expand(page, "Advanced placement");
  await pending.getByRole("button", { name: "Free position", exact: true }).click();
  await expand(page, "Advanced placement");
  await pending.getByRole("button", { name: "Free position", exact: true }).click();
  await expect(pending.getByRole("button", { name: "Place brick", exact: true })).toBeDisabled();
  await pending.getByRole("spinbutton", { name: "Placement X", exact: true }).fill("3.2");
  await pending.getByRole("button", { name: "Update preview", exact: true }).click();
  await pending.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-part-count", "2");
  await panel.getByRole("button", { name: "Cancel placement", exact: true }).click();
  await panel.getByRole("button", { name: "Add Brick 1 × 2", exact: true }).click();
  await expand(page, "Advanced placement");
  await expect(panel.getByRole("button", { name: "Attach to model", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expand(page, "Choose a surface from the list");
  const candidates = panel.getByRole("list", { name: "Connector candidates" }).getByRole("button");
  await candidates.filter({ hasText: "Clear" }).first().click();
  await panel.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-part-count", "3");
  await page.screenshot({ path: `${artifactDirectory}/building-tray-842x781.png`, fullPage: true });
});

test("UX-008: free-position precision errors are visible before preview or Place", async ({
  page,
}) => {
  await openBlank(page);
  await page.getByRole("button", { name: "Add Tower door leaf", exact: true }).click();
  const pending = page.getByRole("region", { name: "Pending brick placement", exact: true });
  await expand(page, "Advanced placement");
  await expect(pending.getByRole("button", { name: "Free position", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const z = pending.getByRole("spinbutton", { name: "Placement Z", exact: true });
  await z.fill("2.12");
  await expect(z).toHaveAttribute("aria-invalid", "true");
  await expect(pending.getByText(/Use 0.08 cm steps left\/right/)).toBeVisible();
  await expect(pending.getByRole("button", { name: "Update preview", exact: true })).toBeDisabled();
  await expect(pending.getByRole("button", { name: "Place brick", exact: true })).toBeDisabled();
  await expect(shell(page)).toHaveAttribute("data-count", "0");
  await z.fill("1.68");
  await pending.getByRole("button", { name: "Update preview", exact: true }).click();
  await pending.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-count", "1");
  await expand(page, "Advanced position");
  await expect(page.getByRole("spinbutton", { name: "Position Z", exact: true })).toHaveValue(
    "1.68",
  );
});

test("UX-001: canvas R rotates only the placement preview and shortcuts respect input and dialog focus", async ({
  page,
  browserName,
}) => {
  await openBlank(page);
  const before = await revision(page);
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  const pending = page.getByRole("region", { name: "Pending brick placement", exact: true });
  const canvas = page.locator("canvas");
  await expect(pending.getByText("Turn: 0°", { exact: true })).toBeVisible();
  await canvas.focus();
  await expect(canvas).toBeFocused();
  await page.keyboard.press("r");
  await expect(pending.getByText("Turn: 90°", { exact: true })).toBeVisible();
  await expect(shell(page)).toHaveAttribute("data-interaction", "placing");
  await expect(shell(page)).toHaveAttribute("data-revision", before!);
  await expect(shell(page)).toHaveAttribute("data-count", "0");
  await page.screenshot({ path: `${artifactDirectory}/preview-rotation-${browserName}.png` });
  await page.keyboard.press("Escape");
  await expect(pending).toHaveCount(0);
  await expect(shell(page)).toHaveAttribute("data-revision", before!);
  await expect(page.getByRole("button", { name: "Undo local edit", exact: true })).toBeDisabled();

  await addAt(page, "Brick 2 × 4");
  const committed = await revision(page);
  const search = page.getByRole("textbox", { name: "Search part catalog", exact: true });
  await search.fill("brick");
  await search.press("r");
  await expect(search).toHaveValue("brickr");
  await search.press("ControlOrMeta+d");
  await expect(shell(page)).toHaveAttribute("data-revision", committed!);
  await expect(shell(page)).toHaveAttribute("data-count", "1");
  await expand(page, "Project tools");
  await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editor shortcuts", exact: true });
  await dialog.getByRole("button", { name: "Close dialog", exact: true }).focus();
  await page.keyboard.press("r");
  await page.keyboard.press("Delete");
  await page.keyboard.press("ControlOrMeta+d");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(shell(page)).toHaveAttribute("data-revision", committed!);
  await expect(shell(page)).toHaveAttribute("data-count", "1");
  await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByText("Rotation 0°", { exact: true })).toBeVisible();
});

test("UX-002: select-all and duplicate copy both selected IDs once, enter Move and undo atomically", async ({
  page,
}) => {
  await openBlank(page);
  await addAt(page, "Brick 2 × 2");
  await addAt(page, "Brick 1 × 1", 4.5);
  await expect(shell(page)).toHaveAttribute("data-count", "2");
  const before = await revision(page);
  const originals = await logicalIds(page);
  expect(originals).toHaveLength(2);
  await page.locator("canvas").focus();
  await page.keyboard.press("ControlOrMeta+a");
  await expect(page.getByRole("region", { name: "Selection summary", exact: true })).toContainText(
    "2 pieces",
  );
  await page.keyboard.press("ControlOrMeta+d");
  await expect(shell(page)).toHaveAttribute("data-count", "4");
  await expect(page.getByRole("button", { name: "Move tool", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const after = await revision(page);
  expect(after).not.toBe(before);
  const allIds = await logicalIds(page);
  const copies = allIds.filter((id) => !originals.includes(id));
  expect(new Set(allIds).size).toBe(4);
  expect(copies).toHaveLength(2);
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("textbox", { name: "Search model structure", exact: true }).fill("added");
  for (const id of originals)
    await expect(page.getByRole("button", { name: id, exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  for (const id of copies)
    await expect(page.getByRole("button", { name: id, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(page.getByText("3 undoable changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-count", "2");
  await expect(shell(page)).toHaveAttribute("data-revision", before!);
  await expect(page.getByText("2 undoable changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Selection", exact: true }).click();
  expect(await logicalIds(page)).toEqual(originals);
  await page.getByRole("button", { name: "Parts", exact: true }).click();
  const search = page.getByRole("textbox", { name: "Search part catalog", exact: true });
  await search.fill("plate");
  await search.press("ControlOrMeta+d");
  await expect(shell(page)).toHaveAttribute("data-revision", before!);
  await expect(shell(page)).toHaveAttribute("data-count", "2");
});

test("UX-003: diagnostic reveal selects the actual conflict and retains hidden state and stale checks", async ({
  page,
  browserName,
}) => {
  await openBlank(page);
  await openStudy(page, "placement-lab");
  const before = await revision(page);
  await expect(
    page.getByRole("button", { name: "Show hidden parts (1)", exact: true }),
  ).toBeVisible();
  await inspector(page);
  await page
    .getByRole("combobox", { name: "Choose a logical part", exact: true })
    .selectOption("lab-even-width");
  await expand(page, "View tools");
  await page.getByRole("button", { name: "Inspect selected brick", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-visible-part-count", "1");
  await inspector(page);
  await page.getByRole("button", { name: "Checks", exact: true }).click();
  await page.getByRole("button", { name: "Run supported checks", exact: true }).click();
  const diagnostics = page.getByRole("region", { name: "Geometric diagnostics", exact: true });
  const current = diagnostics.getByText(`Current · ${before}`, { exact: true });
  await expect(current).toBeVisible();
  const reveal = page.getByRole("button", {
    name: "Reveal lab-obstacle / lab-conflict",
    exact: true,
  });
  await reveal.click();
  await expect(
    page.getByText("Focus lens · 2 pieces · Canonical model unchanged", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-visible-part-count", "2");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("textbox", { name: "Search model structure", exact: true }).fill("lab-");
  for (const id of ["lab-obstacle", "lab-conflict"])
    await expect(page.getByRole("button", { name: id, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await expect(page.getByRole("region", { name: "Selection summary", exact: true })).toContainText(
    "2 pieces",
  );
  await expect(page.getByText("Project overview", { exact: true })).toHaveCount(0);
  await expect(shell(page)).toHaveAttribute("data-revision", before!);
  await expect(shell(page)).toHaveAttribute("data-count", "28");
  await page.screenshot({ path: `${artifactDirectory}/conflict-selection-${browserName}.png` });
  await page.getByRole("button", { name: "Restore view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show hidden parts (1)", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-visible-part-count", "27");
  await inspector(page);
  await page.getByRole("button", { name: "Checks", exact: true }).click();
  await expect(current).toBeVisible();
  await expect(page.getByRole("button", { name: "Recalculate checks", exact: true })).toBeVisible();
  await expand(page, "Project tools");
  await page
    .locator(".editor-project-tools")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Selection", exact: true }).click();
  await page.getByRole("combobox", { name: "Selection color", exact: true }).selectOption("teal");
  await expect(shell(page)).not.toHaveAttribute("data-revision", before!);
  await inspector(page);
  await page.getByRole("button", { name: "Checks", exact: true }).click();
  await expect(
    diagnostics.getByText(`Stale: model revision changed · ${before}`, { exact: true }),
  ).toBeVisible();
  await expect(reveal).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Show hidden parts (1)", exact: true }),
  ).toBeVisible();
});

test("UX-005: duplicating a child of a hidden parent reveals only the new copy and undoes once", async ({
  page,
  browserName,
}) => {
  await openBlank(page);
  const document = {
    format: "brikuma-scene",
    schemaVersion: 1,
    coordinates: "stud-y-up-quarter-turn-v1",
    model: {
      id: "ux-hidden-parent",
      title: "Original nested visibility study",
      baselineRevision: "ux-hidden-r1",
      revision: "ux-hidden-r1",
      groups: [
        { id: "hidden-parent", name: "Hidden parent", protected: false },
        { id: "nested-child", name: "Nested child", protected: false, parentId: "hidden-parent" },
      ],
      instances: [
        {
          id: "nested-source",
          partId: "demo-brick-2x2",
          colorId: "teal",
          groupId: "nested-child",
          transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
        },
        {
          id: "hidden-sibling",
          partId: "demo-brick-1x1",
          colorId: "terracotta",
          groupId: "hidden-parent",
          transform: { x: -4, y: 0.6, z: 0, rotation: 0 },
        },
      ],
    },
  };
  await expand(page, "Project tools");
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  await page.getByLabel("Load project file", { exact: true }).setInputFiles({
    name: "original-nested-visibility.brikuma.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.getByRole("dialog", { name: "Local project files", exact: true })).toHaveCount(
    0,
  );
  await expect(shell(page)).toHaveAttribute("data-revision", "ux-hidden-r1");
  await ready(page);
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Hide Hidden parent", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-visible-part-count", "0");
  await expect(
    page.getByRole("button", { name: "Show hidden parts (2)", exact: true }),
  ).toBeVisible();
  await inspector(page);
  await page
    .getByRole("combobox", { name: "Choose a logical part", exact: true })
    .selectOption("nested-source");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-count", "3");
  await expect(page.locator("canvas")).toHaveAttribute("data-visible-part-count", "1");
  await expect(
    page.getByRole("button", { name: "Show hidden parts (2)", exact: true }),
  ).toBeVisible();
  const copyId = await page
    .getByRole("combobox", { name: "Choose a logical part", exact: true })
    .inputValue();
  expect(copyId).not.toBe("nested-source");
  expect(copyId).not.toBe("hidden-sibling");
  expect(await logicalIds(page)).toEqual(["nested-source", "hidden-sibling", copyId]);
  await expect(page.getByRole("button", { name: "Move tool", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({ path: `${artifactDirectory}/nested-hidden-copy-${browserName}.png` });
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(shell(page)).toHaveAttribute("data-count", "2");
  await expect(shell(page)).toHaveAttribute("data-revision", "ux-hidden-r1");
  await expect(page.locator("canvas")).toHaveAttribute("data-visible-part-count", "0");
  await expect(
    page.getByRole("button", { name: "Show hidden parts (2)", exact: true }),
  ).toBeVisible();
  expect(await logicalIds(page)).toEqual(["nested-source", "hidden-sibling"]);
});

test("UX-004: original-ID search, favorites and committed recents survive responsive panel changes", async ({
  page,
  browserName,
}) => {
  test.setTimeout(60000);
  await openBlank(page);
  const search = page.getByRole("textbox", { name: "Search part catalog", exact: true });
  const query = " DEMO-BRICK-2X4 ";
  await search.fill(query);
  const add = page.getByRole("button", { name: "Add Brick 2 × 4", exact: true });
  await expect(add).toContainText("3.2 × 1.6 × 0.96 cm");
  await expect(page.getByText("ID: demo-brick-2x4", { exact: true })).toHaveCount(0);
  const favorite = page.getByRole("button", { name: "Favorite Brick 2 × 4", exact: true });
  await favorite.focus();
  await page.keyboard.press("Enter");
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expand(page, "More filters");
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await add.click();
  await page.locator("canvas").focus();
  await page.keyboard.press("Escape");
  await expand(page, "More filters");
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(add).toHaveCount(0);
  await expect(
    page.getByText("Recent fills after a part is placed, not when its preview opens.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(shell(page)).toHaveAttribute("data-count", "0");
  await expand(page, "More filters");
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await addAt(page, "Brick 2 × 4");
  await expand(page, "More filters");
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(add).toBeVisible();
  await expand(page, "More filters");
  await page.getByRole("checkbox", { name: "Currently used", exact: true }).check();
  await page.getByRole("combobox", { name: "Part category", exact: true }).selectOption("brick");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Parts", exact: true }).click();
  const before = await revision(page);
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator("canvas")).toBeVisible();
    if (width < 1024) {
      await page.getByRole("button", { name: "Parts & structure", exact: true }).click();
      // Fiber applies ResizeObserver measurements asynchronously after the panel opens.
      await expect
        .poll(async () => {
          const canvasBounds = (await page.locator("canvas").boundingBox())!;
          const panelBounds = (await page
            .getByRole("complementary", { name: "Parts and structure", exact: true })
            .boundingBox())!;
          return width < 768
            ? canvasBounds.y + canvasBounds.height - panelBounds.y
            : canvasBounds.x + canvasBounds.width - panelBounds.x;
        })
        .toBeLessThanOrEqual(1);
    }
    await expand(page, "More filters");
    await expect(search).toHaveValue(query);
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Recent", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("checkbox", { name: "Currently used", exact: true })).toBeChecked();
    await expect(page.getByRole("combobox", { name: "Part category", exact: true })).toHaveValue(
      "brick",
    );
    await expect(add).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: `${artifactDirectory}/catalog-${width}x${height}-${browserName}.png`,
      fullPage: true,
    });
    if (width < 1024)
      await page
        .getByRole("complementary", { name: "Parts and structure", exact: true })
        .getByRole("button", { name: "Close panel", exact: true })
        .click();
    await expect(shell(page)).toHaveAttribute("data-revision", before!);
    await expect(shell(page)).toHaveAttribute("data-count", "1");
  }
});

test("UX-006: a short desktop keeps the model bounded while the complete catalog scrolls independently", async ({
  page,
  browserName,
}) => {
  await openBlank(page);
  await addAt(page, "Brick 2 × 4");
  const before = await revision(page);
  await page.setViewportSize({ width: 1280, height: 500 });
  const catalog = page.getByRole("complementary", { name: "Parts and structure", exact: true });
  const canvas = page.locator("canvas");
  await expect(catalog.getByRole("button", { name: /^Add / })).toHaveCount(partDefinitions.length);
  const dimensions = await page.evaluate(() => {
    const grid = document.querySelector(".workbench-grid")!;
    const renderer = document.querySelector("canvas")!;
    return {
      grid: grid.getBoundingClientRect().height,
      canvas: renderer.getBoundingClientRect().height,
      page: document.documentElement.scrollHeight,
    };
  });
  expect(dimensions.grid).toBeLessThan(700);
  expect(dimensions.canvas).toBeGreaterThan(180);
  expect(dimensions.canvas).toBeLessThan(700);
  expect(dimensions.page).toBeLessThan(1400);
  await expect(canvas).toHaveAttribute("data-part-count", "1");
  await expect(canvas).toHaveAttribute("data-visible-part-count", "1");

  const lastFavorite = catalog.getByRole("button", {
    name: "Favorite Smooth tile 2 × 4",
    exact: true,
  });
  await lastFavorite.scrollIntoViewIfNeeded();
  await lastFavorite.click();
  await expect(lastFavorite).toHaveAttribute("aria-pressed", "true");
  const catalogScrollTop = await catalog.evaluate((panel) => panel.scrollTop);
  expect(catalogScrollTop).toBeGreaterThan(500);
  const search = catalog.getByRole("textbox", { name: "Search part catalog", exact: true });
  await search.fill("demo-tile-2x4");
  await expect(catalog.getByRole("button", { name: /^Add / })).toHaveCount(1);
  await expect(
    catalog.getByRole("button", { name: "Add Smooth tile 2 × 4", exact: true }),
  ).toBeVisible();
  await search.clear();
  await expect(catalog.getByRole("button", { name: /^Add / })).toHaveCount(partDefinitions.length);
  await page.getByRole("button", { name: "Fit model to view", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(shell(page)).toHaveAttribute("data-revision", before!);
  await expect(shell(page)).toHaveAttribute("data-count", "1");
  await writeFile(
    `${artifactDirectory}/short-desktop-${browserName}.json`,
    JSON.stringify({ viewport: "1280x500", ...dimensions, catalogScrollTop }, null, 2) + "\n",
  );
  await page.screenshot({
    path: `${artifactDirectory}/short-desktop-${browserName}.png`,
    fullPage: true,
  });
});
