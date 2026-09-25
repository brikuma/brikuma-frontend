"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { ProjectId } from "@/fixtures/projects";
import { validateEditorReference } from "@/adapters/local-reference";
import {
  emptyProjectContext,
  decodeProjectContext,
  validateReference,
  snapshotProjectContext,
  type ProjectBrief,
  type ProjectReference,
  type ProjectContextState,
} from "@/adapters/project-context-file";

export { referenceTypes, validateReference } from "@/adapters/project-context-file";
export type {
  ProjectBrief,
  ProjectReference,
  ProjectContextState,
} from "@/adapters/project-context-file";

type ProjectContext = ProjectContextState;
function hasProjectContext(project: ProjectContext) {
  const defaults = emptyProjectContext().brief;
  return (
    project.references.length > 0 ||
    Object.keys(project.calibrations).length > 0 ||
    (Object.keys(defaults) as (keyof ProjectBrief)[]).some(
      (key) => project.brief[key] !== defaults[key],
    )
  );
}

export type ProjectContexts = Partial<Record<ProjectId, ProjectContext>>;
type ContextValue = {
  projects: ProjectContexts;
  initialized: boolean;
  referenceErrors: Partial<Record<ProjectId, string>>;
  update: (projectId: ProjectId, change: (current: ProjectContext) => ProjectContext) => void;
  addReferences: (
    projectId: ProjectId,
    files: readonly File[],
    imagesOnly?: boolean,
  ) => { added: ProjectReference[]; error: string };
  removeReference: (projectId: ProjectId, id: number) => void;
  clearProjectContext: (projectId: ProjectId) => void;
  replaceProjectContext: (projectId: ProjectId, context: ProjectContextState) => void;
};

const Context = createContext<ContextValue | null>(null);

/** Briefs and local references share one state owner, independently of model revisions. */
export function ProjectContextProvider({
  children,
  initialProjects = {},
  onChange,
}: {
  children: ReactNode;
  initialProjects?: ProjectContexts;
  onChange?: (projects: ProjectContexts) => void;
}) {
  const initial = useRef(initialProjects);
  const [projects, setProjects] = useState<ProjectContexts>(initialProjects);
  const [initialized, setInitialized] = useState(false);
  const [referenceErrors, setReferenceErrors] = useState<Partial<Record<ProjectId, string>>>({});
  const ownedReferences = useRef(
    new Map<string, { projectId: ProjectId; url?: string; blob?: Blob }>(),
  );
  const counter = useRef(0);
  const mounted = useRef(false);

  function prepare(projectId: ProjectId, data: ProjectContextState) {
    const prepared: ProjectContextState = snapshotProjectContext(data);
    const owned: { key: string; projectId: ProjectId; url?: string; blob?: Blob }[] = [];
    let error = "";
    prepared.references = prepared.references.map((reference) => {
      counter.current = Math.max(counter.current, reference.id + 1);
      let url: string | undefined;
      try {
        if (reference.blob) url = URL.createObjectURL(reference.blob);
      } catch {
        error =
          "A reference preview could not be opened. Its image data is retained; download a project backup before closing.";
      }
      owned.push({ key: `${projectId}:${reference.id}`, projectId, url, blob: reference.blob });
      return {
        ...reference,
        ...(url ? { url } : {}),
        ...(data.references.find((item) => item.id === reference.id)?.validated
          ? { validated: true }
          : {}),
      };
    });
    return { prepared, owned, error };
  }

  useEffect(() => {
    const owned = ownedReferences.current;
    let live = true;
    mounted.current = true;
    // Defer resource ownership until the committed mount survives Strict Mode's cleanup.
    void Promise.resolve()
      .then(() => {
        if (!live) return;
        const restored: ProjectContexts = {};
        const errors: Partial<Record<ProjectId, string>> = {};
        for (const id of Object.keys(initial.current) as ProjectId[]) {
          const data = initial.current[id];
          if (!data) continue;
          const next = prepare(id, data);
          restored[id] = next.prepared;
          next.owned.forEach(({ key, ...reference }) => owned.set(key, reference));
          if (next.error) errors[id] = next.error;
        }
        setProjects(restored);
        setReferenceErrors(errors);
        setInitialized(true);
      })
      .catch(() => {
        if (!live) return;
        setReferenceErrors(
          Object.fromEntries(
            Object.keys(initial.current).map((id) => [
              id,
              "References could not be prepared. Original image data is retained; download a backup before closing.",
            ]),
          ),
        );
        setInitialized(true);
      });
    return () => {
      live = false;
      mounted.current = false;
      owned.forEach(({ url }) => {
        if (url) URL.revokeObjectURL(url);
      });
      owned.clear();
    };
  }, []);

  useEffect(() => {
    if (initialized) onChange?.(projects);
  }, [initialized, onChange, projects]);

  function update(projectId: ProjectId, change: (current: ProjectContext) => ProjectContext) {
    setProjects((current) => {
      const previous = current[projectId] ?? emptyProjectContext();
      const next = change(previous);
      return next === previous ? current : { ...current, [projectId]: next };
    });
  }

  function release(projectId: ProjectId, id: number) {
    const key = `${projectId}:${id}`;
    const owned = ownedReferences.current.get(key);
    if (!owned || owned.projectId !== projectId) return;
    if (owned.url) URL.revokeObjectURL(owned.url);
    ownedReferences.current.delete(key);
  }

  function clearOwned(projectId: ProjectId) {
    ownedReferences.current.forEach((owned, key) => {
      if (owned.projectId !== projectId) return;
      if (owned.url) URL.revokeObjectURL(owned.url);
      ownedReferences.current.delete(key);
    });
  }

  function checkImage(projectId: ProjectId, reference: ProjectReference) {
    if (!reference.blob) return;
    const blob = reference.blob;
    const key = `${projectId}:${reference.id}`;
    const stored = {
      id: reference.id,
      filename: reference.filename,
      type: reference.type,
      size: reference.size,
      blob,
    };
    void decodeProjectContext({ ...emptyProjectContext(), references: [stored] }).then((result) => {
      if (!mounted.current || ownedReferences.current.get(key)?.blob !== blob) return;
      if (result.ok) {
        const decoded = result.value.references[0];
        update(projectId, (current) => ({
          ...current,
          references: current.references.map((item) =>
            item.id === reference.id && item.blob === blob
              ? { ...item, width: decoded.width, height: decoded.height, validated: true }
              : item,
          ),
        }));
      } else {
        release(projectId, reference.id);
        setReferenceErrors((current) => ({
          ...current,
          [projectId]: `${reference.filename}: ${result.error}`,
        }));
        update(projectId, (current) => {
          const calibrations = { ...current.calibrations };
          delete calibrations[reference.id];
          return {
            ...current,
            references: current.references.filter((item) => item.id !== reference.id),
            calibrations,
          };
        });
      }
    });
  }

  const value: ContextValue = {
    projects,
    initialized,
    referenceErrors,
    update,
    addReferences(projectId, files, imagesOnly = false) {
      const added: ProjectReference[] = [];
      let error = "";
      setReferenceErrors((current) => ({ ...current, [projectId]: "" }));
      const count = Array.from(ownedReferences.current.values()).filter(
        (reference) => reference.projectId === projectId,
      ).length;
      for (const file of files) {
        const invalid = (imagesOnly ? validateEditorReference : validateReference)(
          file,
          count + added.length,
        );
        if (invalid) {
          error = invalid;
          continue;
        }
        if (counter.current > 1_000_000_000) counter.current = 0;
        while (ownedReferences.current.has(`${projectId}:${counter.current}`))
          counter.current = (counter.current + 1) % 1_000_000_001;
        const id = counter.current++;
        const blob = file.type.startsWith("image/") ? file : undefined;
        let url: string | undefined;
        try {
          if (blob) url = URL.createObjectURL(blob);
        } catch {
          setReferenceErrors((current) => ({
            ...current,
            [projectId]: "The image preview could not be opened. Its local bytes are retained.",
          }));
        }
        ownedReferences.current.set(`${projectId}:${id}`, { projectId, url, blob });
        // PDFs retain metadata only. No file bytes are parsed or stored for them.
        added.push({
          id,
          filename: file.name,
          type: file.type,
          size: file.size,
          ...(blob ? { blob, validated: false } : {}),
          ...(url ? { url } : {}),
        });
      }
      if (added.length)
        update(projectId, (current) => ({
          ...current,
          references: [...current.references, ...added],
        }));
      added.forEach((reference) => checkImage(projectId, reference));
      return { added, error };
    },
    removeReference(projectId, id) {
      release(projectId, id);
      update(projectId, (current) => {
        const calibrations = { ...current.calibrations };
        delete calibrations[id];
        return {
          ...current,
          references: current.references.filter((reference) => reference.id !== id),
          calibrations,
        };
      });
    },
    clearProjectContext(projectId) {
      clearOwned(projectId);
      setReferenceErrors((current) => ({ ...current, [projectId]: "" }));
      update(projectId, emptyProjectContext);
    },
    replaceProjectContext(projectId, data) {
      const next = prepare(projectId, data);
      clearOwned(projectId);
      next.owned.forEach(({ key, ...reference }) => ownedReferences.current.set(key, reference));
      setReferenceErrors((current) => ({ ...current, [projectId]: next.error }));
      update(projectId, () => next.prepared);
    },
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProjectContexts() {
  const context = useContext(Context);
  if (!context) throw new Error("ProjectContextProvider is required for project context.");
  return {
    projects: context.projects,
    initialized: context.initialized,
    replaceProjectContext: context.replaceProjectContext,
    clearProjectContext: context.clearProjectContext,
    referenceErrors: context.referenceErrors,
  };
}

/** Read discovery metadata without loading scene geometry or exposing reference bytes. */
export function useProjectContextSummaries() {
  const context = useContext(Context);
  if (!context) throw new Error("ProjectContextProvider is required for project context.");
  return (Object.keys(context.projects) as ProjectId[]).flatMap((id) => {
    const project = context.projects[id];
    return project && hasProjectContext(project)
      ? [{ id, subject: project.brief.subject, referenceCount: project.references.length }]
      : [];
  });
}

export function useProjectContext(projectId: ProjectId) {
  const value = useContext(Context);
  if (!value) throw new Error("ProjectContextProvider is required for project context.");
  const context = value;
  const project = context.projects[projectId] ?? emptyProjectContext();
  function setter<Key extends keyof ProjectContext>(
    key: Key,
  ): Dispatch<SetStateAction<ProjectContext[Key]>> {
    return (change) =>
      context.update(projectId, (current) => {
        const value = typeof change === "function" ? change(current[key]) : change;
        return value === current[key] ? current : { ...current, [key]: value };
      });
  }
  return {
    ...project,
    hasContext: hasProjectContext(project),
    referenceError: context.referenceErrors[projectId] ?? "",
    setBrief: setter("brief"),
    setReferences: setter("references"),
    setCalibrations: setter("calibrations"),
    addReferences: (files: readonly File[], imagesOnly = false) =>
      context.addReferences(projectId, files, imagesOnly),
    removeReference: (id: number) => context.removeReference(projectId, id),
    clearProjectContext: () => context.clearProjectContext(projectId),
    replaceProjectContext: (data: ProjectContextState) =>
      context.replaceProjectContext(projectId, data),
    exportContext: () => snapshotProjectContext(project),
  };
}
