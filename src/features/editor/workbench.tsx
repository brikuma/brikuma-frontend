"use client";
import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Download,
  Info,
  CircleDashed,
  Plus,
  X,
  RotateCw,
  Maximize2,
} from "lucide-react";
import { useProject } from "./state/session";
import { PartCatalog } from "./components/part-catalog";
import { Structure } from "./components/structure";
import { SelectionInspector } from "./components/selection-inspector";
import { ModelViewport } from "./components/model-viewport";
import { AssistantPreview } from "@/features/ai-preview/assistant-preview";
import { ProjectNavigation } from "@/components/shell/project-navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { partDefinitions, editPolicy, colors } from "@/fixtures/catalog";
import { getPartConnections, type GridTransform, type QuarterTurn } from "@/core/model/public";
import { PartPreview } from "./components/part-preview";
import { PartDimensions } from "./components/part-dimensions";
import type { PlacementPreview } from "./viewport-types";
import { snapPlacementCenter } from "./placement-grid";
import { placementFeedback } from "./placement-feedback";

type Placement = PlacementPreview;

function PlacementFields({
  placement,
  onChange,
  onPlace,
  onCancel,
  onColorChange,
  onTargetChange,
}: {
  placement: Placement;
  onChange: (transform: GridTransform) => void;
  onPlace: (transform: GridTransform) => boolean;
  onCancel: () => void;
  onColorChange: (colorId: string) => void;
  onTargetChange: (target: "surface" | "ground" | "free") => void;
}) {
  const [position, setPosition] = useState({
    x: String(placement.transform.x),
    y: String(placement.transform.y),
    z: String(placement.transform.z),
  });
  const definition = partDefinitions.find((part) => part.id === placement.partId);
  return (
    <section
      className="rounded-lg border border-primary/30 bg-primary-muted/30 p-3"
      aria-label="Pending brick placement"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-primary">Place {definition?.name}</p>
        <button
          aria-label="Cancel placement"
          className="flex size-7 items-center justify-center rounded-sm hover:bg-surface"
          onClick={onCancel}
        >
          <X size={14} />
        </button>
      </div>
      {definition && (
        <div className="mb-3 flex items-center gap-2">
          <div className="h-10 w-12 shrink-0">
            <PartPreview
              part={definition}
              color={colors.find((color) => color.id === placement.colorId)?.hex ?? colors[0].hex}
            />
          </div>
          <div className="min-w-0 flex-1">
            <PartDimensions
              part={definition}
              rotation={placement.transform.rotation}
              label="Placement dimensions"
            />
          </div>
        </div>
      )}
      <label className="mb-2 flex items-center gap-2 text-xs font-medium">
        Color
        <select
          aria-label="Pending brick color"
          className="field min-h-9 flex-1 py-1 text-xs"
          value={placement.colorId}
          onChange={(event) => onColorChange(event.target.value)}
        >
          {colors.map((color) => (
            <option key={color.id} value={color.id}>
              {color.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mb-3 min-w-0">
        <legend className="sr-only">Placement surface</legend>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-surface/70 p-1">
          {(
            [
              ["surface", "Snap to studs"],
              ["free", "Free"],
              ["ground", "Ground plane"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              title={
                value === "ground"
                  ? "Use the ground grid even when pointing at another part"
                  : value === "free"
                    ? "Place freely without matching connectors"
                    : "Align the underside sockets to matching top studs"
              }
              onClick={() => onTargetChange(value)}
              aria-pressed={(placement.target ?? "surface") === value}
              className={`min-h-8 rounded-sm px-1 text-xs ${(placement.target ?? "surface") === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onPlace({
            ...placement.transform,
            x: Number(position.x),
            y: Number(position.y),
            z: Number(position.z),
          });
        }}
      >
        <p className="mb-1.5 text-xs text-muted-foreground">Center position · studs</p>
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis} className="text-xs uppercase text-muted-foreground">
              {axis}
              <input
                aria-label={`Placement ${axis.toUpperCase()}`}
                required
                type="number"
                min={axis === "y" ? 0 : -editPolicy.bounds}
                max={editPolicy.bounds}
                step={axis === "y" ? 0.05 : 0.1}
                value={position[axis]}
                className="field mt-1 min-h-9 px-2 py-1 font-mono text-xs"
                onChange={(event) => setPosition({ ...position, [axis]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="submit" variant="primary" className="flex-1 px-2">
            <Plus size={14} />
            Place brick
          </Button>
          <button
            type="button"
            className="button px-3"
            aria-label="Rotate pending brick"
            title="Rotate 90°"
            onClick={() =>
              onChange({
                ...placement.transform,
                rotation: ((placement.transform.rotation + 90) % 360) as QuarterTurn,
              })
            }
          >
            <RotateCw size={16} />
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        {placement.transform.rotation}° · Escape cancels
      </p>
    </section>
  );
}

export function Workbench() {
  const project = useProject();
  const { model, entry, id, command, history, reset, message } = project;
  const [resetOpen, setResetOpen] = useState(false);
  const [tab, setTab] = useState("Structure");
  const [inspector, setInspector] = useState("Selection");
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [pending, setPending] = useState<(Placement & { projectId: string }) | null>(null);
  const [catalogColor, setCatalogColor] = useState("limestone");
  const [note, setNote] = useState("");
  const [placementError, setPlacementError] = useState("");
  const placement = pending?.projectId === id ? pending : null;
  if (!model || !entry)
    return (
      <div className="page-wrap" role="status">
        {project.loadError || "Opening your local workspace…"}
      </div>
    );
  const selection = model.instances.some((part) => part.id === selected)
    ? selected
    : project.focus === "roof"
      ? (model.instances.find((part) => part.groupId === "roof")?.id ?? null)
      : null;
  function select(partId: string) {
    setSelected(partId);
    setInspector("Selection");
    const groupId = model?.instances.find((part) => part.id === partId)?.groupId;
    if (groupId) setHidden((groups) => groups.filter((group) => group !== groupId));
  }
  function cancelPlacement() {
    setPending(null);
    setPlacementError("");
  }
  function choosePart(partId: string, colorId: string) {
    setPlacementError("");
    const definition = partDefinitions.find((part) => part.id === partId);
    if (!definition) return;
    setPending({
      projectId: id,
      partId,
      colorId,
      target: getPartConnections(definition).receivesStuds ? "surface" : "free",
      transform: {
        ...snapPlacementCenter({ x: 0, z: model?.id === "blank" ? 0 : 16 }, definition, 0),
        y: definition.height / 2,
        rotation: 0,
      },
    });
    setTab("Parts");
  }
  function place(transform: GridTransform) {
    if (!model || !entry || !placement) return false;
    const feedback = placementFeedback(model, partDefinitions, { ...placement, transform });
    if (!feedback.allowed) {
      setPlacementError(feedback.message);
      return false;
    }
    setPlacementError("");
    const instanceId = `added-${entry.session.nextRevision}`;
    const selectedGroup = model.groups.find(
      (group) =>
        group.id === model.instances.find((part) => part.id === selection)?.groupId &&
        !group.protected,
    );
    const group =
      selectedGroup ?? model.groups.find((group) => !group.protected) ?? model.groups[0];
    const ok = command({
      type: "add",
      instance: {
        id: instanceId,
        partId: placement.partId,
        colorId: placement.colorId,
        groupId: group.id,
        transform,
      },
    });
    if (ok) {
      cancelPlacement();
      setHidden((groups) => groups.filter((groupId) => groupId !== group.id));
      select(instanceId);
      setLeftOpen(false);
    }
    return ok;
  }
  function duplicate(partId: string) {
    if (!model || !entry) return;
    const part = model.instances.find((item) => item.id === partId);
    if (!part) return;
    const definition = partDefinitions.find((item) => item.id === part.partId);
    const offset =
      part.transform.rotation % 180 === 0 ? (definition?.width ?? 1) : (definition?.depth ?? 1);
    const newId = `added-${entry.session.nextRevision}`;
    const ok = command({
      type: "duplicate",
      id: partId,
      newId,
      transform: { ...part.transform, x: part.transform.x + Math.ceil(offset * 2) / 2 },
    });
    if (ok) {
      setHidden((groups) => groups.filter((groupId) => groupId !== part.groupId));
      select(newId);
    }
  }
  function changePlacement(transform: GridTransform) {
    setPlacementError("");
    setPending((current) => (current ? { ...current, transform } : null));
  }
  function changeCatalogColor(colorId: string) {
    setCatalogColor(colorId);
    setPending((current) => (current ? { ...current, colorId } : null));
  }
  function shortcut(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]'))
    )
      return;
    if (event.key === "Escape" && placement) {
      cancelPlacement();
      return;
    }
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input,textarea,select,[contenteditable]")
    )
      return;
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === "z") {
      event.preventDefault();
      history(event.shiftKey ? "redo" : "undo");
      return;
    }
    if (event.key === "Escape" && leftCollapsed && rightCollapsed) {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (key === "r") {
      event.preventDefault();
      if (placement)
        changePlacement({
          ...placement.transform,
          rotation: ((placement.transform.rotation + 90) % 360) as QuarterTurn,
        });
      else if (selection) command({ type: "rotate", id: selection, quarterTurns: 1 });
    }
    if (!selection || placement) return;
    if (key === "d" && event.shiftKey) {
      event.preventDefault();
      duplicate(selection);
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      command({ type: "remove", id: selection });
    }
    if (event.target instanceof HTMLElement && event.target.closest("button,a,summary")) return;
    const step = event.shiftKey ? 1 : 0.5;
    const moves: Record<string, { x: number; y: number; z: number }> = {
      ArrowLeft: { x: -step, y: 0, z: 0 },
      ArrowRight: { x: step, y: 0, z: 0 },
      ArrowUp: { x: 0, y: 0, z: -step },
      ArrowDown: { x: 0, y: 0, z: step },
      PageUp: { x: 0, y: 0.2, z: 0 },
      PageDown: { x: 0, y: -0.2, z: 0 },
    };
    if (moves[event.key]) {
      event.preventDefault();
      command({ type: "translate", id: selection, delta: moves[event.key] });
    }
  }
  const left = (
    <div className="min-h-0">
      <div className="flex border-b px-2">
        {["Parts", "Structure", "Brief"].map((item) => (
          <button
            key={item}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className={`min-h-12 flex-1 border-b-2 text-xs ${tab === item ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="space-y-4 p-3">
        {placement && (
          <PlacementFields
            key={`${placement.partId}-${placement.transform.x}-${placement.transform.y}-${placement.transform.z}`}
            placement={placement}
            onChange={changePlacement}
            onPlace={place}
            onCancel={cancelPlacement}
            onColorChange={changeCatalogColor}
            onTargetChange={(target) => {
              setPlacementError("");
              setPending((current) =>
                current
                  ? {
                      ...current,
                      target,
                      transform:
                        target === "ground"
                          ? {
                              ...current.transform,
                              y:
                                (partDefinitions.find((part) => part.id === current.partId)
                                  ?.height ?? 0) / 2,
                            }
                          : current.transform,
                    }
                  : null,
              );
            }}
          />
        )}
        {tab === "Parts" ? (
          <PartCatalog
            onAdd={choosePart}
            colorId={catalogColor}
            onColorChange={changeCatalogColor}
            selectedPartId={placement?.partId}
          />
        ) : tab === "Structure" ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Model structure</p>
              <span className="text-xs text-muted-foreground">{model.groups.length} groups</span>
            </div>
            <Structure
              model={model}
              selected={selection}
              onSelect={select}
              hidden={hidden}
              onVisibility={(groupId) =>
                setHidden((groups) =>
                  groups.includes(groupId)
                    ? groups.filter((group) => group !== groupId)
                    : [...groups, groupId],
                )
              }
              onProtection={(groupId, value) =>
                command({ type: "set-protection", groupId, protected: value })
              }
            />
            <Button className="w-full" onClick={() => setTab("Parts")}>
              <Plus size={15} />
              Add a brick
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="eyebrow mb-2">Design intention</p>
              <h2 className="text-lg">{id === "blank" ? "An open exploration" : model.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {id === "masseria"
                  ? "A sunlit courtyard with quiet proportions, textured limestone and a roof of warm terracotta."
                  : "Explore form and color with original demo bricks."}
              </p>
            </div>
            <label className="block text-xs font-medium">
              Your session note
              <textarea
                className="field mt-2 min-h-28"
                placeholder="What would you like to explore?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Notes remain while this editor is open. They do not generate or validate a model.
            </p>
            <Link href="/new/" className="button w-full">
              Open project brief
            </Link>
          </div>
        )}
      </div>
    </div>
  );
  const right = (
    <div className="min-h-0">
      <div className="flex border-b px-2">
        {["Selection", "Checks", "Activity"].map((item) => (
          <button
            key={item}
            aria-pressed={inspector === item}
            onClick={() => setInspector(item)}
            className={`min-h-12 flex-1 border-b-2 text-xs ${inspector === item ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="p-4">
        {inspector === "Selection" ? (
          <SelectionInspector
            model={model}
            selected={selection}
            onSelect={select}
            command={command}
            onDuplicate={duplicate}
            onOpenCatalog={() => {
              setTab("Parts");
              setLeftCollapsed(false);
              if (!window.matchMedia("(min-width: 1024px)").matches) setLeftOpen(true);
            }}
          />
        ) : inspector === "Checks" ? (
          <>
            <h2 className="mb-2 text-base">Model checks</h2>
            <p className="mb-5 text-xs text-muted-foreground">
              No analysis has run. These capabilities are outside this preview.
            </p>
            {[
              "Collision checks",
              "Connection checks",
              "Stability assessment",
              "Build-order assessment",
              "Physical testing",
            ].map((label) => (
              <div key={label} className="flex items-center gap-2 border-b py-3 text-xs">
                <CircleDashed size={14} className="text-muted-foreground" />
                <span>{label}</span>
                <span className="ml-auto text-muted-foreground">Not run</span>
              </div>
            ))}
            <p className="mt-4 text-xs text-muted-foreground">
              Baseline: {model.baselineRevision}.{" "}
              {model.revision !== model.baselineRevision
                ? "The model has changed; baseline examples are out of date."
                : "No engineering result or certification is implied."}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-base">Local edit history</h2>
            <p className="mt-3 text-sm">{entry.session.past.length} undoable changes</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{model.revision}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Undo and redo restore whole model revisions. Reloading the page resets this local
              session.
            </p>
          </>
        )}
      </div>
    </div>
  );
  return (
    <div
      className="workbench-shell"
      data-focused={leftCollapsed && rightCollapsed}
      onKeyDown={shortcut}
    >
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-surface px-4 py-1.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{model.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Design workspace <span className="mx-1">·</span>
            <span>{model.instances.length.toLocaleString("en")} parts</span>
          </p>
        </div>
        <ProjectNavigation id={id} active="editor" />
        <div className="flex items-center gap-0.5">
          <button
            className="icon-button"
            aria-label="Undo local edit"
            title="Undo (⌘/Ctrl Z)"
            disabled={!entry.session.past.length}
            onClick={() => history("undo")}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo local edit"
            title="Redo (⌘/Ctrl Shift Z)"
            disabled={!entry.session.future.length}
            onClick={() => history("redo")}
          >
            <Redo2 size={16} />
          </button>
          <span className="mx-1 hidden h-5 border-l lg:block" />
          <button
            className="icon-button hidden lg:inline-flex"
            aria-label="Focus canvas"
            aria-pressed={leftCollapsed && rightCollapsed}
            title="Expand the canvas by hiding both panels"
            onClick={() => {
              const collapse = !(leftCollapsed && rightCollapsed);
              setLeftCollapsed(collapse);
              setRightCollapsed(collapse);
            }}
          >
            <Maximize2 size={16} />
          </button>
          <button
            className="icon-button hidden lg:inline-flex"
            aria-label="Toggle parts panel"
            title="Parts & structure"
            onClick={() =>
              window.matchMedia("(min-width: 1024px)").matches
                ? setLeftCollapsed((value) => !value)
                : setLeftOpen(true)
            }
          >
            <PanelLeft size={16} />
          </button>
          <button
            className="icon-button hidden xl:inline-flex"
            aria-label="Toggle inspector panel"
            title="Inspector"
            onClick={() =>
              window.matchMedia("(min-width: 1280px)").matches
                ? setRightCollapsed((value) => !value)
                : setRightOpen(true)
            }
          >
            <PanelRight size={16} />
          </button>
          <Dialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            title="Reset this demo?"
            description="This clears this model’s local edit history and restores its original sample."
            trigger={
              <button className="icon-button" aria-label="Reset demo">
                <RotateCcw size={15} />
              </button>
            }
          >
            <Button
              variant="primary"
              onClick={() => {
                reset();
                setSelected(null);
                setHidden([]);
                cancelPlacement();
                setResetOpen(false);
              }}
            >
              Restore baseline
            </Button>
          </Dialog>
          <Dialog
            title="Export preview"
            description="Production model and PDF exports are not connected in this POC."
            trigger={
              <button className="icon-button" aria-label="Export preview">
                <Download size={16} />
              </button>
            }
          >
            <p className="text-sm">
              Explore the curated instruction layout. The browser’s print dialog provides a local
              layout preview.
            </p>
            <Link href={`/instructions/?project=${id}`} className="button mt-4">
              View instruction sample
            </Link>
          </Dialog>
        </div>
      </div>
      {project.invalid && (
        <p role="status" className="notice rounded-none">
          Unknown project. Showing the courtyard sample.
        </p>
      )}
      <div className="flex shrink-0 justify-between border-b bg-surface px-3 xl:hidden">
        <Button variant="quiet" className="lg:hidden" onClick={() => setLeftOpen(true)}>
          <PanelLeft size={15} />
          Parts & structure{placement && <span className="size-2 rounded-full bg-primary" />}
        </Button>
        <Button variant="quiet" onClick={() => setRightOpen(true)}>
          <PanelRight size={15} />
          Inspector
        </Button>
      </div>
      <div
        className="workbench-grid"
        data-left-collapsed={leftCollapsed}
        data-right-collapsed={rightCollapsed}
      >
        <aside
          aria-label="Parts and structure"
          className={`hidden min-h-0 overflow-y-auto border-r bg-surface ${leftCollapsed ? "lg:hidden" : "lg:block"}`}
        >
          {left}
        </aside>
        <div
          className="flex min-h-0 min-w-0 flex-col"
          role="region"
          tabIndex={0}
          aria-label="Modeling workspace. Arrow keys move a selected brick, R rotates, Shift D duplicates."
          onPointerDown={(event) => {
            if (event.target instanceof HTMLCanvasElement)
              event.currentTarget.focus({ preventScroll: true });
          }}
        >
          <ModelViewport
            model={model}
            assemblyView={entry.fixture.assemblyView}
            selected={selection}
            onSelect={select}
            hidden={hidden}
            placement={placement}
            onPlacementChange={changePlacement}
            onPlace={place}
            onCancelPlacement={cancelPlacement}
            onMove={(partId, delta) => command({ type: "translate", id: partId, delta })}
          />
          <div className="studio-secondary shrink-0">
            <AssistantPreview model={model} variant={entry.fixture.variant} command={command} />
          </div>
        </div>
        <aside
          aria-label="Project inspector"
          className={`hidden min-h-0 overflow-y-auto border-l bg-surface ${rightCollapsed ? "xl:hidden" : "xl:block"}`}
        >
          {right}
        </aside>
      </div>
      <div className="flex min-h-7 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t bg-surface px-4 py-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Info size={12} />
          Local session · Reload resets edits
        </p>
        <p role="status" aria-live="polite">
          {placementError ||
            message ||
            (placement ? "Choose a surface or enter placement coordinates" : "Ready to build")}
        </p>
      </div>
      <Dialog
        sheet
        open={leftOpen}
        onOpenChange={setLeftOpen}
        title="Parts & structure"
        description="Choose a part, inspect subassemblies or read your brief."
      >
        {left}
      </Dialog>
      <Dialog
        sheet
        open={rightOpen}
        onOpenChange={setRightOpen}
        title="Project inspector"
        description="Select and edit parts with keyboard-accessible controls."
      >
        {right}
      </Dialog>
    </div>
  );
}
