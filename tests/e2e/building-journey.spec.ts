import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openDetails } from "./editor-controls";

test("A placed brick can be rotated and repositioned with a checked preview, then removed and restored", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  const workspace = page.locator(".workbench-shell");
  await page.getByRole("button", { name: "Add Plate 4 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.getByRole("button", { name: "Add Brick 1 × 2", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  const original = await workspace.getAttribute("data-revision");
  await expect(page.getByText("Attached at 2 connection points", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rotate 90°", exact: true }).click();
  const preview = page.getByRole("region", { name: "Reposition piece", exact: true });
  await expect(preview.getByText("Turn: 90°", { exact: true })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Apply move", exact: true })).toBeEnabled();
  await expect(workspace).toHaveAttribute("data-revision", original!);
  await expect(workspace).toHaveAttribute("data-count", "2");
  await expect(preview.getByRole("checkbox", { name: "Repeat placement" })).toHaveCount(0);
  await page.getByRole("button", { name: "Apply move", exact: true }).click();
  const rotated = await workspace.getAttribute("data-revision");
  expect(rotated).not.toBe(original);
  await expect(page.getByText("Attached at 2 connection points", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-revision", original!);
  await page.getByRole("button", { name: "Redo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-revision", rotated!);
  await page.getByRole("button", { name: "Move piece", exact: true }).click();
  await preview.getByRole("button", { name: "On the floor", exact: true }).click();
  await expect(preview).toContainText("This position overlaps another piece");
  await expect(preview.getByRole("button", { name: "Apply move", exact: true })).toBeDisabled();
  await preview.getByRole("button", { name: "Cancel move", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-revision", rotated!);
  await page.getByRole("button", { name: "Move piece", exact: true }).click();
  await page.getByRole("region", { name: "Modeling workspace", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(workspace).toHaveAttribute("data-revision", rotated!);
  await expect(preview.getByRole("button", { name: "Apply move", exact: true })).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(preview).toHaveCount(0);
  await expect(workspace).toHaveAttribute("data-count", "2");
  await expect(
    page.getByRole("combobox", { name: "Choose a logical part", exact: true }),
  ).toHaveValue("added-2");
  const moved = await workspace.getAttribute("data-revision");
  expect(moved).not.toBe(rotated);
  await expect(page.getByText("Attached at 2 connection points", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove selected part", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "1");
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "2");
  await expect(workspace).toHaveAttribute("data-revision", moved!);
  await page.getByRole("button", { name: "Redo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "1");
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Project navigation" })
    .getByRole("link", { name: "Instructions", exact: true })
    .click();
  await page.getByRole("button", { name: "Generate instructions", exact: true }).click();
  await expect(
    page.getByText(/Local instruction draft · 2 pieces · 2 layers · 2 steps/),
  ).toBeVisible();
});

test("Single-piece Move picks up a preview and commits only on a separate canvas click", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  const workspace = page.locator(".workbench-shell");
  await page.getByRole("button", { name: "Add Brick 2 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await page.getByRole("combobox", { name: "Camera view", exact: true }).selectOption("top");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const original = await workspace.getAttribute("data-revision");
  await page.getByRole("button", { name: "Move tool", exact: true }).click();
  await page.mouse.click(x, y);
  const preview = page.getByRole("region", { name: "Reposition piece", exact: true });
  await expect(preview).toBeVisible();
  await expect(workspace).toHaveAttribute("data-revision", original!);
  await expect(workspace).toHaveAttribute("data-count", "1");
  await expect(canvas).toHaveAttribute("data-part-count", "1");
  await page.mouse.move(x + 70, y + 30, { steps: 8 });
  await expect(preview.getByRole("button", { name: "Apply move", exact: true })).toBeEnabled();
  await expect(workspace).toHaveAttribute("data-revision", original!);
  await page.mouse.click(x + 70, y + 30);
  await expect(preview).toHaveCount(0);
  await expect(workspace).not.toHaveAttribute("data-revision", original!);
  await expect(workspace).toHaveAttribute("data-count", "1");
  await openDetails(page, "Advanced position");
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).not.toHaveValue(
    "0",
  );
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-revision", original!);
  await expect(page.getByRole("spinbutton", { name: "Position X", exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Move piece", exact: true }).click();
  await page.getByRole("region", { name: "Modeling workspace", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(workspace).toHaveAttribute("data-revision", original!);
  await page.getByRole("button", { name: "Move piece", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(preview).toHaveCount(0);
  await expect(workspace).toHaveAttribute("data-revision", original!);
});

test("A mixed-piece build recovers attachment after floor placement and supports rotation, history and instructions", async ({
  page,
}) => {
  await page.goto("/editor/?project=blank");
  const workspace = page.locator(".workbench-shell");
  await expect(workspace).toHaveAttribute("data-count", "0");
  const baselineRevision = await workspace.getAttribute("data-revision");
  await page.getByRole("button", { name: "Add Brick 1 × 2", exact: true }).click();
  const pending = page.getByRole("region", { name: "Pending brick placement" });
  for (let turn = 1; turn <= 4; turn++) {
    if (turn % 2 === 0) {
      await page.getByRole("region", { name: "Modeling workspace", exact: true }).focus();
      await page.keyboard.press("r");
    } else await page.getByRole("button", { name: "Rotate pending brick", exact: true }).click();
    await expect(pending.getByText(`Turn: ${(turn * 90) % 360}°`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Place brick", exact: true })).toBeEnabled();
    await expect(workspace).toHaveAttribute("data-count", "0");
    await expect(workspace).toHaveAttribute("data-revision", baselineRevision!);
    await expect(page.getByRole("button", { name: "Undo local edit", exact: true })).toBeDisabled();
  }
  await page.getByRole("button", { name: "Cancel placement", exact: true }).click();
  await page.getByRole("button", { name: "Add Plate 4 × 4", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "1");
  await page.getByRole("button", { name: "Add Brick 1 × 2", exact: true }).click();
  await expect(page.getByRole("button", { name: "Attach to model", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("combobox", { name: "Pending brick color", exact: true })
    .selectOption("terracotta");
  await page.getByRole("button", { name: "Rotate pending brick", exact: true }).click();
  await expect(page.getByRole("button", { name: "Place brick", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "On the floor", exact: true }).click();
  await expect(page.getByRole("button", { name: "Place brick", exact: true })).toBeDisabled();
  await expect(pending).toContainText("This position overlaps another piece");
  await page.getByRole("button", { name: "Attach to model", exact: true }).click();
  await expect(page.getByRole("button", { name: "Place brick", exact: true })).toBeEnabled();
  await expect(pending).toContainText("studs aligned");
  await expect(pending.getByText("Turn: 90°", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Pending brick color", exact: true }),
  ).toHaveValue("terracotta");
  await expect(
    page.getByRole("spinbutton", { name: "Placement X", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "2");
  const assembledRevision = await workspace.getAttribute("data-revision");
  await page.getByRole("button", { name: "Undo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "1");
  await expect(page.getByRole("status").filter({ hasText: "Change undone." })).toBeVisible();
  await page.getByRole("button", { name: "Redo local edit", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "2");
  await expect(workspace).toHaveAttribute("data-revision", assembledRevision!);
  await expect(page.getByRole("status").filter({ hasText: "Change restored." })).toBeVisible();
  await page.getByRole("button", { name: "Add Brick 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Place brick", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-count", "3");
  await page
    .getByRole("navigation", { name: "Project navigation" })
    .getByRole("link", { name: "Instructions", exact: true })
    .click();
  await page.getByRole("button", { name: "Generate instructions", exact: true }).click();
  await expect(
    page.getByText(/Local instruction draft · 3 pieces · 3 layers · 3 steps/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByText("Terracotta", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByText("Step 3 of 3", { exact: true })).toBeVisible();
});

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
  await expect(page.getByRole("combobox", { name: "Current layer" })).toBeVisible();
  await expect(page.getByLabel("Assembly separation controls")).toContainText(
    "Other layers are hidden",
  );
  await page.getByRole("button", { name: "Show all layers", exact: true }).click();
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
  await expect(page.getByText(/Local instruction draft · 464 pieces/)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("out of date");
  await page.getByRole("button", { name: "Regenerate instructions", exact: true }).click();
  await expect(page.getByText(/Local instruction draft · 465 pieces/)).toBeVisible();
  await expect(page.getByText(/These instructions are out of date/)).toHaveCount(0);
});
