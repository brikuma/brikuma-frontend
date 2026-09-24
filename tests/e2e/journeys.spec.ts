import { openDetails, openInspector } from "./editor-controls";
import counts from "../../src/fixtures/scene-counts.json";
import { expect, test, type Page } from "@playwright/test";

const projectNav = (page: Page) => page.getByRole("navigation", { name: "Project navigation" });
async function navigateProject(page: Page, name: string) {
  if ((await projectNav(page).count()) === 0)
    await page.getByRole("button", { name: "Local project files", exact: true }).click();
  await projectNav(page).getByRole("link", { name, exact: true }).click();
}

test("FE-002: workspace categories, search, empty state and a direct sample route", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your workspace");
  await page.getByRole("button", { name: "Creatures", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open Moss & mischief" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Field rover" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search projects" }).fill("no such model");
  await expect(page.getByRole("heading", { name: "No projects match yet." })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("link", { name: "Open The courtyard house" }).click();
  await expect(page).toHaveURL(/editor\/\?project=masseria/);
  await expect(
    page.getByRole("heading", { name: "The courtyard house", exact: true, level: 1 }),
  ).toBeVisible();
});

test("FE-006 / EDT-042: protect facade, preview a roof color, accept and undo", async ({
  page,
}) => {
  await page.goto("/editor/?project=masseria&noWebgl=1");
  await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Select Facade", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Selection color", exact: true })).toBeDisabled();
  await expect(page.getByText("Protected scope: the entire edit is blocked.")).toBeVisible();
  await page.getByRole("button", { name: "Select Roof", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Selection color", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "More tools · experiments and sample changes" }).click();
  await page.getByRole("button", { name: "Preview local edit", exact: true }).click();
  await expect(
    page.getByText("Protection check: passed at preview.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  await page.getByRole("button", { name: "Accept edit", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Selection color", exact: true })).toHaveValue(
    "teal",
  );
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(page.getByText("1 undoable changes", { exact: true })).toBeVisible();
  await expect(page.getByText("masseria-local-1", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Undo local edit" }).click();
  await expect(page.getByText("masseria-r4", { exact: true }).first()).toBeVisible();
});

test("FE-005 / FE-008 / FE-013: a blank scene remains coherent across navigation", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank&noWebgl=1");
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("combobox", { name: "Part color", exact: true }).selectOption("teal");
  await openDetails(page, "Advanced position");
  await page.getByRole("button", { name: "Move x positive" }).click();
  await openDetails(page, "Advanced position");
  await expect(page.getByText("X 0.8 · Y 0.48 · Z 0 cm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove selected part" }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await page.getByRole("button", { name: "Undo local edit" }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await navigateProject(page, "Parts inventory");
  await expect(page.getByTestId("inventory-total")).toContainText("1");
  await expect(page.getByRole("cell", { name: "Deep teal", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search inventory" }).fill("absent-part");
  await expect(page.getByRole("heading", { name: "No parts match these filters." })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await navigateProject(page, "Workbench");
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await openInspector(page);
  await page.getByRole("combobox", { name: "Choose a logical part" }).selectOption("added-1");
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toHaveValue("teal");
  await openDetails(page, "Advanced position");
  await expect(page.getByText("X 0.8 · Y 0.48 · Z 0 cm", { exact: true })).toBeVisible();
});

test("FE-009: instruction navigation, real drawing zoom and stale revision", async ({ page }) => {
  await page.goto("/instructions/?project=masseria");
  await expect(page.getByText("Step 1 of 5 · Baseline layout")).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByText("Step 2 of 5 · Baseline layout")).toBeVisible();
  const picture = page.getByRole("img", { name: /Instruction step 2: Facade/ });
  const before = await picture.boundingBox();
  await page.getByRole("button", { name: "Zoom in instructions" }).click();
  await expect(page.getByText("125%", { exact: true })).toBeVisible();
  const after = await picture.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
  await navigateProject(page, "Workbench");
  await openInspector(page);
  await page.getByRole("combobox", { name: "Choose a logical part" }).selectOption("roof-bed-0--1");
  await openDetails(page, "Advanced position");
  await page.getByRole("button", { name: "Move x positive" }).click();
  await navigateProject(page, "Instructions");
  await expect(page.getByText(/Instruction sample belongs to the original revision/)).toBeVisible();
  await expect(page.getByText(/Instruction sample masseria-instructions-r4/)).toBeVisible();
});

test("Studio: precise placement, rotation and duplication remain reversible across routes", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank&noWebgl=1");
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await openDetails(page, "Advanced placement");
  await page.getByRole("spinbutton", { name: "Placement X", exact: true }).fill("2");
  await page.getByRole("button", { name: "Free position", exact: true }).click();
  await page.getByRole("button", { name: "Update preview", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await openDetails(page, "Advanced position");
  await page.getByRole("button", { name: "Rotate 90°", exact: true }).click();
  await expect(page.getByText("Rotation 90°", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).toHaveValue(
    "3.6",
  );
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Redo local edit", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await navigateProject(page, "Parts inventory");
  await expect(page.getByTestId("inventory-total")).toContainText("2");
  await navigateProject(page, "Workbench");
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await page.getByRole("button", { name: "Add Brick 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Cancel placement", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
});

test("EDT-042: a stale local experiment cannot overwrite a later edit", async ({ page }) => {
  await page.goto("/editor/?project=masseria&noWebgl=1");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Select Roof", exact: true }).click();
  await page.getByRole("button", { name: "More tools · experiments and sample changes" }).click();
  await page.getByRole("button", { name: "Preview local edit", exact: true }).click();
  await page.getByRole("button", { name: "Current", exact: true }).click();
  await page.getByRole("combobox", { name: "Selection color", exact: true }).selectOption("ochre");
  await expect(page.getByText("This proposal is stale.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept edit", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Selection color", exact: true })).toHaveValue(
    "ochre",
  );
});

test("FE-003: browser-local references reject unsupported input and show PDF metadata", async ({
  page,
}) => {
  await page.goto("/new/");
  const picker = page.getByLabel("Choose reference files");
  await picker.setInputFiles({
    name: "brief.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("example metadata only"),
  });
  await expect(page.getByText("PDF · filename only, not parsed")).toBeVisible();
  await picker.setInputFiles({
    name: "untrusted.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Other file types are not supported" }),
  ).toBeVisible();
  await expect(page.getByText("brief.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Remove brief.pdf" }).click();
  await expect(page.getByText("brief.pdf")).toHaveCount(0);
  await picker.setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: "tiny.png", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove tiny.png" }).click();
  await expect(page.getByRole("img", { name: "tiny.png", exact: true })).toHaveCount(0);
});

test("FE-001 / FE-019: static direct routes, unknown query and WebGL fallback", async ({
  page,
}) => {
  await page.goto("/editor/?project=unregistered&noWebgl=1");
  await expect(page.getByText("Unknown project. Showing the courtyard sample.")).toBeVisible();
  await expect(page.getByText(/WebGL is unavailable/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry interactive 3D" })).toBeVisible();
  await openInspector(page);
  await page.getByRole("combobox", { name: "Choose a logical part" }).selectOption("roof-bed-0--1");
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  await page.goto("/inventory/?project=rover");
  await expect(page.getByTestId("inventory-total")).toContainText(String(counts.rover));
  await page.reload();
  await expect(page.getByTestId("inventory-total")).toContainText(String(counts.rover));
});

test("FE-019: a missing static poster leaves an honest accessible fallback", async ({ page }) => {
  await page.route("**/assets/previews/*.svg", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByText("Preview unavailable. Model controls remain available.").first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start from scratch", exact: true })).toBeVisible();
});

test("FE-014 / FE-015 / FE-016: example review and digital listing remain truthful", async ({
  page,
}) => {
  await page.goto("/community/");
  await page.getByRole("button", { name: "View revision-specific review" }).click();
  const review = page.getByRole("dialog", { name: "The courtyard house" });
  await expect(review).toContainText("Anchored to masseria-r4");
  await review
    .getByRole("textbox", { name: "Unsent local comment draft" })
    .fill("Consider a lower terrace.");
  await expect(review).toContainText("No message is sent");
  await review.getByRole("link", { name: "Focus sample object" }).click();
  await expect(page.getByRole("combobox", { name: "Choose a logical part" })).toHaveValue(
    "roof-bed-0--1",
  );
  await page.goto("/marketplace/");
  await page.getByRole("button", { name: "View example" }).first().click();
  const listing = page.getByRole("dialog", { name: "The courtyard house" });
  await expect(listing).toContainText("Checkout and purchases are outside this POC");
  await expect(listing).toContainText(
    "No physical parts, payment, protected download or purchase is provided",
  );
  await expect(listing).toContainText(`${counts.masseria} logical pieces`);
  await expect(listing.getByRole("button", { name: /buy|pay|purchase/i })).toHaveCount(0);
  await listing.getByRole("link", { name: "View instruction example" }).click();
  await expect(page.getByText("Step 1 of 5 · Baseline layout")).toBeVisible();
});

test("FE-020: production journeys need only same-origin static requests", async ({
  page,
  baseURL,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["data:", "blob:"].includes(url.protocol) && url.origin !== new URL(baseURL!).origin)
      external.push(url.href);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/new/",
    "/community/",
    "/marketplace/",
    "/plans/",
    "/design-system/",
    "/inventory/?project=creature",
    "/instructions/?project=creature",
    "/editor/?project=creature&noWebgl=1",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
  }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
