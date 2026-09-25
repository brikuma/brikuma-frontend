import {
  defaultBuildStepDescription,
  defaultBuildStepTitle,
  type DraftBuildPlan,
  type DraftBuildStep,
} from "./build-plan";
import { failure } from "./model";
import type { Result } from "./types";

export type BuildPlanEdit =
  | {
      readonly type: "update-step";
      readonly stepId: string;
      readonly title?: string;
      readonly description?: string;
      readonly view?: DraftBuildStep["view"];
    }
  | {
      readonly type: "move-step";
      readonly stepId: string;
      readonly direction: "earlier" | "later";
    }
  | {
      readonly type: "split-step";
      readonly stepId: string;
      readonly partIds: readonly string[];
      readonly newStepId: string;
    }
  | { readonly type: "merge-next"; readonly stepId: string };

export const isValidBuildStepId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);
export const isValidBuildStepTitle = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= 120 &&
  !/[\u0000-\u001f\u007f]/.test(value);
export const isValidBuildStepDescription = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 2000 &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);

const validText = (step: DraftBuildStep) =>
  isValidBuildStepTitle(step.title) &&
  isValidBuildStepDescription(step.description) &&
  (step.view === "isometric" || step.view === "top");

const pieceLabel = (count: number) => `${count} ${count === 1 ? "piece" : "pieces"}`;
const hasDefaultTitle = (step: DraftBuildStep) =>
  step.title === defaultBuildStepTitle(step.layerIndex, step.newPartIds.length) ||
  step.title === `Combined step · ${pieceLabel(step.newPartIds.length)}`;
const splitCopy = (step: DraftBuildStep, count: number, continued: boolean) => ({
  title: hasDefaultTitle(step)
    ? step.title.startsWith("Combined step ·")
      ? `Combined step · ${pieceLabel(count)}`
      : defaultBuildStepTitle(step.layerIndex, count)
    : continued
      ? `${step.title.slice(0, 108)} (continued)`
      : step.title,
  description:
    step.description === defaultBuildStepDescription(step.newPartIds.length)
      ? defaultBuildStepDescription(count)
      : step.description,
});

function hasExactMembership(plan: DraftBuildPlan): boolean {
  const ids = new Set<string>();
  const steps = new Set<string>();
  const visible: string[] = [];
  for (const step of plan.steps) {
    if (
      !isValidBuildStepId(step.id) ||
      steps.has(step.id) ||
      !step.newPartIds.length ||
      !validText(step)
    )
      return false;
    steps.add(step.id);
    for (const id of step.newPartIds) {
      if (!id.trim() || ids.has(id)) return false;
      ids.add(id);
      visible.push(id);
    }
    if (
      step.visiblePartIds.length !== visible.length ||
      step.visiblePartIds.some((id, index) => id !== visible[index])
    )
      return false;
  }
  return plan.steps.length > 0 && ids.size === plan.pieceCount;
}

/** Editorial operations preserve exact logical membership and never touch source geometry. */
export function applyBuildPlanEdit(
  plan: DraftBuildPlan,
  edit: BuildPlanEdit,
): Result<DraftBuildPlan> {
  if (!hasExactMembership(plan))
    return failure("invalid-model", "Instruction steps must contain every piece exactly once.");
  const index = plan.steps.findIndex((step) => step.id === edit.stepId);
  if (index < 0) return failure("invalid-model", "Choose an existing instruction step.");
  const step = plan.steps[index];
  const steps = [...plan.steps];
  switch (edit.type) {
    case "update-step": {
      const updated = {
        ...step,
        title: edit.title === undefined ? step.title : edit.title.trim(),
        description: edit.description ?? step.description,
        view: edit.view ?? step.view,
      };
      if (!validText(updated))
        return failure(
          "invalid-model",
          "Use a step title of 1–120 characters, notes up to 2,000 characters and a supported view. Remove unsupported control characters.",
        );
      if (
        updated.title === step.title &&
        updated.description === step.description &&
        updated.view === step.view
      )
        return failure("no-change", "The instruction step is unchanged.");
      steps[index] = updated;
      break;
    }
    case "move-step": {
      const destination = index + (edit.direction === "earlier" ? -1 : 1);
      if (destination < 0 || destination >= steps.length)
        return failure("no-change", "This instruction step cannot move further.");
      [steps[index], steps[destination]] = [steps[destination], steps[index]];
      break;
    }
    case "split-step": {
      const selected = new Set(edit.partIds);
      if (
        !selected.size ||
        selected.size !== edit.partIds.length ||
        selected.size >= step.newPartIds.length ||
        edit.partIds.some((id) => !step.newPartIds.includes(id))
      )
        return failure(
          "invalid-model",
          "Choose some of this step's pieces and leave at least one.",
        );
      if (
        !isValidBuildStepId(edit.newStepId) ||
        plan.steps.some((item) => item.id === edit.newStepId)
      )
        return failure(
          "duplicate-id",
          "The new instruction step needs a unique identity of up to 128 letters, digits, underscores or hyphens, starting with a letter or digit.",
        );
      steps.splice(
        index,
        1,
        {
          ...step,
          ...splitCopy(step, step.newPartIds.length - selected.size, false),
          newPartIds: step.newPartIds.filter((id) => !selected.has(id)),
        },
        {
          ...step,
          id: edit.newStepId,
          ...splitCopy(step, selected.size, true),
          newPartIds: step.newPartIds.filter((id) => selected.has(id)),
        },
      );
      break;
    }
    case "merge-next": {
      const next = steps[index + 1];
      if (!next) return failure("no-change", "There is no following step to merge.");
      const count = step.newPartIds.length + next.newPartIds.length;
      const description =
        step.description === defaultBuildStepDescription(step.newPartIds.length) &&
        next.description === defaultBuildStepDescription(next.newPartIds.length)
          ? defaultBuildStepDescription(count)
          : [step.description, next.description].filter(Boolean).join("\n\n");
      if (description.length > 2000)
        return failure("invalid-model", "Shorten the step notes before merging them.");
      steps.splice(index, 2, {
        ...step,
        title:
          hasDefaultTitle(step) && hasDefaultTitle(next)
            ? `Combined step · ${pieceLabel(count)}`
            : step.title,
        description,
        newPartIds: [...step.newPartIds, ...next.newPartIds],
      });
      break;
    }
  }
  const visible: string[] = [];
  return {
    ok: true,
    value: {
      ...plan,
      steps: steps.map((item) => {
        visible.push(...item.newPartIds);
        return { ...item, visiblePartIds: [...visible] };
      }),
    },
  };
}
