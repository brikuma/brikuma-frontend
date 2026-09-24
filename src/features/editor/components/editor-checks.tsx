"use client";
import { diagnoseModel, type Model } from "@/core/model/public";
import { partDefinitions } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";

export type ModelChecks = ReturnType<typeof diagnoseModel>;

export function EditorChecks({
  model,
  result,
  onResult,
  onFocus,
}: {
  model: Model;
  result: ModelChecks | null;
  onResult: (result: ModelChecks) => void;
  onFocus: (ids: readonly string[]) => void;
}) {
  const stale = Boolean(result && result.modelRevision !== model.revision);
  function describe(id: string) {
    const instance = model.instances.find((part) => part.id === id);
    const name = partDefinitions.find((part) => part.id === instance?.partId)?.name;
    return name ? `${name} · ${id}` : id;
  }
  return (
    <section className="space-y-3" aria-label="Geometric diagnostics">
      <h2 className="text-base">Geometric diagnostics</h2>
      <p className="text-xs text-muted-foreground">
        Hidden pieces participate. Rendering quality never changes these checks.
      </p>
      <Button onClick={() => onResult(diagnoseModel(model, partDefinitions))}>
        {result ? "Recalculate checks" : "Run supported checks"}
      </Button>
      {result && (
        <>
          <p className={stale ? "text-xs text-warning" : "text-xs"}>
            {stale ? "Stale: model revision changed" : "Current"} · {result.modelRevision}
          </p>
          {stale && <p className="text-xs">Recalculate before inspecting these results.</p>}
          <p className="text-sm">{result.conflicts.length} supported occupied-volume conflicts</p>
          <p className="text-xs">
            {result.checkedInstanceCount} supported pieces · {result.uncheckedIds.length} not
            checked
          </p>
          <p className="text-xs text-muted-foreground">Rule {result.rule}</p>
          <ul className="space-y-2" aria-label="Occupied-volume conflicts">
            {result.conflicts.slice(0, 30).map((conflict) => (
              <li key={conflict.ids.join("/")}>
                <button
                  className="button min-h-11 w-full flex-col items-start whitespace-normal text-left text-xs"
                  aria-label={`Reveal ${conflict.ids.join(" / ")}`}
                  disabled={stale}
                  onClick={() => onFocus(conflict.ids)}
                >
                  <span className="font-medium">Inspect occupied-volume conflict</span>
                  {conflict.ids.map((id) => (
                    <span key={id} className="break-all">
                      {describe(id)}
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
          {result.conflicts.length > 30 && <p className="text-xs">First 30 conflicts shown.</p>}
          {result.uncheckedIds.length > 0 && (
            <details>
              <summary className="min-h-11 py-3 text-sm">
                Not checked · {result.uncheckedIds.length} pieces
              </summary>
              <p className="mb-2 text-xs text-muted-foreground">
                These shapes lack supported diagnostic geometry. Their presence is not a passed
                check.
              </p>
              <ul className="space-y-2">
                {result.uncheckedIds.map((id) => (
                  <li key={id}>
                    <button
                      className="button min-h-11 w-full whitespace-normal break-all text-left text-xs"
                      aria-label={`Inspect unchecked ${id}`}
                      disabled={stale}
                      onClick={() => onFocus([id])}
                    >
                      {describe(id)}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      <div className="border-t pt-3 text-xs text-muted-foreground">
        <p>
          Coverage: bounded basic rectangular brick/plate occupied volumes and known stud mating.
          Custom shapes and arbitrary cavity relationships are not fully checked.
        </p>
        <p className="mt-2">
          Physical stability, clutch force, load and build order: not evaluated.
        </p>
      </div>
    </section>
  );
}
