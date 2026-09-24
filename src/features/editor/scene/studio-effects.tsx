import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, HalfFloatType, type Object3D, WebGLRenderTarget, type WebGLRenderer } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import type { RenderQuality } from "../viewport-types";

class ModelOcclusionPass extends GTAOPass {
  override render(
    renderer: WebGLRenderer,
    write: WebGLRenderTarget,
    read: WebGLRenderTarget,
    delta: number,
    mask: boolean,
  ) {
    const helpers: Object3D[] = [];
    this.scene.traverse((object) => {
      if (object.userData.studioHelper && object.visible) {
        helpers.push(object);
        object.visible = false;
      }
    });
    try {
      super.render(renderer, write, read, delta, mask);
    } finally {
      for (const helper of helpers) helper.visible = true;
    }
  }
}

/** Studio-only occlusion; OutputPass performs tone mapping and sRGB conversion once. */
export function StudioEffects({
  quality,
  onReady,
  onFailure,
  isCameraReady,
}: {
  quality: RenderQuality;
  onReady: () => void;
  onFailure: () => void;
  isCameraReady: () => boolean;
}) {
  const { gl, scene, camera, size } = useThree();
  const ready = useRef(false);
  const resources = useMemo(() => {
    if (quality !== "studio") return null;
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    const composer = new EffectComposer(gl, target);
    const render = new RenderPass(scene, camera, null, new Color(0), 0);
    const occlusion = new ModelOcclusionPass(scene, camera, 1, 1);
    occlusion.output = GTAOPass.OUTPUT.Default;
    occlusion.blendIntensity = 0.95;
    occlusion.updateGtaoMaterial({
      radius: 0.75,
      thickness: 0.6,
      distanceExponent: 1,
      distanceFallOff: 1,
      scale: 1.25,
      samples: 16,
      screenSpaceRadius: false,
    });
    occlusion.updatePdMaterial({ radius: 4, samples: 16, depthPhi: 2, normalPhi: 3 });
    const output = new OutputPass();
    composer.addPass(render);
    composer.addPass(occlusion);
    composer.addPass(output);
    return { composer, render, occlusion, output };
  }, [camera, gl, quality, scene]);
  useLayoutEffect(() => {
    if (!resources) return;
    resources.composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.5));
    resources.composer.setSize(size.width, size.height);
  }, [gl, resources, size.height, size.width]);
  useEffect(
    () => () => {
      if (!resources) return;
      resources.occlusion.dispose();
      // Three r186 does not include these two owned materials in GTAOPass.dispose.
      resources.occlusion.gtaoMaterial.dispose();
      resources.occlusion.blendMaterial.dispose();
      resources.output.dispose();
      resources.render.dispose();
      resources.composer.dispose();
    },
    [resources],
  );
  useFrame((state, delta) => {
    const background = state.scene.background;
    try {
      if (resources) {
        // Transparent pixels show the CSS studio ground without tone-mapping it.
        state.scene.background = null;
        resources.composer.render(delta);
      } else state.gl.render(state.scene, state.camera);
      if (!ready.current && isCameraReady()) {
        ready.current = true;
        onReady();
      }
    } catch {
      onFailure();
    } finally {
      state.scene.background = background;
    }
  }, 1);
  return null;
}
