import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Box3, CanvasTexture, OrthographicCamera, Sprite, SRGBColorSpace, Vector3 } from "three";
import {
  formatCentimeters,
  type GridTransform,
  type Model,
  type PartInstance,
} from "@/core/model/public";
import { partDefinitions } from "@/fixtures/catalog";
import { ZERO_ASSEMBLY_OFFSET, type AssemblyOffset } from "../assembly-view";

type Point = [number, number, number];

function DimensionLabel({ position, label }: { position: Point; label: string }) {
  const sprite = useRef<Sprite>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 44;
    const context = canvas.getContext("2d");
    if (context) {
      const style = getComputedStyle(document.documentElement);
      context.fillStyle = style.getPropertyValue("--background").trim();
      context.beginPath();
      context.roundRect(0, 0, 160, 44, 8);
      context.fill();
      context.fillStyle = style.getPropertyValue("--foreground").trim();
      context.font = "24px ui-monospace, monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, 80, 23);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [label]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }) => {
    if (sprite.current && camera instanceof OrthographicCamera)
      sprite.current.scale.set(80 / camera.zoom, 22 / camera.zoom, 1);
  });
  return (
    <sprite ref={sprite} position={position} renderOrder={20} raycast={() => null}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function Dimension({
  from,
  to,
  label,
  color,
  tick,
}: {
  from: Point;
  to: Point;
  label: string;
  color: string;
  tick: Point;
}) {
  const midpoint = from.map((value, axis) => (value + to[axis]) / 2) as Point;
  const markers = [from, to].flatMap((point) => [
    point.map((value, axis) => value - tick[axis]) as Point,
    point.map((value, axis) => value + tick[axis]) as Point,
  ]);
  return (
    <group>
      <Line points={[from, to, ...markers]} segments color={color} lineWidth={0.8} />
      <DimensionLabel position={midpoint} label={label} />
    </group>
  );
}

/** Metric labels use the nominal demo pitch; geometry remains in canonical model units. */
export function ModelDimensions({
  bounds,
  part,
  model,
  offsets,
  color,
  transform,
}: {
  bounds: Box3;
  part?: PartInstance;
  model: Model;
  offsets: ReadonlyMap<string, AssemblyOffset>;
  color: string;
  transform?: GridTransform;
}) {
  const definition = partDefinitions.find((entry) => entry.id === part?.partId);
  let measured = bounds;
  if (part && definition) {
    const position = transform ?? part.transform;
    const turned = position.rotation % 180 !== 0;
    const halfX = (turned ? definition.depth : definition.width) / 2;
    const halfZ = (turned ? definition.width : definition.depth) / 2;
    const offset = offsets.get(part.id) ?? ZERO_ASSEMBLY_OFFSET;
    const y = position.y + offset.y;
    measured = new Box3(
      new Vector3(
        position.x + offset.x - halfX,
        y - definition.height / 2,
        position.z + offset.z - halfZ,
      ),
      new Vector3(
        position.x + offset.x + halfX,
        y + definition.height / 2,
        position.z + offset.z + halfZ,
      ),
    );
  }
  if (measured.isEmpty() || !model.instances.length) return null;
  const { min, max } = measured;
  const span = measured.getSize(new Vector3());
  const margin = part ? 0.45 : 1.1;
  const y = Math.max(0.05, min.y);
  const label = (value: number) => `${formatCentimeters(value)} cm`;
  return (
    <group userData={{ studioHelper: true }}>
      <Dimension
        from={[min.x, y, max.z + margin]}
        to={[max.x, y, max.z + margin]}
        tick={[0.12, 0, 0.22]}
        label={label(span.x)}
        color={color}
      />
      <Dimension
        from={[max.x + margin, y, min.z]}
        to={[max.x + margin, y, max.z]}
        tick={[0.22, 0, 0.12]}
        label={label(span.z)}
        color={color}
      />
      {part && (
        <Dimension
          from={[max.x + margin, min.y, min.z]}
          to={[max.x + margin, max.y, min.z]}
          tick={[0.2, 0, 0]}
          label={label(span.y)}
          color={color}
        />
      )}
    </group>
  );
}
