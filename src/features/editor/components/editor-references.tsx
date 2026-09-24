"use client";

import { useState, type SetStateAction } from "react";
import type { ProjectId } from "@/fixtures/projects";
import { useProjectContext } from "@/features/project-brief/project-context";
import { Button } from "@/components/ui/button";
import { referenceScale, type ReferenceCalibration } from "@/adapters/local-reference";

function calibrationDraft(calibration?: ReferenceCalibration) {
  return {
    anchors: {
      ax: String(calibration?.first.x ?? 0),
      ay: String(calibration?.first.y ?? 0),
      bx: String(calibration?.second.x ?? 100),
      by: String(calibration?.second.y ?? 0),
      length: String(calibration?.length ?? 1),
    },
    plane: calibration?.plane ?? "XZ",
  };
}

type CalibrationDraft = ReturnType<typeof calibrationDraft>;

/** Project-owned files survive route changes; panel controls remain local UI state. */
export function useEditorReferences(projectId: ProjectId = "blank") {
  const {
    references,
    setReferences,
    calibrations,
    setCalibrations,
    addReferences,
    removeReference,
  } = useProjectContext(projectId);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, CalibrationDraft>>({});
  const active = references.find((item) => item.id === activeId) ?? references[0];
  const calibration = active ? calibrations[active.id] : undefined;
  const scale = calibration ? referenceScale(calibration) : null;
  const { anchors, plane } = (active && drafts[active.id]) || calibrationDraft(calibration);
  function setAnchors(change: SetStateAction<CalibrationDraft["anchors"]>) {
    if (!active) return;
    setDrafts((current) => {
      const draft = current[active.id] ?? calibrationDraft(calibration);
      return {
        ...current,
        [active.id]: {
          ...draft,
          anchors: typeof change === "function" ? change(draft.anchors) : change,
        },
      };
    });
  }
  function setPlane(change: SetStateAction<ReferenceCalibration["plane"]>) {
    if (!active) return;
    setDrafts((current) => {
      const draft = current[active.id] ?? calibrationDraft(calibration);
      return {
        ...current,
        [active.id]: {
          ...draft,
          plane: typeof change === "function" ? change(draft.plane) : change,
        },
      };
    });
  }
  function remove(id: number) {
    removeReference(id);
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (activeId === id) setActiveId(null);
  }
  function addImages(files: readonly File[]) {
    const { added, error: issue } = addReferences(files, true);
    if (added.length) setActiveId(added[added.length - 1].id);
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
        Pin images beside the model. References follow this project during navigation and clear on
        reload.
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
              aria-pressed={active?.id === reference.id}
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
      {active && !active.url && (
        <p className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
          {active.filename} · PDF · filename only, not parsed. {active.size} bytes. No preview or
          scale declaration is available for PDF references.
        </p>
      )}
      {active?.url && (
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
