// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Model } from "../../src/core/model/public";
import { PlacementControls } from "../../src/features/editor/components/placement-controls";
import type { PlacementPreview } from "../../src/features/editor/viewport-types";

afterEach(cleanup);
const empty: Model = {
  id: "placement-study",
  title: "Placement study",
  revision: "r1",
  baselineRevision: "r1",
  groups: [{ id: "assembly", name: "Assembly", protected: false }],
  instances: [],
};
const freeDoor: PlacementPreview = {
  partId: "demo-door-leaf",
  colorId: "ivory",
  target: "free",
  transform: { x: 0, y: 1.4, z: 2.1, rotation: 0 },
};

function Controls({
  initial = freeDoor,
  model = empty,
  awaitingNextPosition = false,
  onPlace = vi.fn(() => true),
  onChange = vi.fn(),
}: {
  initial?: PlacementPreview;
  model?: Model;
  awaitingNextPosition?: boolean;
  onPlace?: (transform: PlacementPreview["transform"]) => boolean;
  onChange?: (transform: PlacementPreview["transform"]) => void;
}) {
  const [placement, setPlacement] = useState(initial);
  return (
    <PlacementControls
      placement={placement}
      model={model}
      hiddenIds={[]}
      repeat={false}
      awaitingNextPosition={awaitingNextPosition}
      onRepeat={vi.fn()}
      onCancel={vi.fn()}
      onColor={(colorId) => setPlacement({ ...placement, colorId })}
      onPolicy={(target) => setPlacement({ ...placement, target })}
      onChange={(transform) => {
        onChange(transform);
        setPlacement({ ...placement, transform });
      }}
      onPlace={onPlace}
    />
  );
}

describe("Placement controls guide a consistent preview and commit", () => {
  it("rejects unsupported precision inline before either preview or commit, and recovers", async () => {
    const user = userEvent.setup(),
      onChange = vi.fn(),
      onPlace = vi.fn(() => true);
    render(<Controls onChange={onChange} onPlace={onPlace} />);
    expect(screen.getByText("Advanced placement").closest("details")).not.toHaveAttribute("open");
    await user.click(screen.getByText("Advanced placement"));
    const z = screen.getByRole("spinbutton", { name: "Placement Z" });
    await user.clear(z);
    await user.type(z, "2.12");
    expect(z).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Use 0.08 cm steps left\/right/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Update preview" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(onPlace).not.toHaveBeenCalled();
    await user.clear(z);
    await user.type(z, "1.76");
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Update preview" }));
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 1.4, z: 2.2, rotation: 0 });
    await user.click(screen.getByRole("button", { name: "Place brick" }));
    expect(onPlace).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 1.4, z: 2.2, rotation: 0 });
  });

  it("explains an unavailable attachment and never enables Connect for a visual detail", async () => {
    const user = userEvent.setup();
    render(<Controls />);
    expect(screen.getByRole("button", { name: "Attach to model" })).toBeDisabled();
    await user.click(screen.getByText("Advanced placement"));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(
      screen.getByText(/Visual detail only: this piece has no supported attachment/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Free position" }));
    expect(screen.getByRole("button", { name: "Place brick" })).toBeEnabled();
  });

  it("names spatial targets and keeps connector identifiers in advanced controls", async () => {
    const user = userEvent.setup();
    const model: Model = {
      ...empty,
      instances: [
        {
          id: "added-94",
          groupId: "assembly",
          colorId: "ivory",
          partId: "demo-plate-2x2",
          transform: { x: 0, y: 0.2, z: 0, rotation: 0 },
        },
      ],
    };
    render(
      <Controls
        model={model}
        initial={{
          ...freeDoor,
          partId: "demo-brick-1x1",
          target: "surface",
          transform: { x: 0.5, y: 1, z: 0.5, rotation: 0 },
        }}
      />,
    );
    await user.click(screen.getByText("Choose a surface from the list"));
    const candidates = within(
      screen.getByRole("list", { name: "Connector candidates" }),
    ).getAllByRole("button");
    expect(candidates[0]).toHaveTextContent("On Plate 2 × 2");
    expect(candidates[0]).toHaveTextContent("Left/right 0.4 cm · front/back 0.4 cm");
    expect(candidates[0]).not.toHaveTextContent("added-94");
    expect(
      screen.queryByRole("combobox", { name: "Source underside connector" }),
    ).not.toBeVisible();
    await user.click(candidates[0]);
    expect(screen.getByRole("button", { name: "Place brick" })).toBeEnabled();
    await user.click(screen.getByText("Advanced connection controls"));
    expect(screen.getByRole("combobox", { name: "Source underside connector" })).toBeVisible();
    expect(screen.getByText(/Selected connector: added-94/)).toBeVisible();
    await user.click(screen.getByText("Advanced placement"));
    expect(screen.getByText("Left/right · X (cm)")).toBeVisible();
    expect(screen.getByText("Height · Y (cm)")).toBeVisible();
    expect(screen.getByText("Front/back · Z (cm)")).toBeVisible();
  });

  it("announces successful repeat placement as the next-position step", () => {
    render(<Controls awaitingNextPosition />);
    expect(screen.getByText(/Placed. Choose the next position/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Place brick" })).toBeDisabled();
    expect(screen.queryByText(/This position overlaps another piece/)).not.toBeInTheDocument();
  });
});
