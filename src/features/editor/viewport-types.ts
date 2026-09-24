import type { GridTransform, Model } from "@/core/model/public";

import type { AssemblyViewMetadata } from "./assembly-view";

export type CameraView = "iso" | "front" | "top" | "right";
export type RenderQuality = "studio" | "standard" | "low";
export type ViewportTool = "select" | "move";
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
  onSelect: (id: string) => void;
  hidden: readonly string[];
  placement?: PlacementPreview | null;
  onPlacementChange?: (transform: GridTransform) => void;
  onPlace?: (transform: GridTransform) => boolean;
  onCancelPlacement?: () => void;
  onMove?: (id: string, delta: { x: number; y: number; z: number }) => boolean;
}
