import type { GridTransform, Model } from "@/core/model/public";

import type { AssemblyViewMetadata } from "./assembly-view";

export type CameraView = "iso" | "front" | "back" | "top" | "bottom" | "left" | "right";
export type EditorMode = "build" | "inspect" | "present";
export type CameraProjection = "orthographic" | "perspective";
export interface ViewPlane {
  axis: "x" | "y" | "z";
  offset: number;
}
export interface RendererMetrics {
  frames: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  revision: string;
}
export interface CameraAction {
  serial: number;
  kind: "pan-left" | "pan-right" | "pan-up" | "pan-down" | "orbit-left" | "orbit-right";
}
export interface ImageExportRequest {
  serial: number;
  size: 1024 | 2048;
  transparent: boolean;
}
export type RenderQuality = "studio" | "standard" | "low";
export type ViewportTool = "select" | "move" | "rotate";
export interface PlacementPreview {
  partId: string;
  colorId: string;
  transform: GridTransform;
  target?: "surface" | "ground" | "free";
}
export interface ModelViewportProps {
  model: Model;
  assemblyView?: AssemblyViewMetadata;
  selected: string | null;
  selectedIds?: readonly string[];
  onSelect: (id: string, additive?: boolean) => void;
  onClearSelection?: () => void;
  multiSelect?: boolean;
  mode?: EditorMode;
  focusIds?: readonly string[];
  presentationIds?: readonly string[];
  mutedIds?: readonly string[];
  section?: ViewPlane | null;
  workplane?: ViewPlane;
  onCancelInteraction?: () => void;
  onMetrics?: (metrics: RendererMetrics) => void;
  hidden: readonly string[];
  placement?: PlacementPreview | null;
  onPlacementChange?: (transform: GridTransform) => void;
  onPlace?: (transform: GridTransform) => boolean;
  onCancelPlacement?: () => void;
  onMove?: (id: string, delta: { x: number; y: number; z: number }) => boolean;
  onRotate?: (id: string, degrees: 90 | -90) => boolean;
  onEditingLockChange?: (locked: boolean) => void;
  viewRequest?: { serial: number; view: CameraView };
  assembledResetRequest?: number;
  compactControls?: boolean;
}
