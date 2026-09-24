"use client";
import { useState } from "react";
import { Plus, Search, Box, Star } from "lucide-react";
import {
  getPartConnections,
  formatCentimeters,
  hasSupportedDiagnosticGeometry,
  type PartDefinition,
} from "@/core/model/public";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { PartPreview } from "./part-preview";
import { ColorPalette } from "./color-palette";

const categories = [
  { id: "brick", label: "Bricks & details", terms: "bricks blocks details" },
  { id: "plate", label: "Plates", terms: "plates" },
  { id: "tile", label: "Tiles", terms: "tiles smooth" },
  { id: "slope", label: "Roof pieces", terms: "roof roofing slopes" },
  { id: "cylinder", label: "Round & pots", terms: "round pots cylinders planters" },
  { id: "architecture", label: "Doors & arches", terms: "arch arches architecture" },
  { id: "nature", label: "Plants", terms: "plants nature leaves branches" },
] as const;
type PartCategory = (typeof categories)[number]["id"];
export interface PartCatalogPreferences {
  readonly search: string;
  readonly category: "all" | PartCategory;
  readonly collection: "all" | "favorites" | "recent";
  readonly usedOnly: boolean;
  readonly connectableOnly?: boolean;
}
const defaultPreferences: PartCatalogPreferences = {
  search: "",
  category: "all",
  collection: "all",
  usedOnly: false,
  connectableOnly: false,
};

function belongsToCategory(part: PartDefinition, category: PartCategory): boolean {
  switch (category) {
    case "brick":
      return part.shape === "brick";
    case "plate":
      return part.shape === "plate" && part.studs;
    case "tile":
      return part.id.startsWith("demo-tile-");
    case "slope":
      return ["slope", "roof-tile"].includes(part.shape) || part.id === "demo-roof-ridge";
    case "cylinder":
      return ["cylinder", "planter"].includes(part.shape);
    case "architecture":
      return ["arch", "arch-panel", "arch-spandrel", "door-assembly"].includes(part.shape);
    case "nature":
      return (
        ["leaf", "leaf-upright", "branch"].includes(part.shape) ||
        part.id.startsWith("demo-cactus-")
      );
  }
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/(\d)\s*x\s*(?=\d)/g, "$1x")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const catalog = partDefinitions.map((part) => {
  const tags = categories.filter((category) => belongsToCategory(part, category.id));
  const diagnosticSupported = hasSupportedDiagnosticGeometry(part);
  const connectable = diagnosticSupported && getPartConnections(part).receivers.length > 0;
  return {
    part,
    categories: tags.map((category) => category.id),
    search: normalizeSearch(
      [part.name, part.id, part.shape, ...tags.map((category) => category.terms)].join(" "),
    ),
    connectable,
    diagnosticSupported,
  };
});
const availableCategories = categories.filter((category) =>
  catalog.some((item) => item.categories.includes(category.id)),
);

export function PartCatalog({
  onAdd,
  colorId,
  onColorChange,
  selectedPartId,
  usedPartIds = [],
  recentPartIds = [],
  favoritePartIds,
  onFavoriteChange,
  preferences,
  onPreferencesChange,
}: {
  onAdd: (partId: string, colorId: string) => void;
  colorId?: string;
  onColorChange?: (colorId: string) => void;
  selectedPartId?: string;
  usedPartIds?: readonly string[];
  /** Most recently committed additions first. Previewing never updates this list. */
  recentPartIds?: readonly string[];
  favoritePartIds?: readonly string[];
  onFavoriteChange?: (partIds: readonly string[]) => void;
  preferences?: PartCatalogPreferences;
  onPreferencesChange?: (preferences: PartCatalogPreferences) => void;
}) {
  const [localPreferences, setLocalPreferences] = useState(defaultPreferences);
  const [localFavorites, setLocalFavorites] = useState<readonly string[]>([]);
  const [localColor, setLocalColor] = useState("limestone");
  const filters = preferences ?? localPreferences;
  const favorites = favoritePartIds ?? localFavorites;
  const color = colorId ?? localColor;
  const selectedColor = colors.find((item) => item.id === color) ?? colors[0];
  function changeFilters(update: Partial<PartCatalogPreferences>) {
    const next = { ...filters, ...update };
    if (!preferences) setLocalPreferences(next);
    onPreferencesChange?.(next);
  }
  function toggleFavorite(partId: string) {
    const next = favorites.includes(partId)
      ? favorites.filter((id) => id !== partId)
      : [...favorites, partId];
    if (!favoritePartIds) setLocalFavorites(next);
    onFavoriteChange?.(next);
  }
  function changeColor(value: string) {
    setLocalColor(value);
    onColorChange?.(value);
  }
  const terms = normalizeSearch(filters.search).split(" ").filter(Boolean);
  const used = new Set(usedPartIds);
  const favorite = new Set(favorites);
  const recentOrder = new Map([...new Set(recentPartIds)].map((id, index) => [id, index]));
  const filtered = catalog.filter(
    (item) =>
      terms.every((term) => item.search.includes(term)) &&
      (filters.category === "all" || item.categories.includes(filters.category)) &&
      (!filters.usedOnly || used.has(item.part.id)) &&
      (!filters.connectableOnly || item.connectable) &&
      (filters.collection === "all" ||
        (filters.collection === "favorites"
          ? favorite.has(item.part.id)
          : recentOrder.has(item.part.id))),
  );
  if (filters.collection === "recent")
    filtered.sort((a, b) => recentOrder.get(a.part.id)! - recentOrder.get(b.part.id)!);
  const categoryLabel =
    availableCategories.find((category) => category.id === filters.category)?.label ?? "All shapes";
  const collectionLabel = { all: "All parts", favorites: "Favorites", recent: "Recent" }[
    filters.collection
  ];
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-md border border-control-border bg-background px-2.5">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          aria-label="Search part catalog"
          className="min-h-9 min-w-0 w-full bg-transparent text-xs"
          placeholder="Name, ID or category…"
          value={filters.search}
          onChange={(e) => changeFilters({ search: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="min-w-0 space-y-1">
          <span className="block text-xs text-muted-foreground">Category</span>
          <select
            aria-label="Part category"
            className="field min-h-9 px-2 py-1.5 text-xs"
            value={filters.category}
            onChange={(e) =>
              changeFilters({ category: e.target.value as PartCatalogPreferences["category"] })
            }
          >
            <option value="all">All shapes</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1">
          <span className="block text-xs text-muted-foreground">Finish</span>
          <select
            aria-label="New part color"
            className="field min-h-9 px-2 py-1.5 text-xs"
            value={color}
            onChange={(e) => changeColor(e.target.value)}
          >
            {colors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-x-3 text-xs">
        <details className="min-w-0 flex-1 open:basis-full">
          <summary className="cursor-pointer py-2">More filters</summary>
          <label className="flex min-h-10 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={filters.connectableOnly ?? false}
              onChange={(event) => changeFilters({ connectableOnly: event.target.checked })}
            />
            Connectable parts only
          </label>
          <p className="text-xs text-muted-foreground">
            Connect uses supported underside sockets and overlap checks. Visual details have no
            supported attachment.
          </p>
          <div className="grid grid-cols-3 gap-1" role="group" aria-label="Catalog collection">
            {(["all", "favorites", "recent"] as const).map((collection) => (
              <button
                key={collection}
                type="button"
                className="button min-h-10 px-1 text-xs aria-pressed:border-primary aria-pressed:bg-primary-muted"
                aria-pressed={filters.collection === collection}
                onClick={() => changeFilters({ collection })}
              >
                {{ all: "All parts", favorites: "Favorites", recent: "Recent" }[collection]}
              </button>
            ))}
          </div>
          <label className="flex min-h-10 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={filters.usedOnly}
              onChange={(event) => changeFilters({ usedOnly: event.target.checked })}
            />
            Currently used
          </label>
          {filters.collection === "recent" && (
            <p className="text-xs text-muted-foreground">
              Committed additions in this session, newest first.
            </p>
          )}
        </details>
        <details className="min-w-0 flex-1 open:basis-full">
          <summary className="cursor-pointer py-2">More colors</summary>
          <ColorPalette colorId={color} onChange={changeColor} label="New brick color" />
          <p className="text-xs text-muted-foreground">
            Demo colors; manufactured color availability is unknown.
          </p>
        </details>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 border-t pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {filtered.length} {filtered.length === 1 ? "part" : "parts"}
        </span>
        <span>W × D × H · cm</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map(({ part, connectable }) => (
          <div key={part.id} className="relative min-w-0">
            <button
              type="button"
              onClick={() => onAdd(part.id, color)}
              className="part-catalog-card group h-full w-full"
              aria-label={`Add ${part.name}`}
              aria-pressed={selectedPartId === part.id}
            >
              <span className="relative mb-2 flex h-[76px] items-center justify-center rounded-sm bg-background">
                <PartPreview part={part} color={selectedColor.hex} />
                <span className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-sm bg-surface/90 text-muted-foreground group-hover:text-primary">
                  <Plus size={12} />
                </span>
              </span>
              <span className="block text-xs font-medium leading-snug">{part.name}</span>
              <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                {formatCentimeters(part.width)} × {formatCentimeters(part.depth)} ×{" "}
                {formatCentimeters(part.height)} cm
              </span>
              <span className="mt-1.5 inline-flex rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {connectable ? "Connect supported" : "Visual detail"}
              </span>
            </button>
            <button
              type="button"
              className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md border border-control-border bg-surface text-muted-foreground hover:text-primary aria-pressed:border-primary aria-pressed:text-primary"
              aria-label={`Favorite ${part.name}`}
              aria-pressed={favorite.has(part.id)}
              title={favorite.has(part.id) ? "Remove from favorites" : "Add to favorites"}
              onClick={() => toggleFavorite(part.id)}
            >
              <Star size={16} fill={favorite.has(part.id) ? "currentColor" : "none"} />
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="notice">
          <p>
            No demo parts match {filters.search ? `“${filters.search}”` : "the current filters"}.
          </p>
          <p className="mt-2 text-xs">
            {collectionLabel} · {categoryLabel}
            {filters.usedOnly ? " · Currently used" : ""}
            {filters.connectableOnly ? " · Connectable" : ""}
          </p>
          <p className="mt-2 text-xs">
            {filters.collection === "favorites" && favorites.length === 0
              ? "Mark a part with its Favorite button in All parts."
              : filters.collection === "recent" && recentOrder.size === 0
                ? "Recent fills after a part is placed, not when its preview opens."
                : filters.usedOnly && used.size === 0
                  ? "The current model has no catalog parts yet."
                  : "Try “Brick”, “Plate”, or “Tile”."}
          </p>
          <button className="button mt-2" onClick={() => changeFilters(defaultPreferences)}>
            Clear filters
          </button>
        </div>
      )}
      <p className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
        <Box size={14} className="mt-0.5 shrink-0" />
        Original approximations, not verified manufacturer catalog parts.
      </p>
    </div>
  );
}
