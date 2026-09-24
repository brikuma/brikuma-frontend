import counts from "../../src/fixtures/scene-counts.json";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of [
  "/",
  "/new/",
  "/editor/?project=masseria&noWebgl=1",
  "/inventory/?project=masseria",
  "/instructions/?project=masseria",
  "/community/",
  "/marketplace/",
  "/plans/",
  "/design-system/",
]) {
  test(`FE-019: axe WCAG 2.2 AA diagnostic ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    if (path.startsWith("/editor"))
      await expect(page.getByTestId("piece-count")).toHaveText(String(counts.masseria));
    if (path.startsWith("/inventory"))
      await expect(page.getByTestId("inventory-total")).toContainText(String(counts.masseria));
    if (path.startsWith("/instructions"))
      await expect(page.getByText("Step 1 of 5 · Baseline layout")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("EDT-034,036: active placement and mobile structure have no automated AA violations", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  const pending = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(pending.violations).toEqual([]);
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Parts & structure", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Parts & structure", exact: true })
    .getByRole("button", { name: "Structure", exact: true })
    .click();
  const structure = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(structure.violations).toEqual([]);
});
