"use client";

import { useEffect, useRef, useState } from "react";
import { type EditingPolicy, type Model } from "@/core/model/public";
import {
  parseProjectPackage,
  serializeProjectPackage,
  PROJECT_PACKAGE_BYTES,
  type ProjectPackage,
} from "@/adapters/project-package";
import { emptyProjectContext } from "@/adapters/project-context-file";
import { downloadLocalBlob } from "@/adapters/local-download";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function EditorFiles({
  model,
  policy,
  dirty,
  onLoad,
  onDownloadRequested,
  projectPackage,
  onProjectLoad,
}: {
  model: Model;
  policy: EditingPolicy;
  dirty: boolean;
  onLoad: (model: Model) => void;
  onDownloadRequested?: () => void;
  projectPackage?: ProjectPackage;
  onProjectLoad?: (project: ProjectPackage) => void;
}) {
  const [pending, setPending] = useState<ProjectPackage | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const latest = useRef({ model, dirty });
  const readSequence = useRef(0);
  useEffect(() => {
    latest.current = { model, dirty };
  }, [model, dirty]);
  useEffect(
    () => () => {
      readSequence.current += 1;
    },
    [],
  );
  function load(next: ProjectPackage) {
    if (onProjectLoad) onProjectLoad(next);
    else onLoad(next.snapshot.model);
    setPending(null);
    setMessage(
      `Loaded ${next.snapshot.model.title} locally: ${next.snapshot.model.instances.length} parts. Undo history starts here.`,
    );
  }
  return (
    <section aria-label="Local project files" className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Backups include your model, brief, reference images and scales, and edited instructions.
        PDFs keep their names and metadata only. Undo history and camera positions are not included.
        Keep a backup outside this browser; clearing browser data also removes local saves.
      </p>
      <Button
        disabled={downloading}
        onClick={async () => {
          setDownloading(true);
          try {
            downloadLocalBlob(
              new Blob(
                [
                  await serializeProjectPackage(
                    projectPackage ?? { snapshot: { model }, context: emptyProjectContext() },
                  ),
                ],
                { type: "application/json" },
              ),
              `${model.id}.brikuma.json`,
            );
            onDownloadRequested?.();
            setMessage(
              `Backup download requested for ${model.revision}. Check your files before replacing work.`,
            );
            setError("");
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "The browser could not create a project backup. Your work is unchanged.",
            );
          } finally {
            setDownloading(false);
          }
        }}
      >
        {downloading ? "Preparing backup…" : "Download project file"}
      </Button>
      <label className="block text-sm">
        Load project file
        <input
          className="mt-2 block w-full min-w-0 text-xs"
          type="file"
          accept=".json,.brikuma,application/json"
          disabled={reading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!file.size || file.size > PROJECT_PACKAGE_BYTES) {
              setError("Choose a nonempty project file no larger than 96 MiB.");
              return;
            }
            setReading(true);
            const sequence = ++readSequence.current;
            setError("");
            setMessage("");
            try {
              const result = await parseProjectPackage(await file.text(), policy);
              if (sequence !== readSequence.current) return;
              if (!result.ok) {
                setError(result.error);
                return;
              }
              if (latest.current.dirty || latest.current.model !== model) setPending(result.value);
              else load(result.value);
            } catch {
              if (sequence === readSequence.current)
                setError("This file could not be read. The current model is unchanged.");
            } finally {
              if (sequence === readSequence.current) setReading(false);
            }
          }}
        />
      </label>
      {reading && (
        <p role="status" className="text-xs">
          Reading local project…
        </p>
      )}
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Replace this local model?"
        description="This file has been validated. Loading it replaces the current model, brief, references and instructions, and starts a new undo history. Download a project backup first to keep your current work. Legacy scene files contain only geometry."
      >
        <p className="mb-4 text-sm">
          {pending?.snapshot.model.title} · {pending?.snapshot.model.instances.length} parts
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              if (pending) load(pending);
            }}
          >
            Replace with file
          </Button>
          <Button onClick={() => setPending(null)}>Keep current model</Button>
        </div>
      </Dialog>
    </section>
  );
}
