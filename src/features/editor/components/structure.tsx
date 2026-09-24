"use client";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
  Layers3,
  ChevronRight,
  Search,
} from "lucide-react";
import type { Model } from "@/core/model/public";
import { partDefinitions, colors } from "@/fixtures/catalog";
export function Structure({
  model,
  hidden,
  selected,
  onSelect,
  onVisibility,
  onProtection,
}: {
  model: Model;
  hidden: readonly string[];
  selected: string | null;
  onSelect: (id: string) => void;
  onVisibility: (groupId: string) => void;
  onProtection: (groupId: string, value: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  return (
    <div>
      <label className="mb-4 flex items-center gap-2 rounded-md border border-control-border px-3">
        <Search size={14} />
        <input
          className="min-h-10 min-w-0 w-full bg-transparent text-xs"
          aria-label="Search model structure"
          placeholder="Find a part or assembly…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="space-y-1.5">
        {model.groups.map((group) => {
          const parts = model.instances.filter((part) => part.groupId === group.id);
          const matching = parts.filter(
            (part) =>
              !query ||
              `${group.name} ${part.id} ${part.colorId} ${partDefinitions.find((definition) => definition.id === part.partId)?.name}`
                .toLowerCase()
                .includes(query),
          );
          if (query && !matching.length) return null;
          const active = parts.some((part) => part.id === selected);
          const isOpen = expanded.includes(group.id) || Boolean(query);
          return (
            <div
              key={group.id}
              className={`overflow-hidden rounded-md border ${active ? "border-primary/50 bg-primary-muted/40" : "border-transparent"}`}
            >
              <div className="flex items-center gap-0.5 py-1 pr-1">
                <button
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm hover:bg-surface-muted"
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${group.name}`}
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpanded((items) =>
                      items.includes(group.id)
                        ? items.filter((id) => id !== group.id)
                        : [...items, group.id],
                    )
                  }
                >
                  <ChevronRight size={13} className={isOpen ? "rotate-90" : ""} />
                </button>
                <Layers3 size={14} className="shrink-0 text-muted-foreground" />
                <button
                  className="flex min-h-9 min-w-0 flex-1 items-center px-1.5 text-left text-xs font-medium"
                  disabled={!parts.length}
                  onClick={() => onSelect(parts[0].id)}
                  aria-label={`Select ${group.name}`}
                >
                  <span className="min-w-0 truncate">{group.name}</span>
                  <span className="ml-1.5 shrink-0 font-normal text-muted-foreground">
                    {parts.length}
                  </span>
                </button>
                <button
                  className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-muted"
                  onClick={() => onProtection(group.id, !group.protected)}
                  aria-label={`${group.protected ? "Unprotect" : "Protect"} ${group.name}`}
                  title={group.protected ? "Protected — unlock to edit" : "Protect this assembly"}
                >
                  {group.protected ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}
                </button>
                <button
                  className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-muted"
                  onClick={() => onVisibility(group.id)}
                  aria-label={`${hidden.includes(group.id) ? "Show" : "Hide"} ${group.name}`}
                  aria-pressed={!hidden.includes(group.id)}
                >
                  {hidden.includes(group.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {isOpen && (
                <div className="max-h-64 space-y-0.5 overflow-y-auto border-t p-1.5">
                  {matching.map((part) => (
                    <button
                      key={part.id}
                      onClick={() => onSelect(part.id)}
                      aria-pressed={selected === part.id}
                      className={`flex min-h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-xs ${selected === part.id ? "bg-primary-muted text-primary" : "hover:bg-surface-muted"}`}
                    >
                      <span
                        className="size-3 shrink-0 rounded-sm border border-foreground/20"
                        style={{
                          backgroundColor: colors.find((color) => color.id === part.colorId)?.hex,
                        }}
                      />
                      <span className="min-w-0 truncate">{part.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {query &&
          !model.instances.some((part) =>
            `${model.groups.find((group) => group.id === part.groupId)?.name} ${part.id} ${part.colorId} ${partDefinitions.find((definition) => definition.id === part.partId)?.name}`
              .toLowerCase()
              .includes(query),
          ) && <p className="py-4 text-xs text-muted-foreground">No parts match this search.</p>}
      </div>
      <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <LockKeyhole size={13} className="mt-0.5 shrink-0" />
        Unlock protected assemblies before making changes. Expand an assembly to select individual
        bricks.
      </p>
    </div>
  );
}
