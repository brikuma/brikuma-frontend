import { openDetails, openInspector } from "./editor-controls";
import { expect, test, type Page } from "@playwright/test";
import counts from "../../src/fixtures/scene-counts.json";
import { variant } from "../../src/fixtures/scenes/masseria";

const referenceImage = {
  name: "shelter-reference.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=",
    "base64",
  ),
};
const workbench = (page: Page) => page.locator(".workbench-shell");
const references = (page: Page) => page.getByRole("region", { name: "Local reference board" });
const briefSummary = (page: Page) => page.getByRole("region", { name: "Project brief summary" });

async function navigateProject(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Project navigation" })
    .getByRole("link", { name, exact: true })
    .click();
}

async function openReferences(page: Page) {
  await page.getByRole("button", { name: "References", exact: true }).click();
  await expect(references(page)).toBeVisible();
}

async function addFirstBrick(page: Page) {
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
}

test("Product continuity: brief, references and declared scale follow the editable model across pages", async ({
  page,
}) => {
  await page.goto("/new/?project=blank");
  await page.getByRole("textbox", { name: "Subject or intent" }).fill("A compact rover shelter");
  await page
    .getByRole("combobox", { name: "Visual language" })
    .selectOption("Industrial and precise");
  await page
    .getByRole("combobox", { name: "Construction approach" })
    .selectOption("Mechanical study (visual preview)");
  await page
    .getByRole("combobox", { name: "Technique", exact: true })
    .selectOption("My own technique (unverified)");
  await page.getByRole("spinbutton", { name: "Maximum pieces (brief only)" }).fill("150");
  await page.getByRole("textbox", { name: "Preferred colors" }).fill("Teal and graphite");
  await page.getByRole("radio", { name: "Play / exploration" }).check();
  await page.getByLabel("Choose reference files").setInputFiles([
    referenceImage,
    {
      name: "shelter-notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Local PDF metadata example; no parsing requested."),
    },
  ]);
  await expect(page.getByRole("img", { name: referenceImage.name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Return to workbench", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await page.getByRole("button", { name: /More tools · experiments/ }).click();
  await expect(page.getByRole("region", { name: "Assisted design preview" })).toContainText(
    "No pre-authored change is available for this model. AI is not connected.",
  );
  await addFirstBrick(page);
  const modelRevision = await workbench(page).getAttribute("data-revision");
  expect(modelRevision).toBeTruthy();

  await openReferences(page);
  await expect(briefSummary(page)).toContainText("A compact rover shelter");
  await expect(briefSummary(page)).toContainText("Industrial and precise");
  await expect(briefSummary(page)).toContainText("Mechanical study (visual preview)");
  await expect(briefSummary(page)).toContainText("My own technique (unverified)");
  await expect(briefSummary(page)).toContainText("Play / exploration");
  await expect(briefSummary(page)).toContainText("150");
  await expect(briefSummary(page)).toContainText("Teal and graphite");
  await references(page).getByRole("button", { name: referenceImage.name, exact: true }).click();
  await expect(
    references(page).getByRole("img", { name: `Pinned reference: ${referenceImage.name}` }),
  ).toBeVisible();
  await references(page).getByText("Manual reference scale", { exact: true }).click();
  await references(page).getByRole("textbox", { name: "Anchor B X (px)" }).fill("1");
  await references(page).getByRole("textbox", { name: "Known length (studs)" }).fill("2");
  await references(page).getByRole("combobox", { name: "Declared alignment" }).selectOption("XY");
  await references(page).getByRole("button", { name: "Declare scale", exact: true }).click();
  await expect(references(page).getByRole("status")).toContainText(
    "2.000 studs per pixel · XY alignment. User declaration only.",
  );
  await references(page).getByRole("button", { name: "shelter-notes.pdf", exact: true }).click();
  await expect(references(page)).toContainText("PDF · filename only, not parsed");
  await expect(references(page).getByRole("button", { name: "Declare scale" })).toHaveCount(0);
  await expect(workbench(page)).toHaveAttribute("data-revision", modelRevision!);
  await expect(workbench(page)).toHaveAttribute("data-count", "1");

  await navigateProject(page, "Parts inventory");
  await expect(page.getByTestId("inventory-total")).toContainText("1");
  await expect(page.getByRole("rowheader").filter({ hasText: "demo-brick-2x4" })).toBeVisible();
  await navigateProject(page, "Instructions");
  await page.getByRole("button", { name: "Generate instructions", exact: true }).click();
  await expect(page.getByText(/Local instruction draft · 1 piece/)).toBeVisible();
  await navigateProject(page, "Workbench");
  await expect(workbench(page)).toHaveAttribute("data-count", "1");
  await expect(workbench(page)).toHaveAttribute("data-revision", modelRevision!);
  await openReferences(page);
  await expect(briefSummary(page)).toContainText("A compact rover shelter");
  await references(page).getByRole("button", { name: referenceImage.name, exact: true }).click();
  await expect(references(page).getByRole("status")).toContainText(
    "2.000 studs per pixel · XY alignment. User declaration only.",
  );
  await expect(
    references(page).getByRole("button", { name: "shelter-notes.pdf", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/product-continuity-1440.png" });

  await navigateProject(page, "Project brief");
  await expect(page.getByRole("textbox", { name: "Subject or intent" })).toHaveValue(
    "A compact rover shelter",
  );
  await expect(page.getByRole("combobox", { name: "Visual language" })).toHaveValue(
    "Industrial and precise",
  );
  await expect(page.getByRole("combobox", { name: "Construction approach" })).toHaveValue(
    "Mechanical study (visual preview)",
  );
  await expect(page.getByRole("combobox", { name: "Technique", exact: true })).toHaveValue(
    "My own technique (unverified)",
  );
  await expect(page.getByRole("spinbutton", { name: "Maximum pieces (brief only)" })).toHaveValue(
    "150",
  );
  await expect(page.getByRole("textbox", { name: "Preferred colors" })).toHaveValue(
    "Teal and graphite",
  );
  await expect(page.getByRole("radio", { name: "Play / exploration" })).toBeChecked();
  await expect(page.getByRole("img", { name: referenceImage.name, exact: true })).toBeVisible();
  await expect(page.getByText("shelter-notes.pdf", { exact: true })).toBeVisible();
});

test("Product continuity: the assisted sample is reviewable, reversible and cannot overwrite a later edit", async ({
  page,
}) => {
  await page.goto("/new/");
  await page.getByRole("button", { name: "About assisted design", exact: true }).click();
  const introduction = page.getByRole("dialog", { name: "Assisted design, in the making" });
  await expect(introduction).toContainText("AI generation is not connected");
  await introduction.getByRole("link", { name: "Preview the sample", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  const originalRevision = await workbench(page).getAttribute("data-revision");
  await page.getByRole("button", { name: /More tools · experiments/ }).click();
  await page.getByRole("button", { name: "Preview sample change", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: variant.title });
  await expect(comparison).toContainText("A pre-authored example, not AI generation");
  await expect(comparison).toContainText("Facade remains unchanged.");
  await expect(workbench(page)).toHaveAttribute("data-revision", originalRevision!);
  await expect(workbench(page)).toHaveAttribute("data-count", String(counts.masseria));
  await comparison.getByRole("button", { name: "Apply pre-authored variant", exact: true }).click();
  await expect(comparison).toHaveCount(0);
  const changedCount = counts.masseria - variant.removeIds.length + variant.additions.length;
  await expect(page.getByTestId("piece-count")).toHaveText(String(changedCount));
  await openInspector(page);
  await page
    .getByRole("combobox", { name: "Choose a logical part" })
    .selectOption("simple-roof-0-0");
  await expect(page.getByRole("combobox", { name: "Part color", exact: true })).toHaveValue(
    "terracotta",
  );
  await expect(
    page
      .getByRole("combobox", { name: "Choose a logical part" })
      .locator('option[value="roof-bed-0--1"]'),
  ).toHaveCount(0);

  await navigateProject(page, "Instructions");
  await expect(page.getByText(/Instruction sample belongs to the original revision/)).toBeVisible();
  await navigateProject(page, "Workbench");
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
  await expect(workbench(page)).toHaveAttribute("data-revision", originalRevision!);
  await navigateProject(page, "Instructions");
  await expect(page.getByText(/Instruction sample belongs to the original revision/)).toHaveCount(
    0,
  );
  await navigateProject(page, "Workbench");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByRole("button", { name: "Select Facade", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Selection color", exact: true })).toBeDisabled();
  await openInspector(page);
  await page.getByRole("combobox", { name: "Choose a logical part" }).selectOption("roof-bed-0--1");
  await openDetails(page, "Advanced position");
  await page.getByRole("button", { name: "Move x positive", exact: true }).click();
  const editedRevision = await workbench(page).getAttribute("data-revision");
  expect(editedRevision).not.toBe(originalRevision);
  await page.getByRole("button", { name: /More tools · experiments/ }).click();
  await page.getByRole("button", { name: "Preview sample change", exact: true }).click();
  await expect(comparison.getByRole("alert")).toContainText("Revision conflict");
  await expect(
    comparison.getByRole("button", { name: "Apply pre-authored variant", exact: true }),
  ).toBeDisabled();
  await expect(workbench(page)).toHaveAttribute("data-revision", editedRevision!);
  await expect(workbench(page)).toHaveAttribute("data-count", String(counts.masseria));
});

test("Product continuity: project context is isolated during navigation and clears on reload", async ({
  page,
}) => {
  await page.goto("/new/?project=blank");
  await page.getByRole("textbox", { name: "Subject or intent" }).fill("My own free-form idea");
  await page.getByLabel("Choose reference files").setInputFiles(referenceImage);
  await page.getByRole("link", { name: "Return to workbench", exact: true }).click();
  await expect(workbench(page)).toHaveAttribute("data-count", "0");
  const blankRevision = await workbench(page).getAttribute("data-revision");

  await page
    .getByRole("navigation", { name: "Global navigation" })
    .getByRole("link", { name: "Workspace", exact: true })
    .click();
  await page.getByRole("link", { name: "Open Field rover", exact: true }).click();
  await openReferences(page);
  await expect(briefSummary(page)).not.toContainText("My own free-form idea");
  await expect(
    references(page).getByRole("button", { name: referenceImage.name, exact: true }),
  ).toHaveCount(0);
  await navigateProject(page, "Project brief");
  await expect(page.getByRole("textbox", { name: "Subject or intent" })).toHaveValue("");
  await page.getByRole("textbox", { name: "Subject or intent" }).fill("A separate rover brief");
  await page.getByRole("link", { name: "Return to workbench", exact: true }).click();
  await openReferences(page);
  await expect(briefSummary(page)).toContainText("A separate rover brief");

  await page
    .getByRole("navigation", { name: "Global navigation" })
    .getByRole("link", { name: "Workspace", exact: true })
    .click();
  await page.getByRole("link", { name: "Start from scratch", exact: true }).click();
  await expect(workbench(page)).toHaveAttribute("data-revision", blankRevision!);
  await expect(workbench(page)).toHaveAttribute("data-count", "0");
  await openReferences(page);
  await expect(briefSummary(page)).toContainText("My own free-form idea");
  await expect(briefSummary(page)).not.toContainText("A separate rover brief");
  await expect(
    references(page).getByRole("img", { name: `Pinned reference: ${referenceImage.name}` }),
  ).toBeVisible();
  await navigateProject(page, "Project brief");
  await expect(page.getByRole("textbox", { name: "Subject or intent" })).toHaveValue(
    "My own free-form idea",
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Subject or intent" })).toHaveValue("");
  await expect(page.getByRole("img", { name: referenceImage.name, exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Return to workbench", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await expect(workbench(page)).toHaveAttribute("data-revision", "blank-r1");
});

test("Product continuity: metadata-only work survives reset and cancelled replacement, then clears with an explicit import", async ({
  page,
}) => {
  await page.goto("/new/?project=blank");
  await page.getByRole("textbox", { name: "Subject or intent" }).fill("My own free-form idea");
  await page.getByLabel("Choose reference files").setInputFiles(referenceImage);
  await page.getByRole("link", { name: "Return to workbench", exact: true }).click();
  await expect(workbench(page)).toHaveAttribute("data-count", "0");
  const blankRevision = await workbench(page).getAttribute("data-revision");
  await openReferences(page);
  await openDetails(page, "Project tools");
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Reset this demo?" })
    .getByRole("button", { name: "Restore baseline", exact: true })
    .click();
  await expect(briefSummary(page)).toContainText("My own free-form idea");
  await expect(
    references(page).getByRole("img", { name: `Pinned reference: ${referenceImage.name}` }),
  ).toBeVisible();
  await expect(workbench(page)).toHaveAttribute("data-revision", blankRevision!);

  const importedFile = {
    name: "separate-design.brikuma.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "brikuma-scene",
        schemaVersion: 1,
        coordinates: "stud-y-up-quarter-turn-v1",
        model: {
          id: "imported",
          title: "Imported design",
          baselineRevision: "imported-r1",
          revision: "imported-r1",
          groups: [{ id: "workspace", name: "Imported parts", protected: false }],
          instances: [
            {
              id: "imported-brick",
              partId: "demo-brick-2x4",
              colorId: "limestone",
              groupId: "workspace",
              transform: { x: 0, y: 0.6, z: 0, rotation: 0 },
            },
          ],
        },
      }),
    ),
  };
  await openDetails(page, "Project tools");
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  const files = page.getByRole("dialog", { name: "Local project files", exact: true });
  await expect(files).toContainText("Downloads preserve geometry and stable part IDs");
  await files.getByLabel("Load project file", { exact: true }).setInputFiles(importedFile);
  const replacement = page.getByRole("dialog", { name: "Replace this local model?" });
  await expect(replacement).toBeVisible();
  await expect(workbench(page)).toHaveAttribute("data-count", "0");
  await replacement.getByRole("button", { name: "Keep current model", exact: true }).click();
  await files.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(briefSummary(page)).toContainText("My own free-form idea");
  await expect(
    references(page).getByRole("img", { name: `Pinned reference: ${referenceImage.name}` }),
  ).toBeVisible();
  await openDetails(page, "Project tools");
  await page.getByRole("button", { name: "Local project files", exact: true }).click();
  await files.getByLabel("Load project file", { exact: true }).setInputFiles(importedFile);
  await replacement.getByRole("button", { name: "Replace with file", exact: true }).click();
  await expect(files).toHaveCount(0);
  await expect(workbench(page)).toHaveAttribute("data-revision", "imported-r1");
  await expect(workbench(page)).toHaveAttribute("data-count", "1");
  await expect(briefSummary(page)).not.toContainText("My own free-form idea");
  await expect(
    references(page).getByRole("img", { name: `Pinned reference: ${referenceImage.name}` }),
  ).toHaveCount(0);

  await navigateProject(page, "Project brief");
  await expect(page.getByRole("textbox", { name: "Subject or intent" })).toHaveValue("");
  await expect(page.getByText(/^Imported design ·/)).toBeVisible();
  await expect(page.getByRole("img", { name: referenceImage.name, exact: true })).toHaveCount(0);
});
