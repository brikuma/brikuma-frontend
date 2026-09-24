import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  OrthographicCamera,
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Object3D,
} from "three";
import type { ImageExportRequest, RendererMetrics } from "../viewport-types";

export function SceneOutput({
  revision,
  partCount,
  visiblePartCount,
  cameraTarget,
  onMetrics,
  request,
  onExport,
}: {
  revision: string;
  partCount: number;
  visiblePartCount: number;
  cameraTarget: () => readonly number[];
  onMetrics?: (metrics: RendererMetrics) => void;
  request?: ImageExportRequest | null;
  onExport?: (blob: Blob | null, message: string) => void;
}) {
  const { get, invalidate } = useThree();
  const frames = useRef(0);
  const measuredRevision = useRef("");
  useFrame(({ gl, camera }) => {
    if (document.hidden) return;
    frames.current += 1;
    const metrics = {
      frames: frames.current,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      revision,
    };
    const dataset = gl.domElement.dataset;
    dataset.renderFrames = String(metrics.frames);
    dataset.drawCalls = String(metrics.calls);
    dataset.triangles = String(metrics.triangles);
    dataset.geometries = String(metrics.geometries);
    dataset.textures = String(metrics.textures);
    dataset.modelRevision = revision;
    dataset.partCount = String(partCount);
    dataset.visiblePartCount = String(visiblePartCount);
    dataset.cameraPosition = JSON.stringify(camera.position.toArray());
    dataset.cameraQuaternion = JSON.stringify(camera.quaternion.toArray());
    dataset.cameraTarget = JSON.stringify(cameraTarget());
    dataset.cameraProjection =
      camera instanceof OrthographicCamera ? "orthographic" : "perspective";
    dataset.cameraZoom = String(
      camera instanceof OrthographicCamera || camera instanceof PerspectiveCamera ? camera.zoom : 1,
    );
    if (measuredRevision.current !== revision) {
      measuredRevision.current = revision;
      onMetrics?.(metrics);
    }
  }, 2);
  useEffect(() => {
    if (!request) return;
    const { gl, camera, scene } = get();
    let cancelled = false;
    const hiddenHelpers: Object3D[] = [];
    const previousTarget = gl.getRenderTarget();
    const background = scene.background;
    let target: WebGLRenderTarget | undefined;
    try {
      const limit = Math.min(
        gl.capabilities.maxTextureSize,
        gl.getContext().getParameter(gl.getContext().MAX_RENDERBUFFER_SIZE),
      );
      if (request.size > limit || gl.getContext().isContextLost())
        throw new Error("Requested image size is unavailable on this renderer.");
      const outputCamera = camera.clone();
      if (outputCamera instanceof OrthographicCamera) {
        const halfHeight = (outputCamera.top - outputCamera.bottom) / 2;
        outputCamera.left = -halfHeight;
        outputCamera.right = halfHeight;
        outputCamera.updateProjectionMatrix();
      } else if (outputCamera instanceof PerspectiveCamera) {
        outputCamera.aspect = 1;
        outputCamera.updateProjectionMatrix();
      }
      target = new WebGLRenderTarget(request.size, request.size, { samples: 4 });
      target.texture.colorSpace = SRGBColorSpace;
      scene.traverse((object) => {
        if (object.userData.studioHelper && object.visible) {
          hiddenHelpers.push(object);
          object.visible = false;
        }
      });
      if (request.transparent) scene.background = null;
      gl.setRenderTarget(target);
      gl.render(scene, outputCamera);
      const pixels = new Uint8Array(request.size * request.size * 4);
      gl.readRenderTargetPixels(target, 0, 0, request.size, request.size, pixels);
      const canvas = document.createElement("canvas");
      canvas.width = request.size;
      canvas.height = request.size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image encoding is unavailable.");
      const image = context.createImageData(request.size, request.size);
      const row = request.size * 4;
      for (let y = 0; y < request.size; y++)
        image.data.set(
          pixels.subarray((request.size - y - 1) * row, (request.size - y) * row),
          y * row,
        );
      context.putImageData(image, 0, 0);
      canvas.toBlob((blob) => {
        if (!cancelled)
          onExport?.(
            blob,
            blob
              ? `Exported ${request.size} × ${request.size} PNG · revision ${revision}`
              : "PNG encoding failed. The model is unchanged.",
          );
      }, "image/png");
    } catch (error) {
      onExport?.(
        null,
        error instanceof Error ? error.message : "Image export failed. The model is unchanged.",
      );
    } finally {
      gl.setRenderTarget(previousTarget);
      scene.background = background;
      for (const object of hiddenHelpers) object.visible = true;
      target?.dispose();
      invalidate();
    }
    return () => {
      cancelled = true;
    };
  }, [get, invalidate, onExport, request, revision]);
  return null;
}
