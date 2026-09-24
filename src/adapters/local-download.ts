/** A local download has no server or cloud-save semantics. */
export function downloadLocalBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  anchor.hidden = true;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Retain the URL through the browser's download dispatch, then release it.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
