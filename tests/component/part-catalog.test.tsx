// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PartCatalog,
  type PartCatalogPreferences,
} from "../../src/features/editor/components/part-catalog";
import { partDefinitions } from "../../src/fixtures/catalog";

afterEach(cleanup);
const addButtons = () => screen.queryAllByRole("button", { name: /^Add / });

describe("Editor part discovery", () => {
  it("finds original IDs and dimensions without exposing technical IDs on every card", async () => {
    const user = userEvent.setup();
    render(<PartCatalog onAdd={vi.fn()} />);
    const search = screen.getByRole("textbox", { name: "Search part catalog" });
    await user.type(search, "  DEMO-BRICK-2X4  ");
    expect(addButtons()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add Brick 2 × 4" })).toHaveTextContent(
      "3.2 × 1.6 × 0.96 cm",
    );
    expect(screen.queryByText("ID: demo-brick-2x4")).not.toBeInTheDocument();
    await user.clear(search);
    await user.type(search, " smooth 2 x 4 ");
    expect(addButtons()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add Smooth tile 2 × 4" })).toBeVisible();
    await user.clear(search);
    await user.type(search, "ARCHITECTURE");
    expect(screen.getByRole("button", { name: "Add Stone gate surround" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add Brick 2 × 4" })).not.toBeInTheDocument();
  });

  it("offers nonempty accurate categories and separates smooth tiles from plates and roof tiles", async () => {
    const user = userEvent.setup();
    render(<PartCatalog onAdd={vi.fn()} />);
    const category = screen.getByRole("combobox", { name: "Part category" });
    for (const id of ["brick", "plate", "tile", "slope", "cylinder", "architecture", "nature"]) {
      await user.selectOptions(category, id);
      expect(addButtons().length).toBeGreaterThan(0);
    }
    await user.selectOptions(category, "tile");
    expect(addButtons()).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Add Smooth tile 2 × 2" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add Plate 2 × 2" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Curved terracotta roof tile" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(category, "slope");
    expect(screen.getByRole("button", { name: "Add Curved terracotta roof tile" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add Terracotta ridge cap" })).toBeVisible();
  });

  it("combines favorites, usage, category and query and clears the whole filter intersection", async () => {
    const user = userEvent.setup();
    render(
      <PartCatalog
        onAdd={vi.fn()}
        favoritePartIds={["demo-tile-2x2", "demo-tile-1x2", "demo-brick-2x4"]}
        usedPartIds={["demo-tile-2x2", "demo-brick-2x4"]}
      />,
    );
    if (!screen.getByText("More filters").closest("details")?.open)
      await user.click(screen.getByText("More filters"));
    await user.click(screen.getByRole("button", { name: "Favorites" }));
    if (!screen.getByText("More filters").closest("details")?.open)
      await user.click(screen.getByText("More filters"));
    await user.click(screen.getByRole("checkbox", { name: "Currently used" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Part category" }), "tile");
    expect(addButtons()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add Smooth tile 2 × 2" })).toBeVisible();
    await user.type(screen.getByRole("textbox", { name: "Search part catalog" }), "not-a-part");
    expect(addButtons()).toHaveLength(0);
    expect(screen.getByText("No demo parts match “not-a-part”.")).toBeVisible();
    expect(screen.getByText("Favorites · Tiles · Currently used")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(addButtons()).toHaveLength(partDefinitions.length);
    expect(screen.getByRole("checkbox", { name: "Currently used" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "All parts" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Favorite Smooth tile 2 × 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("toggles favorites with keyboard without selecting a preview or nesting interactive buttons", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(),
      onFavoriteChange = vi.fn();
    render(<PartCatalog onAdd={onAdd} onFavoriteChange={onFavoriteChange} />);
    const favorite = screen.getByRole("button", { name: "Favorite Brick 2 × 4" });
    const add = screen.getByRole("button", { name: "Add Brick 2 × 4" });
    expect(add.contains(favorite)).toBe(false);
    expect(favorite.parentElement).toBe(add.parentElement);
    favorite.focus();
    await user.keyboard("{Enter}");
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(onFavoriteChange).toHaveBeenLastCalledWith(["demo-brick-2x4"]);
    expect(onAdd).not.toHaveBeenCalled();
    await user.keyboard(" ");
    expect(favorite).toHaveAttribute("aria-pressed", "false");
    expect(onFavoriteChange).toHaveBeenLastCalledWith([]);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("emits preview intent without changing supplied usage or recents; recents follow committed parent order", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(),
      onFavoriteChange = vi.fn();
    const usedPartIds = Object.freeze(["demo-plate-2x2"]);
    const recentPartIds = Object.freeze([] as string[]);
    const { rerender } = render(
      <PartCatalog
        onAdd={onAdd}
        colorId="teal"
        usedPartIds={usedPartIds}
        recentPartIds={recentPartIds}
        onFavoriteChange={onFavoriteChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add Brick 2 × 4" }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith("demo-brick-2x4", "teal");
    expect(onFavoriteChange).not.toHaveBeenCalled();
    expect(usedPartIds).toEqual(["demo-plate-2x2"]);
    expect(recentPartIds).toEqual([]);
    if (!screen.getByText("More filters").closest("details")?.open)
      await user.click(screen.getByText("More filters"));
    await user.click(screen.getByRole("button", { name: "Recent" }));
    expect(addButtons()).toHaveLength(0);
    expect(screen.getByText("Committed additions in this session, newest first.")).toBeVisible();
    expect(
      screen.getByText("Recent fills after a part is placed, not when its preview opens."),
    ).toBeVisible();
    rerender(
      <PartCatalog
        onAdd={onAdd}
        recentPartIds={["demo-tile-2x2", "unknown", "demo-brick-2x4", "demo-tile-2x2"]}
      />,
    );
    expect(addButtons().map((button) => button.getAttribute("aria-label"))).toEqual([
      "Add Smooth tile 2 × 2",
      "Add Brick 2 × 4",
    ]);
  });

  it("keeps controlled preferences and favorites with the parent and states actual geometry coverage", async () => {
    const user = userEvent.setup();
    const preferences: PartCatalogPreferences = {
      search: "",
      category: "all",
      collection: "all",
      usedOnly: false,
    };
    const onPreferencesChange = vi.fn(),
      onFavoriteChange = vi.fn();
    const { rerender } = render(
      <PartCatalog
        onAdd={vi.fn()}
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
        favoritePartIds={[]}
        onFavoriteChange={onFavoriteChange}
      />,
    );
    if (!screen.getByText("More filters").closest("details")?.open)
      await user.click(screen.getByText("More filters"));
    await user.click(screen.getByRole("button", { name: "Favorites" }));
    expect(onPreferencesChange).toHaveBeenCalledWith({ ...preferences, collection: "favorites" });
    expect(screen.getByRole("button", { name: "All parts" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Favorite Brick 2 × 4" }));
    expect(onFavoriteChange).toHaveBeenCalledWith(["demo-brick-2x4"]);
    expect(screen.getByRole("button", { name: "Favorite Brick 2 × 4" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    rerender(
      <PartCatalog onAdd={vi.fn()} preferences={{ ...preferences, search: "demo-slope-1x1" }} />,
    );
    expect(screen.getByText("Visual detail")).toBeVisible();
    expect(screen.queryByText("Volume check unavailable")).not.toBeInTheDocument();
    await user.click(screen.getByText("More colors"));
    expect(
      screen.getByText("Demo colors; manufactured color availability is unknown."),
    ).toBeVisible();
    rerender(
      <PartCatalog onAdd={vi.fn()} preferences={{ ...preferences, search: "demo-brick-2x4" }} />,
    );
    expect(screen.getByText("Connect supported")).toBeVisible();
    expect(screen.queryByText("Volume check supported")).not.toBeInTheDocument();
  });

  it("filters out visual-only details while retaining supported receiving parts", async () => {
    const user = userEvent.setup();
    render(<PartCatalog onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add Tower door leaf" })).toHaveTextContent(
      "Visual detail",
    );
    expect(screen.getByRole("button", { name: "Add Stone gate surround" })).toHaveTextContent(
      "Visual detail",
    );
    if (!screen.getByText("More filters").closest("details")?.open)
      await user.click(screen.getByText("More filters"));
    await user.click(screen.getByRole("checkbox", { name: "Connectable parts only" }));
    expect(screen.queryByRole("button", { name: "Add Tower door leaf" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Stone gate surround" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Brick 2 × 4" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add Smooth tile 2 × 2" })).toBeVisible();
    await user.type(screen.getByRole("textbox", { name: "Search part catalog" }), "door");
    expect(screen.getByRole("button", { name: "Add Door with frame 1 × 2 × 4" })).toHaveTextContent(
      "1.6 × 0.8 × 3.84 cm",
    );
  });
});
