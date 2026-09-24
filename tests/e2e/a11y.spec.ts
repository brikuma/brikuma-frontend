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
    if (path.startsWith("/editor")) await expect(page.getByTestId("piece-count")).toHaveText("267");
    if (path.startsWith("/inventory"))
      await expect(page.getByTestId("inventory-total")).toContainText("267");
    if (path.startsWith("/instructions"))
      await expect(page.getByText("Step 1 of 5 · Baseline layout")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
