"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  referenceScale,
  validateEditorReference,
  type ReferenceCalibration,
} from "@/adapters/local-reference";

type Reference = { id: number; filename: string; url: string; width?: number; height?: number };

/** Own this hook at the workbench lifetime so switching panels does not lose references. */
export function useEditorReferences() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [anchors, setAnchors] = useState({ ax: "0", ay: "0", bx: "100", by: "0", length: "1" });
  const [plane, setPlane] = useState<ReferenceCalibration["plane"]>("XZ");
  const [calibrations, setCalibrations] = useState<Record<number, ReferenceCalibration>>({});
  const urls = useRef(new Set<string>());
  const counter = useRef(0);
  const active = references.find((item) => item.id === activeId);
  const calibration = active ? calibrations[active.id] : undefined;
  const scale = calibration ? referenceScale(calibration) : null;
  useEffect(() => {
    const current = urls.current;
    return () => {
      current.forEach((url) => URL.revokeObjectURL(url));
      current.clear();
    };
  }, []);
  function remove(id: number) {
    const reference = references.find((item) => item.id === id);
    if (reference) {
      URL.revokeObjectURL(reference.url);
      urls.current.delete(reference.url);
    }
    setReferences((current) => current.filter((item) => item.id !== id));
    if (activeId === id) setActiveId(null);
  }
  function addImages(files: readonly File[]) {
    const next: Reference[] = [];
    let issue = "";
    for (const file of files) {
      const invalid = validateEditorReference(file, references.length + next.length);
      if (invalid) {
        issue = invalid;
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      next.push({ id: counter.current++, filename: file.name, url });
    }
    setReferences((current) => [...current, ...next]);
    if (next.length) setActiveId(next[next.length - 1].id);
    setError(issue);
  }
  return {
    references,
    setReferences,
    activeId,
    setActiveId,
    error,
    setError,
    anchors,
    setAnchors,
    plane,
    setPlane,
    calibrations,
    setCalibrations,
    addImages,
    active,
    calibration,
    scale,
    remove,
  };
}

type EditorReferenceState = ReturnType<typeof useEditorReferences>;

export function EditorReferences({ state }: { state?: EditorReferenceState } = {}) {
  return state ? <ReferenceBoard state={state} /> : <OwnedReferenceBoard />;
}

function OwnedReferenceBoard() {
  const state = useEditorReferences();
  return <ReferenceBoard state={state} />;
}

function ReferenceBoard({ state }: { state: EditorReferenceState }) {
  const {
    references,
    setReferences,
    activeId,
    setActiveId,
    error,
    setError,
    anchors,
    setAnchors,
    plane,
    setPlane,
    setCalibrations,
    addImages,
    active,
    calibration,
    scale,
    remove,
  } = state;
  return (
    <section aria-label="Local reference board" className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pin images beside the model. Bytes stay in this tab and clear when this editor closes.
      </p>
      <label className="block text-sm font-medium">
        Choose local images
        <input
          className="mt-2 block w-full min-w-0 text-xs"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => {
            addImages(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {references.map((reference) => (
          <li key={reference.id} className="flex min-w-0 gap-1">
            <Button
              className="min-w-0 flex-1 justify-start"
              aria-pressed={activeId === reference.id}
              onClick={() => setActiveId(reference.id)}
            >
              <span className="truncate">{reference.filename}</span>
            </Button>
            <Button
              aria-label={`Remove ${reference.filename}`}
              onClick={() => remove(reference.id)}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      {active && (
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <picture>
            <img
              className="max-h-64 w-full rounded object-contain"
              src={active.url}
              alt={`Pinned reference: ${active.filename}`}
              onLoad={(event) => {
                const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                if (!width || !height || width * height > 40_000_000) {
                  remove(active.id);
                  setError("Use a decoded image with no more than 40 million pixels.");
                  return;
                }
                setReferences((current) =>
                  current.map((item) =>
                    item.id === active.id ? { ...item, width, height } : item,
                  ),
                );
              }}
              onError={() => {
                remove(active.id);
                setError("This image could not be decoded. Choose another local image.");
              }}
            />
          </picture>
          <p className="text-xs text-muted-foreground">
            {active.width
              ? `${active.width} × ${active.height} image pixels`
              : "Decoding local image…"}{" "}
            · Pinned beside model
          </p>
          <details>
            <summary className="cursor-pointer py-2 text-sm font-medium">
              Manual reference scale
            </summary>
            <p className="mb-2 text-xs text-muted-foreground">
              Declare two anchors in image pixels, from the top left, and their known distance. This
              does not infer hidden dimensions.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["ax", "Anchor A X (px)"],
                  ["ay", "Anchor A Y (px)"],
                  ["bx", "Anchor B X (px)"],
                  ["by", "Anchor B Y (px)"],
                  ["length", "Known length (studs)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs">
                  {label}
                  <input
                    className="field mt-1 w-full"
                    type="text"
                    inputMode="decimal"
                    value={anchors[key]}
                    onChange={(event) =>
                      setAnchors((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </label>
              ))}
              <label className="text-xs">
                Declared alignment
                <select
                  className="field mt-1 w-full"
                  value={plane}
                  onChange={(event) =>
                    setPlane(event.target.value as ReferenceCalibration["plane"])
                  }
                >
                  <option>XZ</option>
                  <option>XY</option>
                  <option>YZ</option>
                </select>
              </label>
            </div>
            <Button
              className="mt-3"
              onClick={() => {
                const values = Object.values(anchors);
                if (
                  values.some(
                    (value) => !value.trim() || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value.trim()),
                  )
                ) {
                  setError("Enter finite decimal numbers for both anchors and the known length.");
                  return;
                }
                const next = {
                  first: { x: Number(anchors.ax), y: Number(anchors.ay) },
                  second: { x: Number(anchors.bx), y: Number(anchors.by) },
                  length: Number(anchors.length),
                  plane,
                };
                const inside = [next.first, next.second].every(
                  (point) =>
                    point.x >= 0 &&
                    point.y >= 0 &&
                    point.x <= (active.width ?? 0) &&
                    point.y <= (active.height ?? 0),
                );
                if (!inside || referenceScale(next) === null) {
                  setError(
                    "Use distinct anchors inside the decoded image and a positive known length.",
                  );
                  return;
                }
                setCalibrations((current) => ({ ...current, [active.id]: next }));
                setError("");
              }}
            >
              Declare scale
            </Button>
          </details>
          {scale !== null && calibration && (
            <p role="status" className="text-xs">
              Manual reference scale: {scale.toPrecision(4)} studs per pixel · {calibration.plane}{" "}
              alignment. User declaration only.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
