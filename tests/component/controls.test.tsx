// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "../../src/components/ui/dialog";
import { PartCatalog } from "../../src/features/editor/components/part-catalog";
import { Structure } from "../../src/features/editor/components/structure";
import { SelectionInspector } from "../../src/features/editor/components/selection-inspector";
import { AssistantPreview } from "../../src/features/ai-preview/assistant-preview";
import { fixture } from "../../src/fixtures/scenes/masseria";
import { model as blankModel } from "../../src/fixtures/scenes/blank";
import { model as roverModel } from "../../src/fixtures/scenes/rover";

afterEach(cleanup);

describe("FE-019: modal keyboard contract", () => {
  it("restores the external opener of a controlled inspector after Escape", async () => {
    function InspectorExample() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open inspector</button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="Inspector"
            description="A controlled local panel."
          >
            <button>Choose a part</button>
          </Dialog>
        </>
      );
    }
    const user = userEvent.setup();
    render(<InspectorExample />);
    const opener = screen.getByRole("button", { name: "Open inspector" });
    await user.click(opener);
    expect(await screen.findByRole("dialog", { name: "Inspector" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
  it("names its dialog, traps focus, closes on Escape, and restores the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Dialog
        title="Export preview"
        description="No production export is connected."
        trigger={<button>Open export</button>}
      >
        <button>Review sample</button>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Open export" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Export preview" });
    expect(dialog).toHaveAccessibleDescription("No production export is connected.");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("FE-007: local part catalog", () => {
  it("filters catalog names, exposes an empty state and adds the selected color", async () => {
    const user = userEvent.setup();
    const add = vi.fn();
    render(<PartCatalog onAdd={add} />);
    await user.type(screen.getByRole("textbox", { name: "Search part catalog" }), "unlisted");
    expect(screen.getByText("No demo parts match “unlisted”.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("textbox", { name: "Search part catalog" })).toHaveValue("");
    await user.selectOptions(screen.getByRole("combobox", { name: "Part category" }), "slope");
    await user.selectOptions(screen.getByRole("combobox", { name: "New part color" }), "teal");
    await user.click(screen.getByRole("button", { name: "Add Roof slope 2 × 4" }));
    expect(add).toHaveBeenCalledWith("demo-slope-2x4", "teal");
    expect(screen.queryByRole("button", { name: "Add Brick 2 × 4" })).not.toBeInTheDocument();
  });
});

describe("FE-006: semantic structure and protection controls", () => {
  it("selects an actual logical part and keeps visibility separate from protection", async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    const visibility = vi.fn();
    const protection = vi.fn();
    render(
      <Structure
        model={fixture.model}
        hidden={[]}
        selected={null}
        onSelect={select}
        onVisibility={visibility}
        onProtection={protection}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select Roof" }));
    expect(select).toHaveBeenCalledWith(
      fixture.model.instances.find((part) => part.groupId === "roof")?.id,
    );
    await user.click(screen.getByRole("button", { name: "Hide Roof" }));
    expect(visibility).toHaveBeenCalledWith("roof");
    expect(protection).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Unprotect Facade" }));
    expect(protection).toHaveBeenCalledWith("facade", false);
  });

  it("explains protected selections and disables mutation controls", () => {
    const facade = fixture.model.instances.find((part) => part.groupId === "facade")!;
    render(
      <SelectionInspector
        model={fixture.model}
        selected={facade.id}
        onSelect={vi.fn()}
        command={vi.fn()}
      />,
    );
    expect(screen.getByText(/Protected Facade/)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Part color" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove selected part" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move x positive" })).toBeDisabled();
    expect(screen.getByTestId("piece-count")).toHaveTextContent(
      String(fixture.model.instances.length),
    );
  });

  it("provides keyboard-operated movement and color command alternatives", async () => {
    const user = userEvent.setup();
    const roof = fixture.model.instances.find((part) => part.groupId === "roof")!;
    const command = vi.fn(() => true);
    render(
      <SelectionInspector
        model={fixture.model}
        selected={roof.id}
        onSelect={vi.fn()}
        command={command}
      />,
    );
    const move = screen.getByRole("button", { name: "Move x positive" });
    move.focus();
    await user.keyboard("{Enter}");
    expect(command).toHaveBeenCalledWith({
      type: "translate",
      id: roof.id,
      delta: { x: 1, y: 0, z: 0 },
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Part color" }), "teal");
    expect(command).toHaveBeenCalledWith({
      type: "recolor",
      id: roof.id,
      colorId: "teal",
    });
  });
});

describe("FE-011 / FE-012: truthful pre-authored change preview", () => {
  it("opens a clearly authored suggestion without offering arbitrary text generation", async () => {
    const user = userEvent.setup();
    const command = vi.fn(() => true);
    render(<AssistantPreview model={fixture.model} variant={fixture.variant} command={command} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Assisted design preview" })).toBeVisible();
    expect(screen.getByText("Pre-authored sample change · AI is not connected.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Preview sample change" }));
    const dialog = screen.getByRole("dialog", { name: "A quieter roofline" });
    expect(command).not.toHaveBeenCalled();
    expect(within(dialog).getByText(fixture.variant!.description)).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", {
        name: "Apply pre-authored variant",
      }),
    );
    expect(command).toHaveBeenCalledWith({
      type: "apply-variant",
      variant: fixture.variant,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes a revision conflict and prevents an incompatible apply", async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(
      <AssistantPreview
        model={{ ...fixture.model, revision: "masseria-local-7" }}
        variant={fixture.variant}
        command={command}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Preview sample change" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Revision conflict");
    expect(screen.getByRole("button", { name: "Apply pre-authored variant" })).toBeDisabled();
    expect(command).not.toHaveBeenCalled();
  });

  it.each([blankModel, roverModel])(
    "explains unavailable assistance for $id without a fabricated proposal",
    (model) => {
      const command = vi.fn();
      render(<AssistantPreview model={model} variant={null} command={command} />);
      const preview = screen.getByRole("region", { name: "Assisted design preview" });
      expect(preview).toHaveTextContent(
        "No pre-authored change is available for this model. AI is not connected.",
      );
      expect(within(preview).queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(command).not.toHaveBeenCalled();
    },
  );

  it("keeps protected groups in the core preview rejection path", async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(
      <AssistantPreview
        model={{
          ...fixture.model,
          groups: fixture.model.groups.map((group) =>
            group.id === "roof" ? { ...group, protected: true } : group,
          ),
        }}
        variant={fixture.variant}
        command={command}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Preview sample change" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Roof is protected");
    expect(screen.getByRole("button", { name: "Apply pre-authored variant" })).toBeDisabled();
    expect(command).not.toHaveBeenCalled();
  });

  it("keeps a rejected apply open and clears its error when the user previews again", async () => {
    const user = userEvent.setup();
    const command = vi.fn(() => false);
    render(<AssistantPreview model={fixture.model} variant={fixture.variant} command={command} />);
    await user.click(screen.getByRole("button", { name: "Preview sample change" }));
    await user.click(screen.getByRole("button", { name: "Apply pre-authored variant" }));
    expect(screen.getByRole("dialog", { name: "A quieter roofline" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("This change was rejected.");
    expect(command).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Preview sample change" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(command).toHaveBeenCalledOnce();
  });
});
