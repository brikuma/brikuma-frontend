export function sanitizeEvidence(text, root, repository) {
  return text
    .replaceAll(root, repository)
    .replace(/\/(?:Users|home)\/[^\s"'`]+/g, "[redacted-personal-path]")
    .replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\s"'`]+/gi, "[redacted-personal-path]")
    .replace(/\/(?:private\/)?(?:tmp|var\/folders)\/[^\s"'`]+/g, "[temporary-path]");
}
