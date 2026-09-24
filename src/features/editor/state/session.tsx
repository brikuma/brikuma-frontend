"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
} from "@/core/model/public";
import { editPolicy } from "@/fixtures/catalog";
import { loadScene } from "@/fixtures/load-scene";
import type { SceneFixture } from "@/fixtures/scene-types";
import { parseProjectId, type ProjectId } from "@/fixtures/projects";

type Entry = { session: ModelSession; fixture: SceneFixture };
type State = Partial<Record<ProjectId, Entry>>;
type Action =
  | { type: "loaded"; id: ProjectId; fixture: SceneFixture }
  | { type: "update"; id: ProjectId; session: ModelSession }
  | { type: "reset"; id: ProjectId }
  | { type: "replace"; id: ProjectId; fixture: SceneFixture };
function reducer(state: State, action: Action): State {
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
  return {
    ...state,
    [action.id]: {
      ...entry,
      session: action.type === "reset" ? createSession(entry.fixture.model) : action.session,
    },
  };
}
const Context = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  return <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>;
}
export function useProject() {
  const context = useContext(Context);
  if (!context) throw new Error("SessionProvider is required");
  const params = useSearchParams();
  const { id, invalid } = parseProjectId(params.get("project"));
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
  return {
    id,
    invalid,
    focus: params.get("focus"),
    entry,
    model: entry?.session.present,
    message,
    loadError,
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
      dispatch({ type: "replace", id, fixture: { model, variant: null, instructions: null } });
      setMessage("Local project loaded. No upload or cloud save occurred.");
    },
    replaceFixture: (fixture: SceneFixture) => {
      dispatch({ type: "replace", id, fixture });
      setMessage("Original local sample opened.");
    },
    reset: () => {
      dispatch({ type: "reset", id });
      setMessage("Baseline restored in this session.");
    },
  };
}
