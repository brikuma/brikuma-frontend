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
import { validateEditorReference, type ReferenceCalibration } from "@/adapters/local-reference";

export type ProjectBrief = {
  subject: string;
  visualLanguage: string;
  constructionApproach: string;
  technique: string;
  maxPieces: string;
  footprint: string;
  colors: string;
  intendedUse: string;
};

export type ProjectReference = {
  id: number;
  filename: string;
  type: string;
  size: number;
  url?: string;
  width?: number;
  height?: number;
};

export const referenceTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export function validateReference(file: Pick<File, "type" | "size">, count: number): string | null {
  if (count >= 6) return "Choose up to six reference files.";
  if (!referenceTypes.includes(file.type))
    return "Use PNG, JPEG, WebP or PDF files. Other file types are not supported.";
  if (file.size > 10 * 1024 * 1024) return "Each reference must be 10 MB or smaller.";
  if (file.size === 0) return "Empty files cannot be used as references.";
  return null;
}

function emptyProject() {
  return {
    brief: {
      subject: "",
      visualLanguage: "Warm and minimal",
      constructionApproach: "Stud-based bricks",
      technique: "Upright stacking (supported subset)",
      maxPieces: "500",
      footprint: "Desktop · up to 32 × 32 studs",
      colors: "",
      intendedUse: "Display",
    } satisfies ProjectBrief,
    references: [] as ProjectReference[],
    calibrations: {} as Record<number, ReferenceCalibration>,
  };
}

type ProjectContext = ReturnType<typeof emptyProject>;
type Projects = Partial<Record<ProjectId, ProjectContext>>;
type ContextValue = {
  projects: Projects;
  update: (projectId: ProjectId, change: (current: ProjectContext) => ProjectContext) => void;
  addReferences: (
    projectId: ProjectId,
    files: readonly File[],
    imagesOnly?: boolean,
  ) => { added: ProjectReference[]; error: string };
  removeReference: (projectId: ProjectId, id: number) => void;
  clearProjectContext: (projectId: ProjectId) => void;
};

const Context = createContext<ContextValue | null>(null);

/** Briefs and local references share the browser session, independently of model revisions. */
export function ProjectContextProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Projects>({});
  const ownedReferences = useRef(new Map<number, { projectId: ProjectId; url?: string }>());
  const counter = useRef(0);

  useEffect(() => {
    const owned = ownedReferences.current;
    return () => {
      owned.forEach(({ url }) => {
        if (url) URL.revokeObjectURL(url);
      });
      owned.clear();
    };
  }, []);

  function update(projectId: ProjectId, change: (current: ProjectContext) => ProjectContext) {
    setProjects((current) => ({
      ...current,
      [projectId]: change(current[projectId] ?? emptyProject()),
    }));
  }

  function release(projectId: ProjectId, id: number) {
    const owned = ownedReferences.current.get(id);
    if (!owned || owned.projectId !== projectId) return;
    if (owned.url) URL.revokeObjectURL(owned.url);
    ownedReferences.current.delete(id);
  }

  const value: ContextValue = {
    projects,
    update,
    addReferences(projectId, files, imagesOnly = false) {
      const added: ProjectReference[] = [];
      let error = "";
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
        const id = counter.current++;
        const url = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        ownedReferences.current.set(id, { projectId, url });
        // PDFs retain metadata only. No file bytes are parsed or stored for them.
        added.push({ id, filename: file.name, type: file.type, size: file.size, url });
      }
      if (added.length)
        update(projectId, (current) => ({
          ...current,
          references: [...current.references, ...added],
        }));
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
      ownedReferences.current.forEach((owned, id) => {
        if (owned.projectId === projectId) release(projectId, id);
      });
      update(projectId, emptyProject);
    },
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProjectContext(projectId: ProjectId) {
  const value = useContext(Context);
  if (!value) throw new Error("ProjectContextProvider is required for project context.");
  const context = value;
  const project = context.projects[projectId] ?? emptyProject();
  function setter<Key extends keyof ProjectContext>(
    key: Key,
  ): Dispatch<SetStateAction<ProjectContext[Key]>> {
    return (change) =>
      context.update(projectId, (current) => ({
        ...current,
        [key]: typeof change === "function" ? change(current[key]) : change,
      }));
  }
  const defaults = emptyProject().brief;
  const hasContext =
    project.references.length > 0 ||
    Object.keys(project.calibrations).length > 0 ||
    (Object.keys(defaults) as (keyof ProjectBrief)[]).some(
      (key) => project.brief[key] !== defaults[key],
    );
  return {
    ...project,
    hasContext,
    setBrief: setter("brief"),
    setReferences: setter("references"),
    setCalibrations: setter("calibrations"),
    addReferences: (files: readonly File[], imagesOnly = false) =>
      context.addReferences(projectId, files, imagesOnly),
    removeReference: (id: number) => context.removeReference(projectId, id),
    clearProjectContext: () => context.clearProjectContext(projectId),
  };
}
