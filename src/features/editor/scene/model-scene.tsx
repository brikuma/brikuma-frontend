"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  CylinderGeometry,
  InstancedMesh,
  Object3D,
  Color,
  EdgesGeometry,
} from "three";
import type { Model, PartDefinition, PartInstance } from "@/core/model/public";
import { colors, partDefinitions } from "@/fixtures/catalog";

export interface SceneProps {
  model: Model;
  selected: string | null;
  onSelect: (id: string) => void;
  hidden: readonly string[];
  exploded: boolean;
  zoom: number;
  quality: "low" | "standard";
  onFailure: () => void;
  onReady: () => void;
}
function buildGeometry(definition: PartDefinition) {
  const { width: w, height: h, depth: d, shape } = definition;
  if (shape === "cylinder") {
    const geometry = new CylinderGeometry(
      w / 2 - 0.03,
      w / 2 - 0.03,
      definition.id.includes("wheel") ? 1.2 : h - 0.025,
      16,
    );
    if (definition.id.includes("wheel")) geometry.rotateZ(Math.PI / 2);
    return geometry;
  }
  if (shape === "slope") {
    const x = w / 2 - 0.025,
      z = d / 2 - 0.025,
      y = h / 2 - 0.015;
    const vertices = [
      -x,
      -y,
      -z,
      x,
      -y,
      -z,
      x,
      -y,
      z,
      -x,
      -y,
      z,
      -x,
      y,
      -z,
      x,
      y,
      -z,
      -x,
      -y + 0.06,
      z,
      x,
      -y + 0.06,
      z,
    ];
    const indices = [
      0, 2, 1, 0, 3, 2, 0, 1, 5, 0, 5, 4, 4, 5, 7, 4, 7, 6, 3, 6, 7, 3, 7, 2, 0, 4, 6, 0, 6, 3, 1,
      2, 7, 1, 7, 5,
    ];
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(
      indices.flatMap((_, index) =>
        index % 3 === 0 ? [indices[index], indices[index + 2], indices[index + 1]] : [],
      ),
    );
    geometry.computeVertexNormals();
    return geometry;
  }
  return new BoxGeometry(w - 0.04, h - 0.025, d - 0.04);
}
function yOffset(part: PartInstance, model: Model, exploded: boolean) {
  return exploded
    ? Math.max(
        0,
        model.groups.findIndex((group) => group.id === part.groupId),
      ) * 2
    : 0;
}
function PartBatch({
  definition,
  parts,
  model,
  exploded,
  onSelect,
}: {
  definition: PartDefinition;
  parts: readonly PartInstance[];
  model: Model;
  exploded: boolean;
  onSelect: (id: string) => void;
}) {
  const body = useRef<InstancedMesh>(null);
  const studs = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => buildGeometry(definition), [definition]);
  const studGeometry = useMemo(() => new CylinderGeometry(0.29, 0.29, 0.13, 12), []);
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
    const target = body.current;
    if (!target) return;
    const object = new Object3D();
    let studIndex = 0;
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const t = part.transform;
      const color = new Color(
        colors.find((color) => color.id === part.colorId)?.hex ?? colors[0].hex,
      );
      object.position.set(t.x, t.y + yOffset(part, model, exploded), t.z);
      object.rotation.set(0, (t.rotation * Math.PI) / 180, 0);
      object.updateMatrix();
      target.setMatrixAt(index, object.matrix);
      target.setColorAt(index, color);
      if (studs.current) {
        for (let x = 0; x < definition.width; x++)
          for (let z = 0; z < definition.depth; z++) {
            const dx = x - (definition.width - 1) / 2,
              dz = z - (definition.depth - 1) / 2,
              angle = (t.rotation * Math.PI) / 180;
            object.position.set(
              t.x + dx * Math.cos(angle) + dz * Math.sin(angle),
              t.y + definition.height / 2 + 0.06 + yOffset(part, model, exploded),
              t.z - dx * Math.sin(angle) + dz * Math.cos(angle),
            );
            object.updateMatrix();
            studs.current.setMatrixAt(studIndex, object.matrix);
            studs.current.setColorAt(studIndex, color);
            studIndex++;
          }
      }
    }
    for (const mesh of [target, studs.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
    invalidate();
  }, [parts, definition, model, exploded, invalidate]);
  function pick(event: ThreeEvent<MouseEvent>, isStud = false) {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    const index = isStud
      ? Math.floor(event.instanceId / (definition.width * definition.depth))
      : event.instanceId;
    const part = parts[index];
    if (part) onSelect(part.id);
  }
  return (
    <>
      <instancedMesh
        ref={body}
        args={[geometry, undefined, parts.length]}
        onClick={(event) => pick(event)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.67} metalness={0.02} />
      </instancedMesh>
      {studCount > 0 && (
        <instancedMesh
          ref={studs}
          args={[studGeometry, undefined, studCount]}
          onClick={(event) => pick(event, true)}
          castShadow
        >
          <meshStandardMaterial roughness={0.65} />
        </instancedMesh>
      )}
    </>
  );
}
function SceneContents(props: SceneProps) {
  const { model, hidden, selected, exploded, zoom, onSelect, onFailure, onReady } = props;
  const { size, gl } = useThree();
  const part = model.instances.find((p) => p.id === selected && !hidden.includes(p.groupId));
  const def = partDefinitions.find((d) => d.id === part?.partId);
  const outline = useMemo(
    () =>
      new EdgesGeometry(
        new BoxGeometry(def?.width ?? 1, (def?.height ?? 0.6) + 0.18, def?.depth ?? 1),
      ),
    [def],
  );
  const palette = useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      ground: styles.getPropertyValue("--background").trim(),
      grid: styles.getPropertyValue("--border").trim(),
      selection: styles.getPropertyValue("--selection").trim(),
    };
  }, []);
  useEffect(() => () => outline.dispose(), [outline]);
  useEffect(() => {
    const canvas = gl.domElement;
    const fail = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", fail);
    onReady();
    return () => canvas.removeEventListener("webglcontextlost", fail);
  }, [gl, onFailure, onReady]);
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[28, 25, 34]}
        zoom={
          Math.min(
            size.width / (model.id === "masseria" ? 44 : 24),
            size.height / (model.id === "masseria" ? 30 : 20),
          ) * zoom
        }
        near={0.1}
        far={300}
      />
      <color attach="background" args={[palette.ground]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={[colors[11].hex, colors[2].hex, 0.75]} />
      <directionalLight
        position={[-15, 30, 18]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-normalBias={0.04}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
      <gridHelper args={[80, 40, palette.grid, palette.grid]} position={[0, -0.035, 0]} />
      {partDefinitions.map((definition) => {
        const parts = model.instances.filter(
          (p) => p.partId === definition.id && !hidden.includes(p.groupId),
        );
        return parts.length ? (
          <PartBatch
            key={`${definition.id}-${parts.length}`}
            definition={definition}
            parts={parts}
            model={model}
            exploded={exploded}
            onSelect={onSelect}
          />
        ) : null;
      })}
      {part && (
        <lineSegments
          geometry={outline}
          position={[
            part.transform.x,
            part.transform.y + yOffset(part, model, exploded),
            part.transform.z,
          ]}
          rotation={[0, (part.transform.rotation * Math.PI) / 180, 0]}
        >
          <lineBasicMaterial color={palette.selection} depthTest={false} transparent opacity={1} />
        </lineSegments>
      )}
      <OrbitControls
        makeDefault
        target={[0, 2, 0]}
        enableDamping={false}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
        minZoom={4}
        maxZoom={100}
      />
    </>
  );
}
export default function ModelScene(props: SceneProps) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      shadows={props.quality === "standard"}
      dpr={props.quality === "low" ? 1 : [1, 1.5]}
      camera={{ position: [28, 25, 34], zoom: 16, near: 0.1, far: 300 }}
      gl={{ antialias: props.quality === "standard", powerPreference: "low-power" }}
      fallback={
        <p>
          Interactive brick model. Use Structure and the inspector for keyboard selection and
          editing.
        </p>
      }
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
