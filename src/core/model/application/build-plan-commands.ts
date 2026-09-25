import { applyBuildPlanEdit, type BuildPlanEdit } from "../domain/build-plan-editing";
import type { DraftBuildPlan } from "../domain/build-plan";
import { failure } from "../domain/model";
import type { Result } from "../domain/types";

export interface BuildPlanSession {
  readonly present: DraftBuildPlan;
  readonly initial: DraftBuildPlan;
  readonly past: readonly DraftBuildPlan[];
  readonly future: readonly DraftBuildPlan[];
}

const HISTORY_LIMIT = 40;

export function createBuildPlanSession(plan: DraftBuildPlan): BuildPlanSession {
  return { present: plan, initial: plan, past: [], future: [] };
}

export function editBuildPlan(
  session: BuildPlanSession,
  edit: BuildPlanEdit,
): Result<BuildPlanSession> {
  const result = applyBuildPlanEdit(session.present, edit);
  return result.ok
    ? {
        ok: true,
        value: {
          ...session,
          present: result.value,
          past: [...session.past, session.present].slice(-HISTORY_LIMIT),
          future: [],
        },
      }
    : result;
}

export function undoBuildPlan(session: BuildPlanSession): Result<BuildPlanSession> {
  const previous = session.past.at(-1);
  if (!previous) return failure("empty-history", "No instruction edit to undo.");
  return {
    ok: true,
    value: {
      ...session,
      present: previous,
      past: session.past.slice(0, -1),
      future: [session.present, ...session.future],
    },
  };
}

export function redoBuildPlan(session: BuildPlanSession): Result<BuildPlanSession> {
  const next = session.future[0];
  if (!next) return failure("empty-history", "No instruction edit to redo.");
  return {
    ok: true,
    value: {
      ...session,
      present: next,
      past: [...session.past, session.present],
      future: session.future.slice(1),
    },
  };
}
