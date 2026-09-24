"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, Box, ArrowLeft } from "lucide-react";
import { useProject } from "@/features/editor/state/session";
import { deriveBom, missingQuantity } from "@/core/model/public";
import { colors, partDefinitions } from "@/fixtures/catalog";
import { ProjectNavigation } from "@/components/shell/project-navigation";
import { PageHeading } from "@/components/shell/app-shell";
export function Inventory() {
  const { id, model, invalid, loadError } = useProject();
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("all");
  const [view, setView] = useState("required");
  const [descending, setDescending] = useState(false);
  if (!model)
    return (
      <div className="page-wrap" role="status">
        {loadError || "Opening parts inventory…"}
      </div>
    );
  const lines = deriveBom(model).map((line) => ({
    ...line,
    owned: Math.min(line.quantity, 3),
    missing: missingQuantity(line.quantity, 3),
  }));
  const filtered = lines
    .filter(
      (line) =>
        (color === "all" || line.colorId === color) &&
        (view !== "missing" || line.missing > 0) &&
        (view !== "owned" || line.owned > 0) &&
        `${line.partId} ${partDefinitions.find((p) => p.id === line.partId)?.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => (descending ? b.quantity - a.quantity : a.partId.localeCompare(b.partId)));
  return (
    <>
      <ProjectNavigation id={id} active="inventory" />
      <div className="page-wrap">
        <PageHeading
          eyebrow="Every piece has a place"
          title="The parts behind your idea"
          description={`${model.title} · ${model.revision}`}
          action={
            <Link href={`/editor/?project=${id}`} className="button">
              <ArrowLeft size={16} />
              Back to workbench
            </Link>
          }
        />
        {invalid && <p className="notice mb-4">Unknown project. Showing the courtyard sample.</p>}
        <div className="mb-7 grid grid-cols-3 border-y py-5">
          <div>
            <p className="eyebrow">Required</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums" data-testid="inventory-total">
              {model.instances.length}
              <span className="ml-2 text-xs font-normal text-muted-foreground">pieces</span>
            </p>
          </div>
          <div className="border-l pl-5">
            <p className="eyebrow">Part / color pairs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{lines.length}</p>
          </div>
          <div className="border-l pl-5">
            <p className="eyebrow">Missing · example</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {lines.reduce((n, l) => n + l.missing, 0)}
            </p>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Required quantities come from your current logical model. Owned quantities are
          illustrative (up to three per row), not your actual collection. Prices and availability
          are unknown.
        </p>
        <div className="mb-5 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-md border border-control-border bg-surface px-3">
            <Search size={16} />
            <input
              aria-label="Search inventory"
              className="min-h-11 min-w-0 bg-transparent text-sm"
              placeholder="Find a demo part…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter inventory color</span>
            <select className="field" value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="all">All colors</option>
              {colors.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Inventory view</span>
            <select className="field" value={view} onChange={(e) => setView(e.target.value)}>
              <option value="required">Required pieces</option>
              <option value="owned">Illustrative owned</option>
              <option value="missing">Missing pieces</option>
            </select>
          </label>
          <button
            className="button ml-auto"
            aria-pressed={descending}
            onClick={() => setDescending((value) => !value)}
          >
            <ArrowUpDown size={16} />
            {descending ? "Quantity order" : "Part order"}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Derived parts inventory for {model.title}, {model.revision}
            </caption>
            <thead className="border-b bg-surface-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="p-4">
                  Demo part
                </th>
                <th scope="col" className="p-4">
                  Color
                </th>
                <th scope="col" className="p-4 text-right">
                  Required
                </th>
                <th scope="col" className="p-4 text-right">
                  Owned*
                </th>
                <th scope="col" className="p-4 text-right">
                  Missing*
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((line) => {
                const color = colors.find((c) => c.id === line.colorId);
                return (
                  <tr
                    key={`${line.partId}-${line.colorId}`}
                    className="border-b last:border-0 hover:bg-background"
                  >
                    <th scope="row" className="p-4 font-normal">
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-background">
                          <Box size={23} style={{ color: color?.hex }} strokeWidth={2.5} />
                        </span>
                        <div>
                          <span className="font-medium">
                            {partDefinitions.find((p) => p.id === line.partId)?.name}
                          </span>
                          <span className="mt-1 block font-mono text-xs text-muted-foreground">
                            {line.partId}
                          </span>
                        </div>
                      </div>
                    </th>
                    <td className="p-4">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span
                          className="size-3 rounded-full border border-control-border"
                          style={{ backgroundColor: color?.hex }}
                        />
                        {color?.name}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium tabular-nums">{line.quantity}</td>
                    <td className="p-4 text-right tabular-nums text-muted-foreground">
                      {line.owned}
                    </td>
                    <td className="p-4 text-right tabular-nums">{line.missing}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <Box className="mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg">
                {model.instances.length
                  ? "No parts match these filters."
                  : "Your first brick is waiting."}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {model.instances.length
                  ? "Try another color or search."
                  : "Add a supported part in the workbench to begin."}
              </p>
              <button
                className="button mt-5"
                onClick={() => {
                  setColor("all");
                  setSearch("");
                  setView("required");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          *Illustrative inventory only. Demo geometry and part identifiers are unverified catalog
          information.
        </p>
      </div>
    </>
  );
}
