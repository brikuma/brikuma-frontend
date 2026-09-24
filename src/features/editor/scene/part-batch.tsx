import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { BoxGeometry, Color, EdgesGeometry, InstancedMesh, Object3D } from "three";
import type { GridTransform, PartDefinition, PartInstance } from "@/core/model/public";
import { colors, partDefinitions } from "@/fixtures/catalog";
import type { ModelViewportProps, RenderQuality } from "../viewport-types";
import { buildPartGeometry, buildStudGeometry } from "./part-geometry";
import { BODY_VERTICAL_CLEARANCE, STUD_HEIGHT } from "./brick-geometry";
import { ZERO_ASSEMBLY_OFFSET, type AssemblyOffset } from "../assembly-view";

export type ScenePointer = ThreeEvent<PointerEvent>;
export interface DragPreview {
  id: string;
  transform: GridTransform;
}
export function PartBatch({
  definition,
  parts,
  offsets,
  quality,
  drag,
  onPointer,
  onPick,
  onOver,
  onOut,
}: {
  definition: PartDefinition;
  parts: readonly PartInstance[];
  offsets: ReadonlyMap<string, AssemblyOffset>;
  quality: RenderQuality;
  drag: DragPreview | null;
  onPointer: (
    kind: "down" | "move" | "up" | "cancel",
    event: ScenePointer,
    part: PartInstance,
  ) => void;
  onPick: (event: ThreeEvent<MouseEvent>, part: PartInstance) => void;
  onOver: (id: string) => void;
  onOut: () => void;
}) {
  const body = useRef<InstancedMesh>(null);
  const studs = useRef<InstancedMesh>(null);
  const detailed = quality !== "low";
  const foliage = definition.shape === "leaf" || definition.shape === "leaf-upright";
  const geometry = useMemo(() => buildPartGeometry(definition, detailed), [definition, detailed]);
  const studGeometry = useMemo(() => buildStudGeometry(detailed), [detailed]);
  const studCount = definition.studs ? parts.length * definition.width * definition.depth : 0;
  const invalidate = useThree((state) => state.invalidate);
  useEffect(
    () => () => {
      geometry.dispose();
      studGeometry.dispose();
    },
    [geometry, studGeometry],
  );
  useLayoutEffect(() => {
    if (!body.current) return;
    const object = new Object3D();
    let studIndex = 0;
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const t = drag?.id === part.id ? drag.transform : part.transform;
      const color = new Color(
        colors.find((entry) => entry.id === part.colorId)?.hex ?? colors[0].hex,
      );
      const seed = [...part.id].reduce(
        (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
        7,
      );
      color.multiplyScalar(0.94 + ((seed % 101) / 100) * 0.11);
      const offset = offsets.get(part.id) ?? ZERO_ASSEMBLY_OFFSET;
      object.position.set(t.x + offset.x, t.y + offset.y, t.z + offset.z);
      object.rotation.set(0, (t.rotation * Math.PI) / 180, 0);
      object.updateMatrix();
      body.current.setMatrixAt(index, object.matrix);
      body.current.setColorAt(index, color);
      if (studs.current) {
        for (let x = 0; x < definition.width; x++)
          for (let z = 0; z < definition.depth; z++) {
            const dx = x - (definition.width - 1) / 2;
            const dz = z - (definition.depth - 1) / 2;
            const angle = (t.rotation * Math.PI) / 180;
            object.position.set(
              t.x + offset.x + dx * Math.cos(angle) + dz * Math.sin(angle),
              t.y + (definition.height - BODY_VERTICAL_CLEARANCE) / 2 + offset.y,
              t.z + offset.z - dx * Math.sin(angle) + dz * Math.cos(angle),
            );
            object.updateMatrix();
            studs.current.setMatrixAt(studIndex, object.matrix);
            studs.current.setColorAt(studIndex++, color);
          }
      }
    }
    for (const mesh of [body.current, studs.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
    invalidate();
  }, [definition, drag, offsets, invalidate, parts]);
  function instance(event: ThreeEvent<MouseEvent | PointerEvent>, isStud: boolean) {
    if (event.instanceId === undefined) return undefined;
    return parts[
      isStud
        ? Math.floor(event.instanceId / (definition.width * definition.depth))
        : event.instanceId
    ];
  }
  function handlers(isStud: boolean) {
    return {
      onClick: (event: ThreeEvent<MouseEvent>) => {
        const part = instance(event, isStud);
        if (part) onPick(event, part);
      },
      onPointerDown: (event: ScenePointer) => {
        const part = instance(event, isStud);
        if (part) onPointer("down", event, part);
      },
      onPointerMove: (event: ScenePointer) => {
        const part = instance(event, isStud);
        if (part) onPointer("move", event, part);
      },
      onPointerUp: (event: ScenePointer) => {
        const part = instance(event, isStud);
        if (part) onPointer("up", event, part);
      },
      onPointerCancel: (event: ScenePointer) => {
        const part = instance(event, isStud);
        if (part) onPointer("cancel", event, part);
      },
      onLostPointerCapture: (event: ScenePointer) => {
        const part = instance(event, isStud);
        if (part) onPointer("cancel", event, part);
      },
      onPointerOver: (event: ScenePointer) => {
        event.stopPropagation();
        const part = instance(event, isStud);
        if (part) onOver(part.id);
      },
      onPointerOut: onOut,
    };
  }
  return (
    <>
      <instancedMesh
        ref={body}
        args={[geometry, undefined, parts.length]}
        castShadow
        receiveShadow
        {...handlers(false)}
      >
        <meshPhysicalMaterial
          vertexColors={foliage}
          roughness={
            foliage
              ? 0.42
              : definition.shape === "roof-tile" || definition.shape === "planter"
                ? 0.5
                : 0.37
          }
          metalness={0}
          clearcoat={quality === "studio" ? 0.16 : 0}
          clearcoatRoughness={0.32}
          envMapIntensity={0.75}
        />
      </instancedMesh>
      {studCount > 0 && (
        <instancedMesh
          ref={studs}
          args={[studGeometry, undefined, studCount]}
          castShadow
          receiveShadow
          {...handlers(true)}
        >
          <meshPhysicalMaterial
            roughness={0.28}
            metalness={0}
            clearcoat={quality === "studio" ? 0.26 : 0}
            clearcoatRoughness={0.32}
            envMapIntensity={0.75}
          />
        </instancedMesh>
      )}
    </>
  );
}
export function PartOutline({
  part,
  offsets,
  transform,
  color,
  opacity = 1,
}: {
  part: PartInstance;
  offsets: ReadonlyMap<string, AssemblyOffset>;
  transform?: GridTransform;
  color: string;
  opacity?: number;
}) {
  const definition = partDefinitions.find((entry) => entry.id === part.partId);
  const geometry = useMemo(() => {
    const box = new BoxGeometry(
      (definition?.width ?? 1) + 0.05,
      (definition?.height ?? 1.2) + STUD_HEIGHT + 0.06,
      (definition?.depth ?? 1) + 0.05,
    );
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [definition]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const t = transform ?? part.transform;
  const offset = offsets.get(part.id) ?? ZERO_ASSEMBLY_OFFSET;
  return (
    <lineSegments
      geometry={geometry}
      position={[t.x + offset.x, t.y + offset.y, t.z + offset.z]}
      rotation={[0, (t.rotation * Math.PI) / 180, 0]}
      renderOrder={10}
      userData={{ studioHelper: true }}
    >
      <lineBasicMaterial color={color} depthTest={false} transparent opacity={opacity} />
    </lineSegments>
  );
}
export function PlacementGhost({
  placement,
  valid = true,
}: {
  placement: NonNullable<ModelViewportProps["placement"]>;
  valid?: boolean;
}) {
  const definition = partDefinitions.find((entry) => entry.id === placement.partId);
  const geometry = useMemo(() => (definition ? buildPartGeometry(definition) : null), [definition]);
  const studGeometry = useMemo(() => buildStudGeometry(true), []);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => () => studGeometry.dispose(), [studGeometry]);
  if (!geometry || !definition) return null;
  const t = placement.transform;
  return (
    <group
      position={[t.x, t.y, t.z]}
      rotation={[0, (t.rotation * Math.PI) / 180, 0]}
      userData={{ studioHelper: true }}
    >
      <mesh geometry={geometry} raycast={() => null} renderOrder={5}>
        <meshStandardMaterial
          color={valid ? colors.find((entry) => entry.id === placement.colorId)?.hex : "#de6363"}
          transparent
          opacity={0.62}
          depthWrite={false}
          roughness={0.3}
        />
      </mesh>
      {definition.studs &&
        Array.from({ length: definition.width * definition.depth }, (_, index) => (
          <mesh
            key={index}
            geometry={studGeometry}
            position={[
              Math.floor(index / definition.depth) - (definition.width - 1) / 2,
              (definition.height - BODY_VERTICAL_CLEARANCE) / 2,
              (index % definition.depth) - (definition.depth - 1) / 2,
            ]}
            raycast={() => null}
            renderOrder={5}
          >
            <meshStandardMaterial
              color={
                valid ? colors.find((entry) => entry.id === placement.colorId)?.hex : "#de6363"
              }
              transparent
              opacity={0.62}
              depthWrite={false}
              roughness={0.3}
            />
          </mesh>
        ))}
      <mesh
        position={[0, -definition.height / 2 + 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[definition.width + 0.12, definition.depth + 0.12]} />
        <meshBasicMaterial color={colors[5].hex} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}
