import type { Model, SampleVariant } from "../core/model/public";

export interface InstructionStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly visiblePartIds: readonly string[];
  readonly newPartIds: readonly string[];
  readonly callout: string;
  readonly preview: string;
}

export interface InstructionSample {
  readonly revision: string;
  readonly modelRevision: string;
  readonly title: string;
  readonly steps: readonly InstructionStep[];
}

export interface SceneFixture {
  readonly model: Model;
  readonly variant: SampleVariant | null;
  readonly instructions: InstructionSample | null;
}
