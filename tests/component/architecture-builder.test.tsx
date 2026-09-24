// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExperimentPreview, Model } from "../../src/core/model/public";
import { ArchitectureBuilder } from "../../src/features/editor/components/architecture-builder";
import { editPolicy } from "../../src/fixtures/catalog";

const model: Model = {
  id: "building",
  title: "Courtyard study",
  revision: "r1",
  baselineRevision: "r1",
  groups: [{ id: "assembly", name: "Building", protected: false }],
  instances: [],
};
afterEach(cleanup);

describe("Local building helper", () => {
  it("previews the large courtyard, compares with current, and only applies on explicit acceptance", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn<(proposal: Model | null) => void>();
    const onAccept = vi.fn<(proposal: ExperimentPreview) => boolean>(() => true);
    render(
      <ArchitectureBuilder
        model={model}
        policy={editPolicy}
        onPreview={onPreview}
        onAccept={onAccept}
      />,
    );
    expect(screen.getByRole("button", { name: /Courtyard/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("combobox", { name: "Building width" })).toHaveValue("32");
    expect(screen.getByRole("combobox", { name: "Building depth" })).toHaveValue("24");
    expect(screen.getByText(/Local building helper, not AI/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Preview building" }));
    const proposed = onPreview.mock.lastCall?.[0];
    expect(proposed?.instances.length).toBeGreaterThan(250);
    expect(model.instances).toEqual([]);
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.getByText("25.6 × 19.2 × 5.76 cm")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Current" }));
    expect(onPreview).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(onPreview).toHaveBeenLastCalledWith(proposed);
    await user.click(screen.getByRole("button", { name: /^Add \d+ pieces$/ }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept.mock.calls[0][0].proposed).toEqual(proposed);
    expect(onPreview).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("status")).toHaveTextContent(/Undo removes this addition/);
  });

  it("reports a missing roof support without publishing a preview or changing the scene", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const onAccept = vi.fn();
    render(
      <ArchitectureBuilder
        model={model}
        policy={editPolicy}
        onPreview={onPreview}
        onAccept={onAccept}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Building section" }), "roof");
    await user.click(screen.getByRole("button", { name: "Preview building" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Build the matching foundation and walls");
    expect(onPreview).not.toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Add \d+ pieces$/ })).not.toBeInTheDocument();
  });

  it("blocks acceptance after the base changes and clears its preview when dismissed", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const onAccept = vi.fn();
    const view = render(
      <ArchitectureBuilder
        model={model}
        policy={editPolicy}
        onPreview={onPreview}
        onAccept={onAccept}
      />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Building section" }),
      "foundation",
    );
    await user.click(screen.getByRole("button", { name: "Preview building" }));
    view.rerender(
      <ArchitectureBuilder
        model={{ ...model, title: "Changed model" }}
        policy={editPolicy}
        onPreview={onPreview}
        onAccept={onAccept}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("The model changed");
    expect(screen.getByRole("button", { name: /^Add \d+ pieces$/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Back to options" }));
    expect(onPreview).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: "Preview building" })).toBeEnabled();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("targets an existing unlocked assembly and keeps application disabled in an inspection mode", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const grouped: Model = {
      ...model,
      groups: [
        { id: "locked", name: "Protected base", protected: true },
        { id: "walls", name: "Walls", protected: false },
        { id: "roof", name: "Roof", protected: false },
      ],
    };
    const view = render(
      <ArchitectureBuilder
        model={grouped}
        policy={editPolicy}
        onPreview={onPreview}
        onAccept={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Position & assembly"));
    expect(screen.queryByRole("option", { name: "Protected base" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Building assembly" }), "roof");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Building section" }),
      "foundation",
    );
    await user.click(screen.getByRole("button", { name: "Preview building" }));
    expect(
      onPreview.mock.lastCall?.[0].instances.every(
        (part: { groupId: string }) => part.groupId === "roof",
      ),
    ).toBe(true);
    view.rerender(
      <ArchitectureBuilder
        model={grouped}
        policy={editPolicy}
        onPreview={onPreview}
        onAccept={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: /^Add \d+ pieces$/ })).toBeDisabled();
    view.unmount();
    expect(onPreview).toHaveBeenLastCalledWith(null);
  });
});
