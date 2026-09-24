import { LockKeyhole, Move, Trash2, ChevronRight } from "lucide-react";
import { type Model, type EditCommand } from "@/core/model/public";
import { partDefinitions, colors, editPolicy } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
export function SelectionInspector({
  model,
  selected,
  onSelect,
  command,
}: {
  model: Model;
  selected: string | null;
  onSelect: (id: string) => void;
  command: (command: EditCommand) => boolean;
}) {
  const part = model.instances.find((part) => part.id === selected);
  const definition = partDefinitions.find((p) => p.id === part?.partId);
  const group = model.groups.find((g) => g.id === part?.groupId);
  return (
    <div className="space-y-6">
      <section>
        <p className="eyebrow mb-3">Selection</p>
        <label className="mb-4 block text-xs font-medium">
          Choose a logical part
          <select
            className="field mt-2"
            value={part?.id ?? ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">Select a brick…</option>
            {model.instances.map((part) => (
              <option value={part.id} key={part.id}>
                {part.id} · {part.colorId}
              </option>
            ))}
          </select>
        </label>
        {part ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg">{definition?.name}</h2>
              <span className="tag">1 piece</span>
            </div>
            <p className="mb-4 break-all font-mono text-xs text-muted-foreground">{part.partId}</p>
            {group?.protected && (
              <p className="mb-4 flex items-start gap-2 rounded-md bg-warning-muted p-3 text-xs text-warning">
                <LockKeyhole size={15} className="shrink-0" />
                Protected {group.name}. Unlock it in Structure before editing.
              </p>
            )}
            <label className="block text-xs font-medium">
              Part color
              <select
                className="field mt-2"
                value={part.colorId}
                disabled={group?.protected}
                onChange={(e) => command({ type: "recolor", id: part.id, colorId: e.target.value })}
              >
                {colors.map((color) => (
                  <option value={color.id} key={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm">
                <Move size={15} />
                Move on the visual grid
              </h3>
              <p className="mb-3 font-mono text-xs text-muted-foreground">
                X {part.transform.x} · Y {part.transform.y} · Z {part.transform.z}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis} className="text-center">
                    <span className="text-xs uppercase text-muted-foreground">
                      {axis} {axis === "y" ? "0.2" : "1"} stud
                    </span>
                    <div className="mt-1 flex">
                      <button
                        className="button min-w-0 flex-1 rounded-r-none px-2"
                        aria-label={`Move ${axis} negative`}
                        disabled={group?.protected}
                        onClick={() =>
                          command({
                            type: "translate",
                            id: part.id,
                            delta: { x: 0, y: 0, z: 0, [axis]: axis === "y" ? -0.2 : -1 },
                          })
                        }
                      >
                        −
                      </button>
                      <button
                        className="button min-w-0 flex-1 rounded-l-none px-2"
                        aria-label={`Move ${axis} positive`}
                        disabled={group?.protected}
                        onClick={() =>
                          command({
                            type: "translate",
                            id: part.id,
                            delta: { x: 0, y: 0, z: 0, [axis]: axis === "y" ? 0.2 : 1 },
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="mt-5 w-full text-danger"
              disabled={group?.protected}
              onClick={() => command({ type: "remove", id: part.id })}
            >
              <Trash2 size={15} />
              Remove selected part
            </Button>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-control-border p-5 text-sm text-muted-foreground">
            Select a brick in the model, choose a subassembly, or use the list above.
          </div>
        )}
      </section>
      <section className="section-rule">
        <h3 className="mb-4 text-sm">Project at a glance</h3>
        <dl className="space-y-3 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Logical pieces</dt>
            <dd className="font-semibold tabular-nums" data-testid="piece-count">
              {model.instances.length}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subassemblies</dt>
            <dd>{model.groups.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Demo editing limit</dt>
            <dd>{editPolicy.maxInstances} pieces</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Current revision</dt>
            <dd className="font-mono">{model.revision}</dd>
          </div>
        </dl>
      </section>
      <p className="flex gap-2 text-xs text-muted-foreground">
        <ChevronRight size={15} className="shrink-0" />
        {copy.construction}
      </p>
    </div>
  );
}
