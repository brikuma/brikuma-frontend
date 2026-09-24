import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ignored = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "artifacts",
  ".agents",
  ".claude",
  ".husky",
]);
function walk(root, prefix = "") {
  return readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) return [];
    const name = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? walk(root, name) : [name];
  });
}
const prose = (content) => content.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "");
export function anchors(content) {
  const counts = new Map();
  const result = new Set();
  for (const line of prose(content).split("\n")) {
    const match = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*$/);
    if (!match) continue;
    const base = match[1]
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
      .replace(/\s/g, "-");
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    result.add(count ? `${base}-${count}` : base);
  }
  for (const match of content.matchAll(/\bid=["']([^"']+)["']/g)) result.add(match[1]);
  return result;
}
export function references(content) {
  const text = prose(content);
  return [...text.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)]
    .map((match) => match[1] || match[2])
    .concat([...text.matchAll(/^@([^\s]+)\s*$/gm)].map((match) => match[1]));
}
export function checkDocumentation(root = process.cwd()) {
  const policy = JSON.parse(readFileSync(path.join(root, "docs/link-policy.json"), "utf8"));
  if (policy.version !== 1 || !Array.isArray(policy.conditionalLinks))
    throw new Error("Invalid exact documentation link policy.");
  const allowed = new Set(
    policy.conditionalLinks.map(({ source, target, reason }) => {
      if (!source || !target || !reason) throw new Error("Invalid conditional link.");
      return `${source}\0${target}`;
    }),
  );
  const files = walk(root).filter((file) => file.endsWith(".md"));
  const graph = new Map();
  const imports = new Map();
  const errors = [];
  const unavailable = [];
  for (const file of files) {
    const content = readFileSync(path.join(root, file), "utf8");
    const links = [];
    imports.set(
      file,
      [...prose(content).matchAll(/^@([^\s]+)\s*$/gm)].map((match) =>
        path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])),
      ),
    );
    for (const reference of references(content)) {
      if (/^(https?:|mailto:|data:|blob:|tel:)/i.test(reference)) continue;
      if (/^[a-z][a-z\d+.-]*:/i.test(reference) || reference.startsWith("/")) {
        errors.push(`${file}: unsupported link ${reference}`);
        continue;
      }
      const [rawPath, rawAnchor] = reference.split("#", 2);
      let target;
      try {
        target = rawPath
          ? path.posix.normalize(
              path.posix.join(path.posix.dirname(file), decodeURIComponent(rawPath)),
            )
          : file;
      } catch {
        errors.push(`${file}: invalid link encoding ${reference}`);
        continue;
      }
      if (target.startsWith("../")) {
        if (!allowed.has(`${file}\0${target}`))
          errors.push(`${file}: cross-repository link lacks exact policy: ${target}`);
        else
          unavailable.push(
            `${file}: parent/sibling context not validated in standalone local check: ${target}`,
          );
        continue;
      }
      if (!existsSync(path.join(root, target))) {
        errors.push(`${file}: missing target ${target}`);
        continue;
      }
      if (
        rawAnchor &&
        target.endsWith(".md") &&
        !anchors(readFileSync(path.join(root, target), "utf8")).has(decodeURIComponent(rawAnchor))
      )
        errors.push(`${file}: missing anchor ${target}#${rawAnchor}`);
      links.push(target);
    }
    graph.set(file, links);
  }
  function visit(name, stack = []) {
    if (stack.includes(name)) {
      errors.push(`Instruction import cycle: ${[...stack, name].join(" -> ")}`);
      return;
    }
    for (const target of imports.get(name) || []) visit(target, [...stack, name]);
  }
  for (const name of imports.keys()) visit(name);
  const visited = new Set();
  const pending = ["docs/README.md"];
  while (pending.length) {
    const current = pending.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(graph.get(current) || []));
  }
  for (const file of files)
    if (file.startsWith("docs/") && !visited.has(file))
      errors.push(`Unreachable wiki page: ${file}`);
  return { checked: files.length, errors, unavailable };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkDocumentation();
  console.log(
    `Frontend local documentation: ${result.checked} files, ${result.errors.length} errors. Not a pinned integration check.`,
  );
  result.errors.forEach((error) => console.error(error));
  result.unavailable.forEach((item) => console.log(`UNAVAILABLE: ${item}`));
  process.exitCode = result.errors.length ? 1 : 0;
}
