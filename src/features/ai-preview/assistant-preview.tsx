"use client";
import { useMemo, useState } from "react";
import { Sparkles, ArrowUpRight, LockKeyhole } from "lucide-react";
import {
  previewVariant,
  type Model,
  type SampleVariant,
  type EditCommand,
} from "@/core/model/public";
import { editPolicy } from "@/fixtures/catalog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { copy } from "@/lib/copy";
import { ModelPoster } from "@/components/model-poster";
export function AssistantPreview({
  model,
  variant,
  command,
}: {
  model: Model;
  variant: SampleVariant | null;
  command: (command: EditCommand) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(
    () => (variant ? previewVariant(model, variant, editPolicy) : null),
    [model, variant],
  );
  const compatible = preview?.ok === true;
  if (!variant)
    return (
      <section
        aria-label="Assisted design preview"
        className="shrink-0 space-y-1 border-t bg-surface px-4 py-2"
      >
        <p className="flex items-center gap-2 text-xs font-medium">
          <Sparkles size={14} className="text-primary" /> Assisted design preview
        </p>
        <p className="text-xs text-muted-foreground">
          No pre-authored change is available for this model. AI is not connected.
        </p>
      </section>
    );
  return (
    <section
      aria-label="Assisted design preview"
      className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-surface px-4 py-2"
    >
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-medium">
          <Sparkles size={14} className="text-primary" /> Assisted design preview
        </p>
        <p className="text-xs text-muted-foreground">
          Pre-authored sample change · AI is not connected.
        </p>
      </div>
      <Button
        variant="quiet"
        className="min-h-8 px-2 py-1 text-xs text-primary"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Preview sample change
        <ArrowUpRight size={14} />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={variant?.title ?? "Sample change"}
        description={copy.ai}
      >
        {variant && (
          <>
            <p className="text-sm">{variant.description}</p>
            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="rounded-md border p-4">
                <p className="eyebrow mb-2">Compatible baseline</p>
                <ModelPoster id={model.id} title="Original baseline" className="mb-3 h-28" />
                <p className="text-2xl font-semibold">
                  {compatible ? model.instances.length : "—"}
                  <span className="ml-1 text-xs font-normal">pieces</span>
                </p>
                <p className="mt-2 font-mono text-xs">{variant.baseRevision}</p>
              </div>
              <div className="rounded-md border border-primary bg-primary-muted p-4">
                <p className="eyebrow mb-2">Sample variant</p>
                <ModelPoster
                  id={model.id}
                  src="/assets/previews/masseria-variant.svg"
                  title="Pre-authored terrace variant"
                  className="mb-3 h-28"
                />
                <p className="text-2xl font-semibold">
                  {preview?.ok ? preview.value.pieceCount : "—"}
                  <span className="ml-1 text-xs font-normal">pieces*</span>
                </p>
                <p className="mt-2 text-xs">
                  {preview?.ok
                    ? `${preview.value.removedCount} removed · ${preview.value.addedCount} added`
                    : "Comparison unavailable for current state"}
                </p>
              </div>
            </div>
            <p className="flex items-center gap-2 text-sm">
              <LockKeyhole size={16} />
              Facade remains unchanged.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              *Applies only to {variant.baseRevision}. No physical check has run.
            </p>
            {!compatible && (
              <p role="alert" className="mt-4 rounded-md bg-warning-muted p-3 text-sm text-warning">
                {preview && !preview.ok
                  ? `${preview.error.code === "revision-conflict" ? "Revision conflict. " : ""}${preview.error.message}`
                  : "No sample is available."}
              </p>
            )}
            {error && (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <Button
              variant="primary"
              className="mt-5 w-full"
              disabled={!compatible}
              onClick={() => {
                if (command({ type: "apply-variant", variant })) {
                  setOpen(false);
                  setError("");
                } else
                  setError(
                    "This change was rejected. Check group protection and the current revision.",
                  );
              }}
            >
              Apply pre-authored variant
            </Button>
          </>
        )}
      </Dialog>
    </section>
  );
}
