"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Info,
  Plus,
  Maximize2,
  FolderOpen,
  Keyboard,
} from "lucide-react";
import { useProject } from "./state/session";
import { PartCatalog, type PartCatalogPreferences } from "./components/part-catalog";
import { EditorChecks, type ModelChecks } from "./components/editor-checks";
import { Structure } from "./components/structure";
import { SelectionInspector } from "./components/selection-inspector";
import { SelectionTools } from "./components/selection-tools";
import { PlacementControls } from "./components/placement-controls";
import { ModelViewport } from "./components/model-viewport";
import {
  EditorFiles,
  EditorReferences,
  useEditorReferences,
  EditorExperiment,
  EditorStepPreview,
  EditorReplacement,
} from "./components/editor-workflows";
import { ProjectNavigation } from "@/components/shell/project-navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { partDefinitions, editPolicy } from "@/fixtures/catalog";
import {
  getSelectionBounds,
  snapGridTransform,
  getGroupInstanceIds,
  isGroupProtected,
  type EditCommand,
  type GridTransform,
  type Model,
  type QuarterTurn,
} from "@/core/model/public";
import type { PlacementPreview, ViewportTool } from "./viewport-types";
import { snapPlacementCenter } from "./placement-grid";
import type { SceneFixture } from "@/fixtures/scene-types";
import type { EditorFixtureId } from "@/fixtures/editor";

const subscribeWidth = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const readWidth = () => window.innerWidth;
const serverWidth = () => 0;

type TaskMode = "build" | "inspect" | "present";

export function Workbench() {
  const project = useProject();
  return project.model && project.entry ? (
    <EditorWorkbench key={project.id} project={project} />
  ) : (
    <div className="page-wrap" role="status">
      {project.loadError || "Opening your local workspace…"}
    </div>
  );
}
function EditorWorkbench({ project }: { project: ReturnType<typeof useProject> }) {
  const referenceState = useEditorReferences();
  const width = useSyncExternalStore(subscribeWidth, readWidth, serverWidth);
  const { model: loadedModel, entry: loadedEntry, message, history, reset } = project;
  const model = loadedModel!;
  const entry = loadedEntry!;
  const [panelWidths, setPanelWidths] = useState({ left: 256, right: 280 });
  const [stepViewRequest, setStepViewRequest] = useState({ serial: 0, view: "iso" as const });
  const [assembledResetRequest, setAssembledResetRequest] = useState(0);
  const [viewLocked, setViewLocked] = useState(false);
  const [impactIds, setImpactIds] = useState<readonly string[]>([]);
  const [mode, setMode] = useState<TaskMode>("build");
  const [tab, setTab] = useState("Parts");
  const [inspector, setInspector] = useState("Selection");
  const [selected, setSelected] = useState<readonly string[]>(() =>
    project.focus === "roof"
      ? [model.instances.find((part) => part.groupId === "roof")?.id ?? ""]
      : [],
  );
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState(false);
  const [scope, setScope] = useState<string | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [focusIds, setFocusIds] = useState<readonly string[] | null>(null);
  const [sheet, setSheet] = useState<"left" | "right" | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [pending, setPending] = useState<PlacementPreview | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [catalogColor, setCatalogColor] = useState("limestone");
  const [catalogPreferences, setCatalogPreferences] = useState<PartCatalogPreferences>({
    search: "",
    category: "all",
    collection: "all",
    usedOnly: false,
  });
  const [favoritePartIds, setFavoritePartIds] = useState<readonly string[]>([]);
  const [recentPartIds, setRecentPartIds] = useState<readonly string[]>([]);
  const [checkResult, setCheckResult] = useState<ModelChecks | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [toolRequest, setToolRequest] = useState<{ serial: number; tool: ViewportTool }>({
    serial: 0,
    tool: "select",
  });
  const [notice, setNotice] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [changesOpen, setChangesOpen] = useState(false);
  const [proposal, setProposal] = useState<Model | null>(null);
  const [stepEpoch, setStepEpoch] = useState(0);
  const [steps, setSteps] = useState<{
    visibleIds: readonly string[];
    mutedIds: readonly string[];
  } | null>(null);
  const [workplane, setWorkplane] = useState<{ axis: "x" | "y" | "z"; offset: number }>({
    axis: "y",
    offset: 0,
  });
  const [section, setSection] = useState<{ axis: "x" | "y" | "z"; offset: number } | null>(null);
  const validScope = model.groups.some((group) => group.id === scope) ? scope : null;
  const validSelectedGroup = model.groups.some((group) => group.id === selectedGroup)
    ? selectedGroup
    : null;
  const selectionIds = selected.filter((partId) =>
    model.instances.some((part) => part.id === partId),
  );
  const selection = selectionIds.at(-1) ?? null;
  const hiddenIds = useMemo(() => {
    const excluded = new Set(hidden);
    for (const group of model.groups)
      if (excluded.has(group.id))
        for (const partId of getGroupInstanceIds(model, group.id)) excluded.add(partId);
    return model.instances.filter((part) => excluded.has(part.id)).map((part) => part.id);
  }, [model, hidden]);
  const previewModel = useCallback((value: Model | null) => {
    setProposal(value);
    if (value) {
      setMode("build");
      setPending(null);
    }
  }, []);
  const changeStepView = useCallback(
    (view: { visibleIds: readonly string[]; mutedIds: readonly string[] } | null) => {
      setSteps(view);
      if (view) {
        setMode("inspect");
        setPending(null);
      }
    },
    [],
  );
  const transient = pending ? "placing" : proposal ? "experiment" : steps ? "steps" : "idle";
  const readOnly =
    viewLocked || mode !== "build" || Boolean(proposal) || Boolean(steps) || Boolean(section);
  useEffect(() => {
    const cancel = () => setPending(null);
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  function command(value: EditCommand) {
    if (readOnly) {
      setNotice("Return to assembled Build to edit the model.");
      return false;
    }
    setNotice("");
    return project.command(value);
  }
  function select(partId: string, additive = false) {
    if (!partId) {
      setSelected([]);
      setSelectedGroup(null);
      return;
    }
    const part = model.instances.find((part) => part.id === partId);
    if (!part) return;
    if (validScope && !getGroupInstanceIds(model, validScope).includes(partId)) {
      setNotice("Outside the active assembly. Exit group to select this part.");
      return;
    }
    if (groupMode && !validScope) {
      setSelected(getGroupInstanceIds(model, part.groupId));
      setSelectedGroup(part.groupId);
    } else {
      setSelected((current) =>
        additive || multiSelect
          ? current.includes(partId)
            ? current.filter((id) => id !== partId)
            : [...current, partId]
          : [partId],
      );
      setSelectedGroup(null);
    }
    setInspector("Selection");
  }
  function cancelPlacement() {
    setPending(null);
    if (pending) setNotice("Placement cancelled; model unchanged.");
  }
  function changePlacement(transform: GridTransform) {
    setPending((current) => (current ? { ...current, transform } : null));
    setNotice("");
  }
  function choosePart(partId: string, colorId: string) {
    if (readOnly) {
      setNotice("Return to assembled Build before choosing a part.");
      return;
    }
    const definition = partDefinitions.find((part) => part.id === partId);
    if (!definition) return;
    setNotice("");
    setTab("Parts");
    setPending({
      partId,
      colorId,
      target: "ground",
      transform: {
        ...snapPlacementCenter({ x: 0, z: 0 }, definition, 0),
        y: definition.height / 2,
        rotation: 0,
      },
    });
  }
  function allocateId() {
    let next = entry.session.nextRevision;
    const used = new Set(model.instances.map((part) => part.id));
    while (used.has(`added-${next}`)) next++;
    return `added-${next}`;
  }
  function historyEdit(direction: "undo" | "redo") {
    if (readOnly) {
      setNotice("Return to assembled Build before changing history.");
      return;
    }
    setPending(null);
    history(direction);
  }
  function place(transform: GridTransform) {
    if (!pending) return false;
    const group =
      model.groups.find((group) => group.id === validScope) ??
      model.groups.find((group) => !isGroupProtected(model, group.id)) ??
      model.groups[0];
    if (!group) {
      setNotice("Create an editable assembly first.");
      return false;
    }
    const instanceId = allocateId();
    const ok = command({
      type: "place",
      instance: {
        id: instanceId,
        partId: pending.partId,
        colorId: pending.colorId,
        groupId: group.id,
        transform,
      },
      placement:
        pending.target === "surface" ? "connect" : pending.target === "free" ? "free" : "grid",
      baseRevision: model.revision,
    });
    if (ok) {
      setHidden(hiddenIds);
      setSelected([instanceId]);
      setSelectedGroup(null);
      setInspector("Selection");
      setNotice("Part placed. Undo restores the previous model.");
      setRecentPartIds((current) =>
        [pending.partId, ...current.filter((id) => id !== pending.partId)].slice(0, 24),
      );
      if (!repeat) {
        setPending(null);
        setSheet(null);
      }
    }
    return ok;
  }
  function duplicate(ids: readonly string[]) {
    const bounds = getSelectionBounds(model, partDefinitions, ids);
    if (!bounds || !ids.length || pending) return;
    const used = new Set(model.instances.map((part) => part.id));
    const newIds: string[] = [];
    let next = entry.session.nextRevision;
    while (newIds.length < ids.length) {
      if (!Number.isSafeInteger(next)) {
        setNotice("The local identity counter is exhausted.");
        return;
      }
      const id = `added-${next++}`;
      if (!used.has(id)) {
        newIds.push(id);
        used.add(id);
      }
    }
    if (
      command({
        type: "duplicate-selection",
        ids,
        newIds,
        delta: { x: Math.ceil(bounds.width * 2) / 2, y: 0, z: 0 },
      })
    ) {
      setSelected(newIds);
      setSelectedGroup(null);
      setInspector("Selection");
      // Keep previously hidden physical members hidden while revealing only the new copies.
      setHidden(hiddenIds);
      setToolRequest((current) => ({ serial: current.serial + 1, tool: "move" }));
      setNotice(
        `${ids.length} ${ids.length === 1 ? "part" : "parts"} duplicated as a draft. Move is active; Undo removes this copy in one step.`,
      );
    }
  }
  function clearPresentation() {
    setStepEpoch((value) => value + 1);
    setFocusIds(null);
    setSection(null);
    setSteps(null);
    setProposal(null);
    setImpactIds([]);
  }
  function changeMode(value: TaskMode) {
    if (value === "present" && proposal) {
      setNotice(
        "Choose Current or discard the local experiment before presenting the canonical model.",
      );
      return;
    }
    if (value === "build") setAssembledResetRequest((value) => value + 1);
    setMode(value);
    setPending(null);
    if (value === "build") clearPresentation();
  }
  function focus(parts: readonly string[]) {
    const existing = parts.filter((id) => model.instances.some((part) => part.id === id));
    if (!existing.length) return;
    clearPresentation();
    setAssembledResetRequest((current) => current + 1);
    if (validScope && existing.some((id) => !getGroupInstanceIds(model, validScope).includes(id)))
      setScope(null);
    setSelected(existing);
    setSelectedGroup(null);
    setFocusRequest((current) => current + 1);
    setFocusIds(existing);
    setMode("inspect");
    setPending(null);
  }
  function opened(fixture: SceneFixture) {
    project.replaceFixture(fixture);
    setCheckResult(null);
    setSelected([]);
    setHidden(fixture.initiallyHiddenIds ?? []);
    setScope(null);
    setSelectedGroup(null);
    clearPresentation();
    setPending(null);
    setFileOpen(false);
  }
  function shortcut(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]'))
    )
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input,textarea,select,[contenteditable]")
    )
      return;
    if (event.key === "Escape" && pending) {
      event.preventDefault();
      cancelPlacement();
      return;
    }
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === "z") {
      event.preventDefault();
      historyEdit(event.shiftKey ? "redo" : "undo");
      return;
    }
    if (event.key === "Escape" && focusIds) {
      event.preventDefault();
      clearPresentation();
      setNotice("Previous visibility restored.");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !pending) {
      if (key === "a") {
        event.preventDefault();
        if (viewLocked || section || proposal) {
          setNotice("Return to the assembled model before selecting all visible parts.");
          return;
        }
        const eligible = validScope ? new Set(getGroupInstanceIds(model, validScope)) : null;
        setSelected(
          model.instances
            .filter(
              (part) =>
                (!focusIds?.length || focusIds.includes(part.id)) &&
                (focusIds?.includes(part.id) || !hiddenIds.includes(part.id)) &&
                (!steps || steps.visibleIds.includes(part.id)) &&
                (!eligible || eligible.has(part.id)),
            )
            .map((part) => part.id),
        );
        setSelectedGroup(null);
        setInspector("Selection");
        return;
      }
      if (key === "d" && selectionIds.length) {
        event.preventDefault();
        duplicate(selectionIds);
        return;
      }
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (key === "h" && !pending) {
      event.preventDefault();
      if (event.shiftKey) {
        setHidden([]);
        setNotice("Hidden parts shown; the model is unchanged.");
      } else if (selectionIds.length) {
        setHidden((current) => [...new Set([...current, ...selectionIds])]);
        setNotice("Selection hidden; physical parts and counts are unchanged.");
      }
      return;
    }
    if (readOnly) return;
    if (key === "p") {
      event.preventDefault();
      setTab("Parts");
      setLeftCollapsed(false);
      if (width < 1024) setSheet("left");
      return;
    }
    if (key === "r" && pending) {
      event.preventDefault();
      changePlacement({
        ...pending.transform,
        rotation: ((pending.transform.rotation + 90) % 360) as QuarterTurn,
      });
      return;
    }
    if (!selection || pending) return;
    if (key === "d" && event.shiftKey) {
      event.preventDefault();
      duplicate(selectionIds);
      return;
    }
    if (key === "delete" || key === "backspace") {
      event.preventDefault();
      command({ type: "remove-selection", ids: selectionIds });
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest("button,a,summary")) return;
    const step = event.shiftKey ? 1 : 0.5;
    const moves: Record<string, { x: number; y: number; z: number }> = {
      ArrowLeft: { x: -step, y: 0, z: 0 },
      ArrowRight: { x: step, y: 0, z: 0 },
      ArrowUp: { x: 0, y: 0, z: -step },
      ArrowDown: { x: 0, y: 0, z: step },
      PageUp: { x: 0, y: 0.4, z: 0 },
      PageDown: { x: 0, y: -0.4, z: 0 },
    };
    if (moves[event.key]) {
      event.preventDefault();
      command({ type: "translate-selection", ids: selectionIds, delta: moves[event.key] });
    }
  }
  const left = (
    <div className="min-h-0">
      <div className="flex border-b px-2">
        {["Parts", "Structure", "References"].map((item) => (
          <button
            key={item}
            className="min-h-11 flex-1 border-b-2 px-1 text-xs aria-pressed:border-primary aria-pressed:text-primary"
            style={{ borderColor: tab === item ? "var(--primary)" : "transparent" }}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="space-y-4 p-3">
        {pending && (
          <PlacementControls
            key={pending.partId}
            placement={pending}
            model={model}
            hiddenIds={hiddenIds}
            repeat={repeat}
            onRepeat={setRepeat}
            onChange={changePlacement}
            onPlace={place}
            onCancel={cancelPlacement}
            onColor={(colorId) => {
              setCatalogColor(colorId);
              setPending((current) => (current ? { ...current, colorId } : null));
            }}
            onPolicy={(target) => {
              setNotice("");
              setPending((current) =>
                current
                  ? {
                      ...current,
                      target,
                      transform:
                        target === "ground"
                          ? snapGridTransform(
                              partDefinitions.find((part) => part.id === current.partId)!,
                              current.transform,
                            )
                          : current.transform,
                    }
                  : null,
              );
            }}
          />
        )}
        {tab === "Parts" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base">Parts library</h2>
              <span className="tag">Original demo</span>
            </div>
            <PartCatalog
              onAdd={choosePart}
              colorId={catalogColor}
              onColorChange={setCatalogColor}
              selectedPartId={pending?.partId}
              preferences={catalogPreferences}
              onPreferencesChange={setCatalogPreferences}
              favoritePartIds={favoritePartIds}
              onFavoriteChange={setFavoritePartIds}
              recentPartIds={recentPartIds}
              usedPartIds={[...new Set(model.instances.map((part) => part.partId))]}
            />
          </>
        ) : tab === "Structure" ? (
          <>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={groupMode}
                onChange={(e) => setGroupMode(e.target.checked)}
              />
              Select whole groups
            </label>
            {validScope && (
              <div className="rounded-md border p-2 text-xs">
                Inside: {model.groups.find((group) => group.id === validScope)?.name}
                <Button className="mt-2 w-full" onClick={() => setScope(null)}>
                  Exit group
                </Button>
              </div>
            )}
            <Structure
              model={model}
              hidden={hidden}
              selected={selection}
              selectedIds={selectionIds}
              onSelect={select}
              scope={validScope}
              onSelectGroup={(groupId) => {
                setSelected(getGroupInstanceIds(model, groupId));
                setSelectedGroup(groupId);
                setInspector("Selection");
              }}
              onVisibility={(groupId) =>
                setHidden((current) =>
                  current.includes(groupId)
                    ? current.filter((id) => id !== groupId)
                    : [...current, groupId],
                )
              }
              onProtection={(groupId, value) =>
                command({ type: "set-protection", groupId, protected: value })
              }
              readOnly={readOnly}
            />
            <Button className="w-full" onClick={() => setTab("Parts")}>
              <Plus size={15} />
              Add a brick
            </Button>
          </>
        ) : (
          <EditorReferences state={referenceState} />
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
            className="min-h-11 flex-1 border-b-2 text-xs"
            style={{ borderColor: inspector === item ? "var(--primary)" : "transparent" }}
            aria-pressed={inspector === item}
            onClick={() => setInspector(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="space-y-4 p-4">
        {inspector === "Checks" ? (
          <EditorChecks
            model={model}
            result={checkResult}
            onResult={setCheckResult}
            onFocus={focus}
          />
        ) : inspector === "Activity" ? (
          <section>
            <h2 className="text-base">Local edit history</h2>
            <p className="mt-3 text-sm">{entry.session.past.length} undoable changes</p>
            <p className="mt-2 break-all font-mono text-xs">{model.revision}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              History retains at most 40 snapshots. New edits after undo replace the redo branch.
            </p>
          </section>
        ) : (
          <>
            <SelectionTools
              model={model}
              ids={selectionIds}
              groupId={validSelectedGroup}
              onGroup={setScope}
              command={command}
              readOnly={readOnly}
              onFocus={() => focus(selectionIds)}
              onDuplicate={() => duplicate(selectionIds)}
              onHide={() => {
                setHidden((current) => [...new Set([...current, ...selectionIds])]);
                setNotice("Selection hidden; physical parts and counts are unchanged.");
              }}
              onClear={() => {
                setSelected([]);
                setSelectedGroup(null);
              }}
            />
            <SelectionInspector
              model={model}
              selected={selectionIds.length === 1 ? selection : null}
              selectedIds={selectionIds}
              groupId={validSelectedGroup}
              onSelect={select}
              command={command}
              onDuplicate={(id) => duplicate([id])}
              readOnly={readOnly}
              onOpenCatalog={() => {
                setTab("Parts");
                setLeftCollapsed(false);
                if (!window.matchMedia("(min-width: 1024px)").matches) setSheet("left");
              }}
            />
            {selectionIds.length === 1 && !readOnly && (
              <EditorReplacement
                model={model}
                policy={editPolicy}
                selectedId={selection}
                onCommand={command}
              />
            )}
            <details>
              <summary className="min-h-10 py-2 text-sm">Precision & inspection</summary>
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Workplane controls constrain the ghost/drag plane. Canonical dimensions are
                  unchanged.
                </p>
                <label className="block text-xs">
                  Workplane normal
                  <select
                    className="field mt-1"
                    value={workplane.axis}
                    onChange={(e) =>
                      setWorkplane({ ...workplane, axis: e.target.value as "x" | "y" | "z" })
                    }
                  >
                    {["x", "y", "z"].map((axis) => (
                      <option key={axis} value={axis}>
                        {axis.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  Workplane offset · studs
                  <input
                    type="number"
                    className="field mt-1"
                    step="0.1"
                    value={workplane.offset}
                    onChange={(e) => {
                      if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
                        setWorkplane({ ...workplane, offset: e.target.valueAsNumber });
                    }}
                  />
                </label>
                <Button
                  className="w-full"
                  aria-pressed={Boolean(section)}
                  onClick={() => {
                    setMode("inspect");
                    setSection(section ? null : { axis: "x", offset: 0 });
                    setPending(null);
                  }}
                >
                  Visual section
                </Button>
                {section && (
                  <>
                    <label className="block text-xs">
                      Section axis
                      <select
                        className="field mt-1"
                        value={section.axis}
                        onChange={(e) =>
                          setSection({ ...section, axis: e.target.value as "x" | "y" | "z" })
                        }
                      >
                        {["x", "y", "z"].map((axis) => (
                          <option key={axis} value={axis}>
                            {axis.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs">
                      Section offset · studs
                      <input
                        className="field mt-1"
                        type="number"
                        step="0.5"
                        value={section.offset}
                        onChange={(e) => {
                          if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber))
                            setSection({ ...section, offset: e.target.valueAsNumber });
                        }}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Visual clipping only. No solid caps or physical cut.
                    </p>
                  </>
                )}
                <Button
                  onClick={() =>
                    setStepViewRequest((value) => ({ ...value, serial: value.serial + 1 }))
                  }
                >
                  Restore step view
                </Button>
                <EditorStepPreview
                  key={`${model.id}-${stepEpoch}`}
                  model={model}
                  sample={entry.fixture.instructions}
                  onView={changeStepView}
                />
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
  return (
    <div
      className="workbench-shell"
      data-focused={leftCollapsed && rightCollapsed}
      data-revision={model.revision}
      data-count={model.instances.length}
      data-interaction={transient}
      style={
        {
          "--editor-left-width": `${panelWidths.left}px`,
          "--editor-right-width": `${panelWidths.right}px`,
        } as CSSProperties
      }
      onKeyDown={shortcut}
    >
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-surface px-3 py-1.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm">{model.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {model.instances.length.toLocaleString("en")}{" "}
            {model.instances.length === 1 ? "part" : "parts"} ·{" "}
            <span className="font-mono">{model.revision}</span>
          </p>
        </div>
        <div className="flex rounded-md bg-surface-muted p-1" aria-label="Task modes">
          {(["build", "inspect", "present"] as const).map((value) => (
            <button
              key={value}
              className="min-h-9 rounded-sm px-3 text-sm capitalize aria-pressed:bg-surface aria-pressed:text-primary aria-pressed:shadow-sm"
              aria-pressed={mode === value}
              onClick={() => changeMode(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <button
            className="icon-button"
            aria-label="Undo local edit"
            disabled={readOnly || !entry.session.past.length}
            onClick={() => historyEdit("undo")}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo local edit"
            disabled={readOnly || !entry.session.future.length}
            onClick={() => historyEdit("redo")}
          >
            <Redo2 size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Local project files"
            onClick={() => setFileOpen(true)}
          >
            <FolderOpen size={16} />
          </button>
          <button
            className="icon-button hidden lg:inline-flex"
            aria-label="Focus canvas"
            aria-pressed={leftCollapsed && rightCollapsed}
            onClick={() => {
              const value = !(leftCollapsed && rightCollapsed);
              setLeftCollapsed(value);
              setRightCollapsed(value);
            }}
          >
            <Maximize2 size={16} />
          </button>
          <button
            className="icon-button hidden lg:inline-flex"
            aria-label="Toggle parts panel"
            onClick={() => setLeftCollapsed((value) => !value)}
          >
            <PanelLeft size={16} />
          </button>
          <button
            className="icon-button hidden xl:inline-flex"
            aria-label="Toggle inspector panel"
            onClick={() => setRightCollapsed((value) => !value)}
          >
            <PanelRight size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Reset demo"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      {project.invalid && (
        <p className="notice rounded-none">Unknown project. Showing the courtyard sample.</p>
      )}
      {hint && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-1 text-xs text-muted-foreground">
          <p>Choose a part → inspect its preview → Place or Escape. Undo is always close by.</p>
          <button
            className="button-quiet min-h-9 shrink-0 px-2"
            aria-label="Dismiss interaction hint"
            onClick={() => setHint(false)}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-surface px-3">
        <div className="flex items-center gap-3">
          <label className="flex min-h-10 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={multiSelect}
              onChange={(e) => setMultiSelect(e.target.checked)}
            />
            Multi-select
          </label>
          <span className="text-xs text-muted-foreground">{selectionIds.length} selected</span>
          {hiddenIds.length > 0 && (
            <button className="button text-xs" onClick={() => setHidden([])}>
              Show hidden parts ({hiddenIds.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="quiet"
            className="lg:hidden"
            onClick={(event) => {
              event.currentTarget.focus();
              setSheet("left");
            }}
          >
            Parts & structure
          </Button>
          <Button
            variant="quiet"
            className="xl:hidden"
            onClick={(event) => {
              event.currentTarget.focus();
              setSheet("right");
            }}
          >
            Inspector
          </Button>
          <Dialog
            title="Editor shortcuts"
            description="Shortcuts apply when the editor owns focus. Text inputs retain normal typing and browser zoom."
            trigger={
              <button className="button-quiet flex min-h-10 items-center gap-1 px-2 text-xs">
                <Keyboard size={15} />
                Shortcuts
              </button>
            }
          >
            <ul className="space-y-2 text-sm">
              <li>V / G / R: Select / Move / Rotate tools</li>
              <li>F: fit selection or visible model</li>
              <li>Shift + click: toggle selection</li>
              <li>Arrow keys: move selection 0.5 stud; Shift: 1 stud</li>
              <li>Page Up / Down: move vertically 0.4 stud</li>
              <li>⌘/Ctrl D (or Shift D): duplicate selection and enter Move</li>
              <li>⌘/Ctrl A: select visible pieces in the current group scope</li>
              <li>P: open parts · H: hide selection · Shift H: show hidden parts</li>
              <li>0 / 1 / 2 / 3: Isometric / Front / Right / Top (viewport)</li>
              <li>Escape: cancel preview or restore focus view</li>
              <li>⌘/Ctrl Z: undo; Shift: redo</li>
              <li>Secondary drag: orbit; middle or Space + primary: pan</li>
            </ul>
          </Dialog>
        </div>
      </div>
      {(focusIds || section || steps) && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-primary-muted px-3 py-1 text-xs">
          <p>
            {focusIds
              ? `Focus lens · ${focusIds.length} ${focusIds.length === 1 ? "piece" : "pieces"}`
              : section
                ? "Visual section"
                : "Curated step preview"}{" "}
            · Canonical model unchanged
          </p>
          <Button
            onClick={() => {
              clearPresentation();
              setNotice("Previous visibility restored.");
            }}
          >
            Restore view
          </Button>
          <Button onClick={() => changeMode("build")}>Return to assembled Build</Button>
        </div>
      )}
      <div
        className="workbench-grid"
        data-left-collapsed={leftCollapsed}
        data-right-collapsed={rightCollapsed}
      >
        {width >= 1024 && (
          <aside
            aria-label="Parts and structure"
            className={`hidden min-h-0 overflow-y-auto border-r bg-surface ${leftCollapsed ? "lg:hidden" : "lg:block"}`}
          >
            {left}
          </aside>
        )}
        <div
          className="flex min-h-0 min-w-0 flex-col"
          role="region"
          tabIndex={0}
          aria-label="Modeling workspace"
        >
          <ModelViewport
            compactControls={width < 640}
            toolRequest={toolRequest}
            focusRequest={focusRequest}
            model={proposal ?? model}
            assemblyView={entry.fixture.assemblyView}
            selected={selection}
            selectedIds={impactIds.length ? impactIds : selectionIds}
            multiSelect={multiSelect}
            mode={mode}
            onEditingLockChange={setViewLocked}
            viewRequest={stepViewRequest}
            assembledResetRequest={assembledResetRequest}
            onSelect={select}
            onClearSelection={() => {
              if (!pending) {
                setSelected([]);
                setSelectedGroup(null);
              }
            }}
            hidden={hiddenIds}
            focusIds={focusIds ?? undefined}
            section={section ?? undefined}
            workplane={workplane}
            presentationIds={steps?.visibleIds}
            mutedIds={steps?.mutedIds}
            placement={pending}
            onPlacementChange={changePlacement}
            onPlace={place}
            onCancelPlacement={cancelPlacement}
            onCancelInteraction={() => setPending(null)}
            onRotate={(partId, degrees) =>
              command({
                type: "rotate-selection",
                ids: selectionIds.includes(partId) ? selectionIds : [partId],
                pivot: model.instances.find((part) => part.id === partId)!.transform,
                quarterTurns: degrees === 90 ? 1 : -1,
              })
            }
            onMove={(partId, delta) =>
              command({
                type: "translate-selection",
                ids: selectionIds.includes(partId) ? selectionIds : [partId],
                delta,
              })
            }
          />
        </div>
        {width >= 1280 && (
          <aside
            aria-label="Project inspector"
            className={`hidden min-h-0 overflow-y-auto border-l bg-surface ${rightCollapsed ? "xl:hidden" : "xl:block"}`}
          >
            {right}
          </aside>
        )}
      </div>
      <div className="shrink-0 border-t bg-surface">
        <button
          className="flex min-h-10 w-full items-center justify-between px-4 text-left text-xs"
          aria-expanded={changesOpen}
          onClick={() => setChangesOpen((value) => !value)}
        >
          <span>Changes · local experiment</span>
          <span>{changesOpen ? "Collapse" : "Open"}</span>
        </button>
        {changesOpen && (
          <div className="max-h-64 overflow-y-auto border-t px-4 py-3">
            <EditorExperiment
              comparisonResetRequest={stepEpoch}
              model={model}
              policy={editPolicy}
              selectedIds={selectionIds}
              onAccept={(preview) => {
                if (mode !== "build" || viewLocked || section || steps) {
                  setNotice("Return to assembled Build before accepting a local edit.");
                  return false;
                }
                return project.acceptExperiment(preview);
              }}
              onPreview={previewModel}
              onHighlight={setImpactIds}
            />
          </div>
        )}
      </div>
      <div className="flex min-h-7 shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-surface px-3 py-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <Info size={12} />
          Local editor preview · download to keep edits
        </p>
        <p role="status" aria-live="polite">
          {notice || message || (pending ? "Preview only · Place commits once" : "Ready to build")}
        </p>
      </div>
      <Dialog
        sheet
        open={sheet === "left"}
        onOpenChange={(open) => setSheet(open ? "left" : null)}
        title="Parts & structure"
        description="Choose parts or select stable model identities."
      >
        {width < 1024 ? left : null}
      </Dialog>
      <Dialog
        sheet
        open={sheet === "right"}
        onOpenChange={(open) => setSheet(open ? "right" : null)}
        title="Project inspector"
        description="Keyboard-accessible properties, diagnostics and inspection."
      >
        {width < 1280 ? right : null}
      </Dialog>
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset this demo?"
        description="This discards local changes and undo history. Download a local project file first if you need them."
      >
        <Button
          variant="primary"
          onClick={() => {
            reset();
            setCheckResult(null);
            setSelected([]);
            setSelectedGroup(null);
            setScope(null);
            setHidden([]);
            setPending(null);
            clearPresentation();
            setResetOpen(false);
          }}
        >
          Restore baseline
        </Button>
      </Dialog>
      <Dialog
        open={fileOpen}
        onOpenChange={setFileOpen}
        title="Local project files"
        description="Explicit downloads and loads only. Nothing is uploaded or saved automatically."
      >
        <ProjectNavigation id={project.id} active="editor" />
        <details className="my-4">
          <summary className="min-h-10 py-2 text-sm">Panel widths</summary>
          <div className="grid grid-cols-2 gap-3">
            {(["left", "right"] as const).map((side) => (
              <label key={side} className="text-xs capitalize">
                {side} panel · px
                <select
                  className="field mt-1"
                  value={panelWidths[side]}
                  onChange={(event) =>
                    setPanelWidths((current) => ({
                      ...current,
                      [side]: Number(event.target.value),
                    }))
                  }
                >
                  {[240, 256, 272, 280, 288, 304, 320, 360].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Native keyboard controls; collapsing a panel restores space for precision.
          </p>
        </details>
        <EditorFiles
          model={model}
          policy={editPolicy}
          dirty={entry.session.past.length > 0}
          onLoad={(value) => opened({ model: value, variant: null, instructions: null })}
        />
        <div className="mt-6 border-t pt-4">
          <h2 className="text-base">Original studies</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Opening a study replaces this session. Download first to retain edits.
          </p>
          <SampleChooser dirty={entry.session.past.length > 0} onOpen={opened} />
          <Link href="/editor/?project=blank" className="button mt-3">
            Open empty project
          </Link>
        </div>
      </Dialog>
    </div>
  );
}
function SampleChooser({
  dirty,
  onOpen,
}: {
  dirty: boolean;
  onOpen: (fixture: SceneFixture) => void;
}) {
  const [sample, setSample] = useState<EditorFixtureId>("placement-lab");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    try {
      const { loadEditorFixture } = await import("@/fixtures/editor");
      onOpen(await loadEditorFixture(sample));
    } catch {
      setError("The local fixture could not be opened. Current work is unchanged.");
    }
  }
  return (
    <div className="mt-3 space-y-3">
      <label className="block text-xs">
        Study
        <select
          className="field mt-1"
          value={sample}
          onChange={(e) => {
            setSample(e.target.value as EditorFixtureId);
            setConfirm(false);
          }}
        >
          <option value="empty">Empty scene</option>
          <option value="placement-lab">Placement lab</option>
          <option value="courtyard-study">Courtyard study</option>
          <option value="rover-study">Rover study</option>
          <option value="stress-1000">Stress · 1,000 parts</option>
          <option value="stress-5000">Stress · 5,000 parts (opt-in)</option>
        </select>
      </label>
      {dirty && (
        <label className="flex min-h-10 items-center gap-2 text-xs">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          Discard current unsaved edits
        </label>
      )}
      <Button disabled={dirty && !confirm} onClick={open}>
        Open study
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
