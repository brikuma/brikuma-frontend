"use client";
import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  BookOpen,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Download,
  Info,
  LockKeyhole,
  CircleDashed,
  MessageSquare,
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
import { partDefinitions } from "@/fixtures/catalog";
import { copy } from "@/lib/copy";

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
  if (!model || !entry)
    return (
      <div className="page-wrap" role="status">
        {project.loadError || "Opening your local workspace…"}
      </div>
    );
  const selection = model.instances.some((p) => p.id === selected)
    ? selected
    : project.focus === "roof"
      ? (model.instances.find((p) => p.groupId === "roof")?.id ?? null)
      : null;
  function select(partId: string) {
    setSelected(partId);
    setInspector("Selection");
  }
  function add(partId: string, colorId: string) {
    if (!model || !entry) return;
    const definition = partDefinitions.find((part) => part.id === partId);
    if (!definition) return;
    const instanceId = `added-${entry.session.nextRevision}`;
    const group = model.groups.find((group) => !group.protected) ?? model.groups[0];
    if (!group) return;
    const ok = command({
      type: "add",
      instance: {
        id: instanceId,
        partId,
        colorId,
        groupId: group.id,
        transform: {
          x: 0,
          y: definition.height / 2,
          z: model.id === "blank" ? 0 : 14,
          rotation: 0,
        },
      },
    });
    if (ok) select(instanceId);
  }
  function shortcut(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input,textarea,select,[contenteditable]")
    )
      return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      history(event.shiftKey ? "redo" : "undo");
    }
    if (event.key === "Delete" && selection) {
      event.preventDefault();
      command({ type: "remove", id: selection });
    }
  }
  const left = (
    <div className="min-h-0 overflow-y-auto">
      <div className="flex border-b px-3">
        {["Parts", "Structure", "Brief"].map((item) => (
          <button
            key={item}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className={`min-h-12 flex-1 border-b-2 text-sm ${tab === item ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "Parts" ? (
          <PartCatalog onAdd={add} />
        ) : tab === "Structure" ? (
          <>
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
            <Button className="mt-5 w-full" onClick={() => setTab("Parts")}>
              Add a brick
            </Button>
          </>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-2">The intention</p>
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
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Notes stay in this panel while it is open. They do not generate or validate a model.
            </p>
            <Link href="/new/" className="button w-full">
              Open project brief
            </Link>
          </div>
        )}
      </div>
      <div className="m-4 rounded-md border bg-background p-3">
        <p className="mb-1 flex items-center gap-2 text-xs font-medium">
          <LockKeyhole size={13} /> Designed with intention
        </p>
        <p className="text-xs text-muted-foreground">
          Protect a subassembly to keep it unchanged during local edits.
        </p>
      </div>
    </div>
  );
  const right = (
    <div className="min-h-0 overflow-y-auto">
      <div className="flex border-b px-2">
        {["Selection", "Checks", "Activity"].map((item) => (
          <button
            key={item}
            aria-pressed={inspector === item}
            onClick={() => setInspector(item)}
            className={`min-h-12 flex-1 border-b-2 text-xs ${inspector === item ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}
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
          />
        ) : inspector === "Checks" ? (
          <>
            <p className="eyebrow mb-3">Know your model</p>
            <h2 className="mb-3 text-lg">
              Different questions.
              <br />
              Separate checks.
            </h2>
            <p className="mb-5 text-xs text-muted-foreground">
              No analysis has run on the current model. Example report categories are shown below.
            </p>
            {[
              "Collision checks",
              "Connection checks",
              "Stability assessment",
              "Build-order assessment",
              "Physical testing",
            ].map((label) => (
              <div key={label} className="mb-3 rounded-md border p-3">
                <h3 className="text-sm">{label}</h3>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleDashed size={14} />
                  Not run · outside this POC
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Baseline example: {model.baselineRevision}.{" "}
              {model.revision !== model.baselineRevision
                ? "The model has changed; baseline examples are out of date."
                : "No engineering result or certification is implied."}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow mb-3">Local activity</p>
            <h2 className="text-lg">A trail of exploration</h2>
            <p className="mt-4 text-sm">{entry.session.past.length} undoable local changes</p>
            <p className="mt-2 text-xs text-muted-foreground">{model.revision}</p>
            <div className="section-rule mt-5">
              <p className="mb-3 flex items-center gap-2 text-sm">
                <MessageSquare size={16} />
                Example review
              </p>
              <span className="tag">Fictional reviewer · {model.baselineRevision}</span>
              <p className="mt-3 text-sm">“Could the roof be lighter while keeping the facade?”</p>
              <p className="mt-2 text-xs text-muted-foreground">
                An example revision-specific comment. No one is currently connected.
              </p>
              {model.instances.some((p) => p.groupId === "roof") && (
                <Button
                  className="mt-4"
                  onClick={() => select(model.instances.find((p) => p.groupId === "roof")!.id)}
                >
                  Focus referenced roof
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
  return (
    <div onKeyDown={shortcut}>
      <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-2 border-b bg-surface px-4 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base">{model.title}</h1>
            <span className="tag hidden sm:inline-flex">Local study</span>
          </div>
          <p className="mt-.5 font-mono text-xs text-muted-foreground">{model.revision}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="icon-button"
            aria-label="Undo local edit"
            title="Undo (⌘/Ctrl Z)"
            disabled={!entry.session.past.length}
            onClick={() => history("undo")}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo local edit"
            disabled={!entry.session.future.length}
            onClick={() => history("redo")}
          >
            <Redo2 size={18} />
          </button>
          <Dialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            title="Reset this demo?"
            description="This clears this model’s local edit history and restores its original sample."
            trigger={
              <button className="icon-button" aria-label="Reset demo">
                <RotateCcw size={17} />
              </button>
            }
          >
            <Button
              variant="primary"
              onClick={() => {
                reset();
                setSelected(null);
                setHidden([]);
                setResetOpen(false);
              }}
            >
              Restore baseline
            </Button>
          </Dialog>
          <Link
            href={`/instructions/?project=${id}`}
            prefetch={false}
            className="button ml-2 hidden sm:inline-flex"
          >
            <BookOpen size={15} />
            Instructions
          </Link>
          <Dialog
            title="Export preview"
            description="Production model and PDF exports are not connected in this POC."
            trigger={
              <button className="icon-button" aria-label="Export preview">
                <Download size={18} />
              </button>
            }
          >
            <p className="text-sm">
              Explore the curated instruction layout. You can use the browser’s print dialog as a
              local layout preview.
            </p>
            <Link href={`/instructions/?project=${id}`} className="button mt-4">
              View instruction sample
            </Link>
          </Dialog>
        </div>
      </div>
      <ProjectNavigation id={id} active="editor" />
      {project.invalid && (
        <p role="status" className="notice rounded-none">
          Unknown project. Showing the courtyard sample.
        </p>
      )}
      <div className="flex justify-between border-b bg-surface px-3 xl:hidden">
        <Button variant="quiet" className="lg:hidden" onClick={() => setLeftOpen(true)}>
          <PanelLeft size={16} />
          Parts & structure
        </Button>
        <Button variant="quiet" onClick={() => setRightOpen(true)}>
          <PanelRight size={16} />
          Inspector
        </Button>
      </div>
      <div className="workbench-grid">
        <aside
          aria-label="Parts and structure"
          className="hidden min-h-0 overflow-y-auto border-r bg-surface lg:block"
        >
          {left}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">
          <ModelViewport model={model} selected={selection} onSelect={select} hidden={hidden} />
          <AssistantPreview model={model} variant={entry.fixture.variant} command={command} />
        </div>
        <aside
          aria-label="Project inspector"
          className="hidden min-h-0 overflow-y-auto border-l bg-surface xl:block"
        >
          {right}
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Info size={13} />
          {copy.session}
        </p>
        <p role="status" aria-live="polite">
          {message || "Ready to explore · all changes are local"}
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
