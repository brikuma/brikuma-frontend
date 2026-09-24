"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, X } from "lucide-react";
import { copy } from "@/lib/copy";
export const referenceTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export function validateReference(file: Pick<File, "type" | "size">, count: number): string | null {
  if (count >= 6) return "Choose up to six reference files.";
  if (!referenceTypes.includes(file.type))
    return "Use PNG, JPEG, WebP or PDF files. Other file types are not supported.";
  if (file.size > 10 * 1024 * 1024) return "Each reference must be 10 MB or smaller.";
  if (file.size === 0) return "Empty files cannot be used as references.";
  return null;
}
type Reference = { id: number; file: File; url?: string };
export function ReferencePicker() {
  const [files, setFiles] = useState<Reference[]>([]);
  const [error, setError] = useState("");
  const urls = useRef(new Set<string>());
  const counter = useRef(0);
  useEffect(() => {
    const active = urls.current;
    return () => {
      active.forEach((url) => URL.revokeObjectURL(url));
      active.clear();
    };
  }, []);
  function remove(id: number) {
    const item = files.find((reference) => reference.id === id);
    if (item?.url) {
      URL.revokeObjectURL(item.url);
      urls.current.delete(item.url);
    }
    setFiles((current) => current.filter((reference) => reference.id !== id));
  }
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
            const next: Reference[] = [];
            let issue = "";
            for (const file of Array.from(event.target.files ?? [])) {
              const invalid = validateReference(file, files.length + next.length);
              if (invalid) {
                issue = invalid;
                continue;
              }
              const url = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
              if (url) urls.current.add(url);
              next.push({ id: counter.current++, file, url });
            }
            setFiles((current) => [...current, ...next]);
            setError(issue);
            event.target.value = "";
          }}
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        {copy.references} References clear when you leave this brief.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
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
                aria-label={item.file.name}
                className="size-12 shrink-0 overflow-hidden rounded-sm"
              >
                <picture>
                  <img
                    src={item.url}
                    alt=""
                    className="size-full object-cover"
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
              <p className="truncate text-sm">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.url ? "Local image" : "PDF · filename only, not parsed"}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${item.file.name}`}
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
