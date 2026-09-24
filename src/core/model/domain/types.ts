export type QuarterTurn = 0 | 90 | 180 | 270;

export interface GridTransform {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotation: QuarterTurn;
}

export interface PartDefinition {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly studs: boolean;
  /** Authored nominal geometry shared by diagnostics and the renderer, never a physical certificate. */
  readonly geometryProfile?: "receiving-slope-v1" | "framed-door-v1";
  readonly shape:
    | "brick"
    | "plate"
    | "slope"
    | "door-assembly"
    | "cylinder"
    | "arch"
    | "arch-panel"
    | "arch-spandrel"
    | "leaf"
    | "leaf-upright"
    | "planter"
    | "roof-tile"
    | "branch";
}

export interface PartInstance {
  readonly id: string;
  readonly partId: string;
  readonly colorId: string;
  readonly groupId: string;
  readonly transform: GridTransform;
}

export interface Subassembly {
  readonly id: string;
  readonly name: string;
  readonly protected: boolean;
  readonly parentId?: string;
}

export interface Model {
  readonly id: string;
  readonly title: string;
  readonly baselineRevision: string;
  readonly revision: string;
  readonly instances: readonly PartInstance[];
  readonly groups: readonly Subassembly[];
}

export interface EditingPolicy {
  readonly parts: readonly PartDefinition[];
  readonly colors: readonly string[];
  readonly maxInstances: number;
  readonly historyLimit: number;
  readonly bounds: number;
}

export interface DomainError {
  readonly code:
    | "invalid-model"
    | "invalid-transform"
    | "unknown-part"
    | "unknown-color"
    | "unknown-instance"
    | "unknown-group"
    | "duplicate-id"
    | "protected-group"
    | "piece-limit"
    | "revision-conflict"
    | "group-cycle"
    | "occupied-volume"
    | "unsupported-connector"
    | "missing-connection"
    | "incompatible-footprint"
    | "invalid-file"
    | "unsupported-version"
    | "empty-history"
    | "no-change";
  readonly message: string;
}

export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DomainError };

export interface SampleVariant {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly baseRevision: string;
  readonly removeIds: readonly string[];
  readonly additions: readonly PartInstance[];
}

export interface VariantPreview {
  readonly pieceCount: number;
  readonly removedCount: number;
  readonly addedCount: number;
}

export type EditCommand =
  | {
      readonly type: "place";
      readonly instance: PartInstance;
      readonly placement: "connect" | "grid" | "free";
      readonly baseRevision: string;
    }
  | { readonly type: "remove-selection"; readonly ids: readonly string[] }
  | {
      readonly type: "recolor-selection";
      readonly ids: readonly string[];
      readonly colorId: string;
    }
  | {
      readonly type: "translate-selection";
      readonly ids: readonly string[];
      readonly delta: Readonly<{ x: number; y: number; z: number }>;
    }
  | {
      readonly type: "rotate-selection";
      readonly ids: readonly string[];
      readonly pivot: Readonly<{ x: number; y: number; z: number }>;
      readonly quarterTurns: 1 | -1;
    }
  | { readonly type: "create-group"; readonly group: Subassembly; readonly ids: readonly string[] }
  | { readonly type: "rename-group"; readonly groupId: string; readonly name: string }
  | { readonly type: "reparent-group"; readonly groupId: string; readonly parentId?: string }
  | { readonly type: "move-to-group"; readonly ids: readonly string[]; readonly groupId: string }
  | { readonly type: "replace-part"; readonly id: string; readonly partId: string }
  | {
      readonly type: "duplicate-selection";
      readonly ids: readonly string[];
      readonly newIds: readonly string[];
      readonly delta: Readonly<{ x: number; y: number; z: number }>;
    }
  | { readonly type: "add"; readonly instance: PartInstance }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "recolor"; readonly id: string; readonly colorId: string }
  | { readonly type: "set-transform"; readonly id: string; readonly transform: GridTransform }
  | { readonly type: "rotate"; readonly id: string; readonly quarterTurns: 1 | -1 }
  | {
      readonly type: "duplicate";
      readonly id: string;
      readonly newId: string;
      readonly transform: GridTransform;
    }
  | {
      readonly type: "translate";
      readonly id: string;
      readonly delta: Readonly<{ x: number; y: number; z: number }>;
    }
  | {
      readonly type: "set-protection";
      readonly groupId: string;
      readonly protected: boolean;
    }
  | { readonly type: "apply-variant"; readonly variant: SampleVariant };

export interface ModelSession {
  readonly present: Model;
  readonly past: readonly Model[];
  readonly future: readonly Model[];
  readonly nextRevision: number;
}

export interface BomLine {
  readonly partId: string;
  readonly colorId: string;
  readonly quantity: number;
}
