"use client";
import { useState } from "react";
import { Plus, Search, Box } from "lucide-react";
import { partDefinitions, colors } from "@/fixtures/catalog";
export function PartCatalog({ onAdd }: { onAdd: (partId: string, colorId: string) => void }) {
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("limestone");
  const [shape, setShape] = useState("all");
  const filtered = partDefinitions.filter(
    (part) =>
      part.name.toLowerCase().includes(search.toLowerCase()) &&
      (shape === "all" || part.shape === shape),
  );
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-md border border-control-border bg-surface px-3">
        <Search size={15} />
        <input
          aria-label="Search part catalog"
          className="min-h-10 min-w-0 w-full bg-transparent text-sm"
          placeholder="Search demo parts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="sr-only">Part category</span>
          <select
            className="field px-2 text-xs"
            value={shape}
            onChange={(e) => setShape(e.target.value)}
          >
            <option value="all">All shapes</option>
            <option value="brick">Bricks</option>
            <option value="plate">Plates</option>
            <option value="slope">Slopes</option>
            <option value="cylinder">Round</option>
          </select>
        </label>
        <label>
          <span className="sr-only">New part color</span>
          <select
            className="field px-2 text-xs"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            {colors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Add to the designated open workspace position. No snapping or collision check.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((part) => (
          <button
            key={part.id}
            onClick={() => onAdd(part.id, color)}
            className="group rounded-md border bg-surface p-3 text-left hover:border-primary"
            aria-label={`Add ${part.name}`}
          >
            <span className="relative mb-3 flex h-14 items-center justify-center rounded-sm bg-background">
              <span
                className="flex -skew-y-6 gap-1 rounded-sm border border-foreground/20 px-2 py-1.5 shadow-sm"
                style={{ backgroundColor: colors.find((item) => item.id === color)?.hex }}
              >
                {Array.from({ length: Math.min(4, part.width) }, (_, i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full border border-foreground/20 bg-surface/30"
                  />
                ))}
              </span>
              <Plus className="absolute right-0 top-0 text-primary" size={14} />
            </span>
            <span className="block text-xs font-medium">{part.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {part.width} × {part.depth} studs
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="notice">No demo parts match this search.</p>}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Box size={15} className="shrink-0" />
        Original approximations, not verified manufacturer catalog parts.
      </p>
    </div>
  );
}
