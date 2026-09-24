"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseProject,
  serializeProject,
  type EditingPolicy,
  type Model,
} from "@/core/model/public";
import { downloadLocalBlob } from "@/adapters/local-download";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function EditorFiles({
  model,
  policy,
  dirty,
  onLoad,
}: {
  model: Model;
  policy: EditingPolicy;
  dirty: boolean;
  onLoad: (model: Model) => void;
}) {
  const [pending, setPending] = useState<Model | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
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
  function load(next: Model) {
    onLoad(next);
    setPending(null);
    setMessage(`Loaded ${next.title} locally: ${next.instances.length} parts.`);
  }
  return (
    <section aria-label="Local project files" className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Downloads preserve geometry and stable part IDs. Brief notes, reference files and manual
        reference scales are session-only and are not included. Loading another model clears them.
        No cloud save or automatic persistence.
      </p>
      <Button
        onClick={() => {
          try {
            downloadLocalBlob(
              new Blob([serializeProject(model)], { type: "application/json" }),
              `${model.id}.brikuma.json`,
            );
            setMessage(
              `Download requested for ${model.revision}. Keep the file to restore this model.`,
            );
            setError("");
          } catch {
            setError(
              "The browser could not create a local project download. Your model is unchanged.",
            );
          }
        }}
      >
        Download project file
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
            if (!file.size || file.size > 4 * 1024 * 1024) {
              setError("Choose a nonempty project file no larger than 4 MB.");
              return;
            }
            setReading(true);
            const sequence = ++readSequence.current;
            setError("");
            setMessage("");
            try {
              const result = parseProject(await file.text(), policy);
              if (sequence !== readSequence.current) return;
              if (!result.ok) {
                setError(result.error.message);
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
        description="The selected file has been validated. Loading it replaces your current model, undo history, brief and references. Download the geometry and copy any brief notes you need before replacing them. Reference files and scales are not included in downloads."
      >
        <p className="mb-4 text-sm">
          {pending?.title} · {pending?.instances.length} parts
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
