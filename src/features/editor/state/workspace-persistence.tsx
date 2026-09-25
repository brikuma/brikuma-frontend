"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { saveWorkspaceProject, WorkspaceStorageError } from "@/adapters/workspace-storage";
import {
  snapshotWorkspaceProject,
  WorkspaceReferencePendingError,
  type WorkspaceProject,
} from "@/adapters/project-package";
import { parseProjectId, projects, type ProjectId } from "@/fixtures/projects";
import { Button } from "@/components/ui/button";

export type WorkspaceSaveState = {
  status: "saved" | "saving" | "error";
  message: string;
  retryable?: boolean;
};
const Context = createContext<Partial<Record<ProjectId, WorkspaceSaveState>>>({});
export function useWorkspaceSaveStatus(id: ProjectId) {
  return useContext(Context)[id] ?? { status: "saved", message: "No local changes yet" };
}
export function ProjectSaveStatus({ id }: { id: string }) {
  const parsed = parseProjectId(id);
  const saving = useWorkspaceSaveStatus(parsed.id);
  if (parsed.invalid) return null;
  return (
    <p
      className="my-2 px-1 text-xs text-muted-foreground"
      aria-label="Local save status"
      aria-live="polite"
    >
      {saving.status === "error" ? "Not saved · download a backup" : saving.message}
    </p>
  );
}

function sameProject(a: WorkspaceProject | undefined, b: WorkspaceProject) {
  return (
    a?.snapshot?.model === b.snapshot?.model &&
    a?.snapshot?.instructions?.plan === b.snapshot?.instructions?.plan &&
    a?.snapshot?.instructions?.edited === b.snapshot?.instructions?.edited &&
    a?.baseline === b.baseline &&
    a?.context === b.context
  );
}

export function WorkspacePersistence({
  children,
  documents,
  initialVersions,
  initialErrors,
  loadError,
}: {
  children: ReactNode;
  documents: Partial<Record<ProjectId, WorkspaceProject>>;
  initialVersions: Partial<Record<ProjectId, number>>;
  initialErrors: Partial<Record<ProjectId, string>>;
  loadError: string;
}) {
  const versions = useRef({ ...initialVersions });
  const saved = useRef<Partial<Record<ProjectId, WorkspaceProject>>>({});
  const pending = useRef<Partial<Record<ProjectId, WorkspaceProject>>>({});
  const running = useRef(new Set<ProjectId>());
  const blocked = useRef(new Map<ProjectId, Error>());
  const attempted = useRef<Partial<Record<ProjectId, WorkspaceProject>>>({});
  const initialized = useRef(false);
  const live = useRef(false);
  const [retry, setRetry] = useState(0);
  const [states, setStates] = useState<Partial<Record<ProjectId, WorkspaceSaveState>>>({});

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    const ids = Object.keys(documents) as ProjectId[];
    if (!initialized.current) {
      initialized.current = true;
      for (const id of ids)
        if (initialVersions[id] !== undefined) saved.current[id] = documents[id];
    }
    function status(id: ProjectId, next: WorkspaceSaveState) {
      if (live.current) setStates((current) => ({ ...current, [id]: next }));
    }
    for (const id of ids) {
      const document = documents[id]!;
      const restoreError = loadError || initialErrors[id];
      if (restoreError) {
        status(id, { status: "error", message: "Not saved · download a backup" });
        pending.current[id] = document;
        continue;
      }
      if (running.current.has(id)) {
        pending.current[id] = document;
        continue;
      }
      if (blocked.current.has(id)) {
        pending.current[id] = document;
        const error = blocked.current.get(id)!;
        if (
          sameProject(attempted.current[id], document) ||
          (error instanceof WorkspaceStorageError && ["conflict", "corrupt"].includes(error.code))
        )
          continue;
        blocked.current.delete(id);
      }
      if (sameProject(saved.current[id], document)) {
        delete pending.current[id];
        status(id, { status: "saved", message: "Saved in this browser" });
        continue;
      }
      pending.current[id] = document;
      running.current.add(id);
      status(id, { status: "saving", message: "Saving in this browser…" });
      void (async () => {
        try {
          while (pending.current[id] && live.current) {
            const next = pending.current[id]!;
            delete pending.current[id];
            attempted.current[id] = next;
            const payload = snapshotWorkspaceProject(next);
            const version = await saveWorkspaceProject(id, payload, versions.current[id] ?? null);
            versions.current[id] = version;
            saved.current[id] = next;
          }
          status(id, { status: "saved", message: "Saved in this browser" });
        } catch (error) {
          if (error instanceof WorkspaceReferencePendingError) {
            status(id, { status: "saving", message: error.message });
            return;
          }
          const failure =
            error instanceof Error ? error : new Error("The browser could not save this project.");
          blocked.current.set(id, failure);
          status(id, {
            status: "error",
            message: failure.message,
            retryable:
              !(failure instanceof WorkspaceStorageError) ||
              !["conflict", "corrupt"].includes(failure.code),
          });
        } finally {
          running.current.delete(id);
        }
      })();
    }
  }, [documents, initialVersions, initialErrors, loadError, retry]);

  const unsaved = Object.values(states).some((state) => state?.status !== "saved");
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const errors = Object.entries(states).filter(([, state]) => state?.status === "error");
  const projectName = (id: string) =>
    documents[id as ProjectId]?.snapshot?.model.title ??
    projects.find((project) => project.id === id)?.title ??
    "Scratch workspace";
  return (
    <Context.Provider value={states}>
      {(loadError || Object.keys(initialErrors).length > 0 || errors.length > 0) && (
        <aside
          className="border-b border-danger/30 bg-surface px-4 py-3 text-sm"
          role="alert"
          aria-label="Local saving needs attention"
        >
          <p className="font-medium">Your work needs a backup</p>
          {loadError && <p>{loadError} Existing saved data has not been replaced.</p>}
          {Object.entries(initialErrors).map(([id, error]) => (
            <p key={id}>
              {projectName(id)}: {error} The saved copy is untouched.
            </p>
          ))}
          {errors
            .filter(([id]) => !loadError && !initialErrors[id as ProjectId])
            .map(([id, state]) => (
              <p key={id}>
                {projectName(id)}: {state?.message}
              </p>
            ))}
          <p>
            Download your project before leaving. Browser storage is local to this browser and
            address.
          </p>
          {!loadError &&
            errors.some(([id, state]) => !initialErrors[id as ProjectId] && state?.retryable) && (
              <Button
                className="mt-2"
                onClick={() => {
                  for (const [id, error] of blocked.current) {
                    if (
                      !(error instanceof WorkspaceStorageError) ||
                      !["conflict", "corrupt"].includes(error.code)
                    )
                      blocked.current.delete(id);
                  }
                  setRetry((value) => value + 1);
                }}
              >
                Retry local save
              </Button>
            )}
        </aside>
      )}
      {children}
    </Context.Provider>
  );
}
