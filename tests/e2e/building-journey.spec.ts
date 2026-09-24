import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openDetails } from "./editor-controls";

test("A courtyard can be built in sections, edited and used to generate current instructions", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await openDetails(page, "Project tools");
  await page.getByRole("button", { name: "Building templates", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Building width" })).toHaveValue("32");
  await expect(page.getByRole("combobox", { name: "Building depth" })).toHaveValue("24");
  await expect(page.getByRole("combobox", { name: "Camera controls" })).not.toBeVisible();
  await expect(page.getByRole("combobox", { name: "Camera view" })).toHaveValue("iso");
  for (const [section, additions, total] of [
    ["foundation", 48, 48],
    ["walls", 320, 368],
    ["roof", 96, 464],
  ] as const) {
    await page.getByRole("combobox", { name: "Building section" }).selectOption(section);
    await page.getByRole("button", { name: "Preview building", exact: true }).click();
    await expect(page.getByRole("region", { name: "Building helper" })).toContainText(
      "contact path to the ground",
    );
    await page.getByRole("button", { name: `Add ${additions} pieces`, exact: true }).click();
    await expect(page.locator(".workbench-shell")).toHaveAttribute("data-count", String(total));
  }
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-count", "368");
  await page.getByRole("button", { name: "Redo local edit", exact: true }).click();
  const revision = await page.locator(".workbench-shell").getAttribute("data-revision");
  await page.getByRole("button", { name: "Exploded view", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Disassembly method" })).toHaveValue("layers");
  await expect(page.getByLabel("Assembly separation controls")).toContainText("sections");
  await page.getByRole("button", { name: "Reassemble", exact: true }).click();
  await expect(page.locator(".workbench-shell")).toHaveAttribute("data-revision", revision!);
  const nav = page.getByRole("navigation", { name: "Project navigation" });
  await nav.getByRole("link", { name: "Instructions", exact: true }).click();
  await page.getByRole("button", { name: "Generate instructions", exact: true }).click();
  await expect(page.getByText(/Local instruction draft · 464 pieces/)).toBeVisible();
  await expect(page.getByRole("img", { name: /Instruction drawing:/ })).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByText(/Step 2 of/)).toBeVisible();
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await nav.getByRole("link", { name: "Workbench", exact: true }).click();
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await openDetails(page, "Advanced placement");
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Placement X", exact: true }).fill("16");
  await page.getByRole("button", { name: "Update preview", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await nav.getByRole("link", { name: "Instructions", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("out of date");
  await page.getByRole("button", { name: "Regenerate instructions", exact: true }).click();
  await expect(page.getByText(/Local instruction draft · 465 pieces/)).toBeVisible();
  await expect(page.getByText(/These instructions are out of date/)).toHaveCount(0);
});
