"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  applyCommand,
  acceptExperiment,
  type ExperimentPreview,
  createSession,
  undo,
  redo,
  type EditCommand,
  type ModelSession,
  type Model,
  generateBuildPlan,
  isBuildPlanCurrent,
  createBuildPlanSession,
  editBuildPlan,
  undoBuildPlan,
  redoBuildPlan,
  type BuildPlanEdit,
  type BuildPlanSession,
  type DraftBuildPlan,
  type ProjectSnapshot,
  parseProjectSnapshot,
} from "@/core/model/public";
import { editPolicy } from "@/fixtures/catalog";
import { loadScene } from "@/fixtures/load-scene";
import type { SceneFixture } from "@/fixtures/scene-types";
import { parseProjectId, type ProjectId } from "@/fixtures/projects";
import {
  ProjectContextProvider,
  useProjectContext,
  useProjectContexts,
  type ProjectContexts,
} from "@/features/project-brief/project-context";
import { loadWorkspace } from "@/adapters/workspace-storage";
import {
  parseWorkspaceProject,
  type ProjectPackage,
  type WorkspaceProject,
} from "@/adapters/project-package";
import { emptyProjectContext } from "@/adapters/project-context-file";
import { WorkspacePersistence } from "./workspace-persistence";

export interface DraftInstructions {
  readonly plan: DraftBuildPlan;
  readonly sourceModel: Model;
}
type Entry = {
  session: ModelSession;
  fixture: SceneFixture;
  instructions?: { sourceModel: Model; session: BuildPlanSession; restoredEdits?: boolean };
  needsMetadata?: boolean;
};
type State = Partial<Record<ProjectId, Entry>>;
type Action =
  | { type: "loaded"; id: ProjectId; fixture: SceneFixture }
  | { type: "update"; id: ProjectId; session: ModelSession }
  | { type: "reset"; id: ProjectId }
  | { type: "replace"; id: ProjectId; fixture: SceneFixture }
  | { type: "restore-file"; id: ProjectId; snapshot: ProjectSnapshot }
  | { type: "metadata"; id: ProjectId; baseline: Model; fixture?: SceneFixture }
  | { type: "instructions"; id: ProjectId; instructions: NonNullable<Entry["instructions"]> };
function reducer(state: State, action: Action): State {
  if (action.type === "restore-file")
    return { ...state, [action.id]: entryFromSnapshot(action.snapshot, action.snapshot.model) };
  if (action.type === "loaded")
    return state[action.id]
      ? state
      : {
          ...state,
          [action.id]: { fixture: action.fixture, session: createSession(action.fixture.model) },
        };
  if (action.type === "replace")
    return {
      ...state,
      [action.id]: { fixture: action.fixture, session: createSession(action.fixture.model) },
    };
  const entry = state[action.id];
  if (!entry) return state;
  if (action.type === "metadata")
    return entry.fixture.model === action.baseline
      ? {
          ...state,
          [action.id]: {
            ...entry,
            needsMetadata: false,
            fixture: action.fixture
              ? { ...action.fixture, model: entry.fixture.model }
              : entry.fixture,
          },
        }
      : state;
  if (action.type === "instructions")
    return { ...state, [action.id]: { ...entry, instructions: action.instructions } };
  return {
    ...state,
    [action.id]: {
      ...entry,
      session: action.type === "reset" ? createSession(entry.fixture.model) : action.session,
    },
  };
}
const Context = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);
function entryFromSnapshot(snapshot: ProjectSnapshot, baseline: Model): Entry {
  return {
    fixture: { model: baseline, variant: null, instructions: null },
    session: createSession(snapshot.model),
    instructions: snapshot.instructions
      ? {
          sourceModel: snapshot.instructions.sourceModel,
          session: createBuildPlanSession(snapshot.instructions.plan),
          restoredEdits: snapshot.instructions.edited,
        }
      : undefined,
  };
}
function entrySnapshot(entry: Entry): ProjectSnapshot {
  return {
    model: entry.session.present,
    instructions: entry.instructions
      ? {
          sourceModel: entry.instructions.sourceModel,
          plan: entry.instructions.session.present,
          edited:
            !!entry.instructions.restoredEdits ||
            entry.instructions.session.present !== entry.instructions.session.initial,
        }
      : undefined,
  };
}
type RestoredWorkspace = {
  state: State;
  projects: ProjectContexts;
  versions: Partial<Record<ProjectId, number>>;
  errors: Partial<Record<ProjectId, string>>;
  error: string;
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState<RestoredWorkspace | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const next: RestoredWorkspace = {
        state: {},
        projects: {},
        versions: {},
        errors: {},
        error: "",
      };
      try {
        const rows = await loadWorkspace();
        for (const row of rows) {
          const parsedId = parseProjectId(row.id);
          if (parsedId.invalid) continue;
          const id = parsedId.id;
          next.versions[id] = row.version;
          const result = await parseWorkspaceProject(row.payload, editPolicy);
          if (!result.ok) {
            next.errors[id] = result.error;
            continue;
          }
          next.projects[id] = result.value.context;
          if (result.value.snapshot && result.value.baseline)
            next.state[id] = {
              ...entryFromSnapshot(result.value.snapshot, result.value.baseline),
              needsMetadata: true,
            };
        }
      } catch (error) {
        next.error = error instanceof Error ? error.message : "Saved projects could not be read.";
      }
      if (live) setRestored(next);
    })();
    return () => {
      live = false;
    };
  }, []);
  if (!restored)
    return (
      <div className="page-wrap" role="status">
        Restoring your local workspace…
      </div>
    );
  return <RestoredSession restored={restored}>{children}</RestoredSession>;
}

function RestoredSession({
  children,
  restored,
}: {
  children: ReactNode;
  restored: RestoredWorkspace;
}) {
  const [state, dispatch] = useReducer(reducer, restored.state);
  return (
    <ProjectContextProvider initialProjects={restored.projects}>
      <Context.Provider value={{ state, dispatch }}>
        <PersistSession restored={restored} state={state}>
          {children}
        </PersistSession>
      </Context.Provider>
    </ProjectContextProvider>
  );
}
const emptyContext = emptyProjectContext();
function PersistSession({
  children,
  restored,
  state,
}: {
  children: ReactNode;
  restored: RestoredWorkspace;
  state: State;
}) {
  const { projects, initialized } = useProjectContexts();
  const documents = useMemo(() => {
    const result: Partial<Record<ProjectId, WorkspaceProject>> = {};
    const ids = new Set([...Object.keys(state), ...Object.keys(projects)] as ProjectId[]);
    for (const id of ids)
      result[id] = {
        snapshot: state[id] ? entrySnapshot(state[id]) : undefined,
        baseline: state[id]?.fixture.model,
        context: projects[id] ?? emptyContext,
      };
    return result;
  }, [state, projects]);
  return initialized ? (
    <WorkspacePersistence
      documents={documents}
      initialVersions={restored.versions}
      initialErrors={restored.errors}
      loadError={restored.error}
    >
      {children}
    </WorkspacePersistence>
  ) : (
    <div className="page-wrap" role="status">
      Restoring project references…
    </div>
  );
}
/** Read an already loaded session without loading geometry for the brief route. */
export function useProjectTitle(id: ProjectId) {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider is required");
  return context.state[id]?.session.present.title;
}

/** Summarize loaded slots; reading the workspace must never initialize a scene. */
export function useSessionSummaries() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider is required");
  return (Object.keys(context.state) as ProjectId[]).flatMap((id) => {
    const model = context.state[id]?.session.present;
    return model
      ? [
          {
            id,
            modelId: model.id,
            title: model.title,
            count: model.instances.length,
            revision: model.revision,
          },
        ]
      : [];
  });
}

export function useProject() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider is required");
  const params = useSearchParams();
  const { id, invalid } = parseProjectId(params.get("project"));
  const { clearProjectContext, hasContext, ...projectContext } = useProjectContext(id);
  const { replaceProjectContext } = useProjectContexts();
  const { state, dispatch } = context;
  const entry = state[id];
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let live = true;
    if (!entry)
      loadScene(id)
        .then((fixture) => {
          if (live) dispatch({ type: "loaded", id, fixture });
        })
        .catch(() => {
          if (live) setLoadError("The scene could not be loaded. Reload this view to retry.");
        });
    return () => {
      live = false;
    };
  }, [id, entry, dispatch]);
  useEffect(() => {
    let live = true;
    if (entry?.needsMetadata) {
      const baseline = entry.fixture.model;
      void loadScene(id)
        .then((fixture) => {
          const normalized = parseProjectSnapshot({ model: fixture.model }, editPolicy);
          if (live)
            dispatch({
              type: "metadata",
              id,
              baseline,
              fixture:
                normalized.ok && JSON.stringify(normalized.value.model) === JSON.stringify(baseline)
                  ? fixture
                  : undefined,
            });
        })
        .catch(() => {
          if (live) dispatch({ type: "metadata", id, baseline });
        });
    }
    return () => {
      live = false;
    };
  }, [id, entry, dispatch]);
  const command = useCallback(
    (value: EditCommand) => {
      if (!entry) return false;
      const result = applyCommand(entry.session, value, editPolicy);
      if (!result.ok) {
        setMessage(result.error.message);
        return false;
      }
      dispatch({ type: "update", id, session: result.value });
      setMessage("Local change applied. You can undo it.");
      return true;
    },
    [entry, id, dispatch],
  );
  function history(direction: "undo" | "redo") {
    if (!entry) return;
    const result = direction === "undo" ? undo(entry.session) : redo(entry.session);
    if (result.ok) {
      dispatch({ type: "update", id, session: result.value });
      setMessage(direction === "undo" ? "Change undone." : "Change restored.");
    } else setMessage(result.error.message);
  }
  const instructions = entry?.instructions;
  const hasInstructionEdits =
    !!instructions &&
    (!!instructions.restoredEdits || instructions.session.present !== instructions.session.initial);
  return {
    id,
    invalid,
    focus: params.get("focus"),
    entry,
    model: entry?.session.present,
    message,
    loadError,
    projectPackage: entry
      ? ({
          snapshot: entrySnapshot(entry),
          context: {
            brief: projectContext.brief,
            references: projectContext.references,
            calibrations: projectContext.calibrations,
          },
        } satisfies ProjectPackage)
      : undefined,
    draftInstructions: instructions
      ? { plan: instructions.session.present, sourceModel: instructions.sourceModel }
      : undefined,
    hasInstructionEdits,
    canUndoInstructions: !!instructions?.session.past.length,
    canRedoInstructions: !!instructions?.session.future.length,
    editInstructions: (edit: BuildPlanEdit) => {
      if (!entry || !instructions) return false;
      if (!isBuildPlanCurrent(entry.session.present, instructions.session.present)) {
        setMessage(
          "These instructions are out of date. Restore the source model or regenerate before editing.",
        );
        return false;
      }
      const result = editBuildPlan(instructions.session, edit);
      if (!result.ok) {
        setMessage(result.error.message);
        return false;
      }
      dispatch({
        type: "instructions",
        id,
        instructions: { ...instructions, session: result.value },
      });
      setMessage("Instruction edit applied. Your model is unchanged.");
      return true;
    },
    instructionsHistory: (direction: "undo" | "redo") => {
      if (!instructions) return false;
      const result =
        direction === "undo"
          ? undoBuildPlan(instructions.session)
          : redoBuildPlan(instructions.session);
      if (!result.ok) {
        setMessage(result.error.message);
        return false;
      }
      dispatch({
        type: "instructions",
        id,
        instructions: { ...instructions, session: result.value },
      });
      setMessage(direction === "undo" ? "Instruction edit undone." : "Instruction edit restored.");
      return true;
    },
    generateInstructions: (options: { replaceEdited?: boolean } = {}) => {
      if (!entry) return false;
      if (hasInstructionEdits && !options.replaceEdited) {
        setMessage(
          "Regenerating replaces your instruction edits. Confirm replacement before continuing.",
        );
        return false;
      }
      const result = generateBuildPlan(entry.session.present, editPolicy.parts);
      if (!result.ok) {
        setMessage(result.error.message);
        return false;
      }
      dispatch({
        type: "instructions",
        id,
        instructions: {
          session: createBuildPlanSession(result.value),
          sourceModel: entry.session.present,
        },
      });
      setMessage(
        `Generated ${result.value.steps.length} local instruction steps for this model revision.`,
      );
      return true;
    },
    hasContext,
    command,
    history,
    acceptExperiment: (preview: ExperimentPreview) => {
      if (!entry) return false;
      const result = acceptExperiment(entry.session, preview, editPolicy);
      if (!result.ok) {
        setMessage(result.error.message);
        return false;
      }
      dispatch({ type: "update", id, session: result.value });
      setMessage("Local experiment applied in one transaction.");
      return true;
    },
    replaceModel: (model: Model) => {
      clearProjectContext();
      dispatch({ type: "replace", id, fixture: { model, variant: null, instructions: null } });
      setMessage("Local project loaded. No upload or cloud save occurred.");
    },
    replaceProject: (project: ProjectPackage) => {
      replaceProjectContext(id, project.context);
      dispatch({ type: "restore-file", id, snapshot: project.snapshot });
      setMessage("Project restored from your file. Undo history starts here.");
    },
    replaceFixture: (fixture: SceneFixture) => {
      clearProjectContext();
      dispatch({ type: "replace", id, fixture });
      setMessage("Original local sample opened.");
    },
    reset: () => {
      dispatch({ type: "reset", id });
      setMessage("Baseline restored in this session.");
    },
  };
}
