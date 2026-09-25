"use client";
import { useState } from "react";
import type { ProjectId } from "@/fixtures/projects";
import { useProjectContext } from "./project-context";
export { referenceTypes, validateReference } from "./project-context";
import { FileText, ImagePlus, X } from "lucide-react";
import { copy } from "@/lib/copy";
export function ReferencePicker({ projectId = "blank" }: { projectId?: ProjectId } = {}) {
  const {
    references: files,
    setReferences,
    addReferences,
    removeReference: remove,
    referenceError,
  } = useProjectContext(projectId);
  const [error, setError] = useState("");
  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-control-border bg-background p-6 text-center hover:bg-surface-muted">
        <ImagePlus size={26} className="text-primary" />
        <span className="text-sm font-medium">Bring a little inspiration</span>
        <span className="text-xs text-muted-foreground">
          Choose images or PDF filenames · 6 files · 10 MB each
        </span>
        <input
          className="mt-2 max-w-full text-xs"
          type="file"
          aria-label="Choose reference files"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          multiple
          onChange={(event) => {
            const { error: issue } = addReferences(Array.from(event.target.files ?? []));
            setError(issue);
            event.target.value = "";
          }}
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        {copy.references} Project backups include images and declared scales; PDFs retain filenames
        only. Check the local save status before leaving.
      </p>
      {(error || referenceError) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error || referenceError}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {files.map((item) => (
          <li
            key={item.id}
            className="flex min-w-0 items-center gap-3 rounded-md border bg-surface p-2"
          >
            {item.url ? (
              <div
                role="img"
                aria-label={item.filename}
                className="size-12 shrink-0 overflow-hidden rounded-sm"
              >
                <picture>
                  <img
                    src={item.url}
                    alt=""
                    className="size-full object-cover"
                    onLoad={(event) => {
                      const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                      if (!width || !height || width * height > 40_000_000) {
                        remove(item.id);
                        setError("Use a decoded image with no more than 40 million pixels.");
                        return;
                      }
                      setReferences((current) =>
                        current.some(
                          (reference) =>
                            reference.id === item.id &&
                            (reference.width !== width || reference.height !== height),
                        )
                          ? current.map((reference) =>
                              reference.id === item.id
                                ? { ...reference, width, height }
                                : reference,
                            )
                          : current,
                      );
                    }}
                    onError={() => {
                      remove(item.id);
                      setError("This image could not be decoded. Choose a valid image.");
                    }}
                  />
                </picture>
              </div>
            ) : (
              <FileText className="m-3 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.filename}</p>
              <p className="text-xs text-muted-foreground">
                {item.type.startsWith("image/")
                  ? item.url
                    ? "Local image"
                    : "Image preview unavailable · bytes retained"
                  : "PDF · filename only, not parsed"}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${item.filename}`}
              onClick={() => remove(item.id)}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
