import { createServer } from "node:http";
import { constants } from "node:fs";
import { open, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
// Read the trusted build once, before listening. Requests never reopen paths that
// could have been replaced while the preview is running. Rebuild, then restart.
async function snapshot(directory, files = new Map()) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await snapshot(file, files);
    else if (entry.isFile()) {
      const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        if (!(await handle.stat()).isFile()) throw new Error("Expected a regular export file");
        files.set(file, await handle.readFile());
      } finally {
        await handle.close();
      }
    }
  }
  return files;
}

export async function createPreviewServer(directory) {
  const root = path.resolve(directory);
  const files = await snapshot(root);
  return createServer((request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");
      let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if (!files.has(file)) {
        const index = path.join(file, "index.html");
        if (files.has(index)) file = index;
        else if (!path.extname(file)) file += ".html";
      }
      const body = files.get(file);
      if (!body) throw new Error("Export file not found");
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" }).end("Static file not found");
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createPreviewServer("out");
  server.listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
    console.log(`Static export: http://127.0.0.1:${server.address().port}`),
  );
}
