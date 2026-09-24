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

export type AssemblyViewMode = "roof" | "modules" | "layers";

export interface AssemblyOffset {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Authored display separation, not a certified connection or build-order contract. */
export interface AssemblyModuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly partIds: readonly string[];
  readonly offset: AssemblyOffset;
  readonly views: readonly AssemblyViewMode[];
}

export interface AssemblyViewMetadata {
  readonly modelId: string;
  readonly baselineRevision: string;
  readonly modules: readonly AssemblyModuleDefinition[];
  readonly fixedPartIds?: readonly string[];
}

export interface SceneFixture {
  readonly model: Model;
  readonly initiallyHiddenIds?: readonly string[];
  readonly variant: SampleVariant | null;
  readonly instructions: InstructionSample | null;
  readonly assemblyView?: AssemblyViewMetadata;
}
