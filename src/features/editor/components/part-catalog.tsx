"use client";
import { useState } from "react";
import { Plus, Search, Box } from "lucide-react";
import { getPartConnections } from "@/core/model/public";
import { partDefinitions, colors } from "@/fixtures/catalog";
import { PartPreview } from "./part-preview";
import { ColorPalette } from "./color-palette";
export function PartCatalog({
  onAdd,
  colorId,
  onColorChange,
  selectedPartId,
}: {
  onAdd: (partId: string, colorId: string) => void;
  colorId?: string;
  onColorChange?: (colorId: string) => void;
  selectedPartId?: string;
}) {
  const [search, setSearch] = useState("");
  const [localColor, setLocalColor] = useState("limestone");
  const color = colorId ?? localColor;
  const selectedColor = colors.find((item) => item.id === color) ?? colors[0];
  function changeColor(value: string) {
    setLocalColor(value);
    onColorChange?.(value);
  }
  const [shape, setShape] = useState("all");
  const filtered = partDefinitions.filter(
    (part) =>
      part.name.toLowerCase().includes(search.toLowerCase()) &&
      (shape === "all" ||
        part.shape === shape ||
        (shape === "architecture" &&
          ["arch", "arch-panel", "arch-spandrel"].includes(part.shape)) ||
        (shape === "nature" && ["leaf", "leaf-upright", "branch"].includes(part.shape)) ||
        (shape === "slope" && part.shape === "roof-tile") ||
        (shape === "cylinder" && part.shape === "planter")),
  );
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-md border border-control-border bg-background px-2.5">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          aria-label="Search part catalog"
          className="min-h-9 min-w-0 w-full bg-transparent text-xs"
          placeholder="Search parts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="min-w-0 space-y-1">
          <span className="block text-xs text-muted-foreground">Shape</span>
          <select
            aria-label="Part category"
            className="field min-h-9 px-2 py-1.5 text-xs"
            value={shape}
            onChange={(e) => setShape(e.target.value)}
          >
            <option value="all">All shapes</option>
            <option value="brick">Bricks</option>
            <option value="plate">Plates</option>
            <option value="slope">Roof pieces</option>
            <option value="cylinder">Round & pots</option>
            <option value="architecture">Arches</option>
            <option value="nature">Plants</option>
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
      <ColorPalette colorId={color} onChange={changeColor} label="New brick color" />
      <div className="flex flex-wrap items-center justify-between gap-1 border-t pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{filtered.length} parts</span>
        <span>W × D × H · studs</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((part) => (
          <button
            key={part.id}
            onClick={() => onAdd(part.id, color)}
            className="part-catalog-card group"
            aria-label={`Add ${part.name}`}
            aria-pressed={selectedPartId === part.id}
          >
            <span className="relative mb-2 flex h-[76px] items-center justify-center rounded-sm bg-background">
              <PartPreview part={part} color={selectedColor.hex} />
              <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-sm bg-surface/90 text-muted-foreground group-hover:text-primary">
                <Plus size={12} />
              </span>
            </span>
            <span className="block text-xs font-medium leading-snug">{part.name}</span>
            <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
              {part.width} × {part.depth} × {part.height}
            </span>
            <span className="mt-1.5 inline-flex rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {getPartConnections(part).receivesStuds ? "Stud mount" : "Detail"}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="notice">No demo parts match this search.</p>}
      <p className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
        <Box size={14} className="mt-0.5 shrink-0" />
        Original approximations, not verified manufacturer catalog parts.
      </p>
    </div>
  );
}
