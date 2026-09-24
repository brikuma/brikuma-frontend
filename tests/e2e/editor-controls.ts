import type { Page } from "@playwright/test";

export async function openDetails(page: Page, title: string) {
  const summary = page.locator("summary").filter({ hasText: new RegExp(`^${title}$`) });
  if ((await summary.locator("..").getAttribute("open")) === null) await summary.click();
}

export async function openInspector(page: Page) {
  if (await page.getByRole("combobox", { name: "Choose a logical part" }).isVisible()) return;
  const desktop = page.getByRole("button", { name: "Toggle inspector panel", exact: true });
  if ((page.viewportSize()?.width ?? 1440) >= 1280) await desktop.click();
  else await page.getByRole("button", { name: "Inspector", exact: true }).click();
}
