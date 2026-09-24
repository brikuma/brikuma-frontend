import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  Group,
  Mesh,
  MeshDepthMaterial,
  type Object3D,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
} from "three";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";

/**
 * Cached depth-and-blur contact shading with explicit GPU resource ownership.
 * Technique reference: Drei 10.7.8 ContactShadows (MIT, Poimandres).
 */
export function StudioContactShadow({
  position,
  scale,
  revision,
  enabled,
  color,
}: {
  position: [number, number, number];
  scale: number;
  revision: string;
  enabled: boolean;
  color: string;
}) {
  const group = useRef<Group>(null);
  const rendered = useRef("");
  const resources = useMemo(() => {
    const target = new WebGLRenderTarget(1024, 1024);
    const blurTarget = new WebGLRenderTarget(1024, 1024);
    target.texture.generateMipmaps = false;
    blurTarget.texture.generateMipmaps = false;
    const plane = new PlaneGeometry(scale, scale).rotateX(Math.PI / 2);
    const horizontal = new ShaderMaterial(HorizontalBlurShader);
    const vertical = new ShaderMaterial(VerticalBlurShader);
    const blurPlane = new Mesh(plane, horizontal);
    horizontal.depthTest = vertical.depthTest = false;
    const depth = new MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.contactColor = { value: new Color(color) };
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        "uniform vec3 contactColor;\nvoid main() {",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4( vec3( 1.0 - fragCoordZ ), opacity );",
        "vec4( contactColor, 1.0 - fragCoordZ );",
      );
    };
    const camera = new OrthographicCamera(-scale / 2, scale / 2, scale / 2, -scale / 2, 0, 10);
    camera.rotation.x = Math.PI / 2;
    return { target, blurTarget, plane, blurPlane, horizontal, vertical, depth, camera };
  }, [color, scale]);
  useEffect(
    () => () => {
      resources.target.dispose();
      resources.blurTarget.dispose();
      resources.plane.dispose();
      resources.horizontal.dispose();
      resources.vertical.dispose();
      resources.depth.dispose();
    },
    [resources],
  );
  const renderKey = `${revision}-${position.join("-")}-${scale}-${enabled}-${color}`;
  useFrame(({ gl, scene }) => {
    if (!enabled || !group.current) {
      rendered.current = "";
      return;
    }
    if (rendered.current === renderKey) return;
    const { target, blurTarget, blurPlane, horizontal, vertical, depth, camera } = resources;
    camera.position.set(...position);
    camera.updateMatrixWorld();
    const background = scene.background;
    const override = scene.overrideMaterial;
    const previousTarget = gl.getRenderTarget();
    const previousClear = gl.getClearColor(new Color());
    const previousAlpha = gl.getClearAlpha();
    const autoClear = gl.autoClear;
    const helpers: Object3D[] = [];
    function blur(amount: number) {
      blurPlane.material = horizontal;
      horizontal.uniforms.tDiffuse.value = target.texture;
      horizontal.uniforms.h.value = amount / 256;
      gl.setRenderTarget(blurTarget);
      gl.render(blurPlane, camera);
      blurPlane.material = vertical;
      vertical.uniforms.tDiffuse.value = blurTarget.texture;
      vertical.uniforms.v.value = amount / 256;
      gl.setRenderTarget(target);
      gl.render(blurPlane, camera);
    }
    group.current.visible = false;
    scene.traverse((object) => {
      if (object.userData.studioHelper && object.visible) {
        object.visible = false;
        helpers.push(object);
      }
    });
    try {
      gl.autoClear = true;
      gl.setClearColor(0, 0);
      scene.background = null;
      scene.overrideMaterial = depth;
      gl.setRenderTarget(target);
      gl.render(scene, camera);
      // The blur quad uses the same upward-facing plane as the capture camera.
      blurPlane.position.set(...position);
      blurPlane.position.y += 1;
      blurPlane.updateMatrixWorld();
      blur(2.4);
      blur(0.96);
      rendered.current = renderKey;
    } finally {
      scene.background = background;
      scene.overrideMaterial = override;
      group.current.visible = true;
      for (const helper of helpers) helper.visible = true;
      gl.setRenderTarget(previousTarget);
      gl.setClearColor(previousClear, previousAlpha);
      gl.autoClear = autoClear;
    }
  });
  return (
    <group ref={group} visible={enabled} position={position} userData={{ studioHelper: true }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, -1, 1]} raycast={() => null}>
        <planeGeometry args={[scale, scale]} />
        <meshBasicMaterial
          map={resources.target.texture}
          transparent
          opacity={0.24}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
