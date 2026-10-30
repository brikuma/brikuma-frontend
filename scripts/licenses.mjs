import {
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
function notices(directory, relative = "", depth = 0) {
  if (depth > 7) return [];
  return readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.isSymbolicLink()) return [];
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) return notices(directory, file, depth + 1);
    return /^(licen[sc]e|copying|notice|copyright)(\.|-|$)/i.test(entry.name) ? [file] : [];
  });
}
const fragments = [
  "BRIKUMA third-party notices\n\nGenerated from exact installed production dependency packages. Upstream license/notice text below is preserved verbatim. This does not assign a license to BRIKUMA. Some dependencies are build-only or tree-shaken; inclusion is conservative. Platform-specific packages remain in the package lock but are not distributed in the static export.\n",
];
const metadataOnly = [];
for (const [directory, metadata] of Object.entries(lock.packages).sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  if (
    !directory ||
    metadata.dev ||
    metadata.optional ||
    !existsSync(path.join(directory, "package.json"))
  )
    continue;
  const pkg = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  fragments.push(
    `\n${"=".repeat(72)}\n${pkg.name}@${metadata.version}\nDeclared license: ${metadata.license || "See license text below"}\nRegistry integrity: ${metadata.integrity || "not recorded"}\n`,
  );
  let files = notices(directory);
  if (!files.length && (pkg.name.startsWith("@next/") || pkg.name === "client-only")) {
    fragments.push(
      "\nUpstream project license (Next.js package):\n",
      readFileSync("node_modules/next/license.md", "utf8"),
    );
    continue;
  }
  if (!files.length) {
    const fallback = path.join(
      "public/third-party-licenses",
      `${pkg.name.replaceAll("/", "__").replaceAll("@", "")}.txt`,
    );
    if (existsSync(fallback)) {
      fragments.push("\nVerified upstream license:\n", readFileSync(fallback, "utf8"));
      continue;
    }
    if (pkg.name.startsWith("@img/sharp-libvips-")) {
      files = ["README.md"];
    } else {
      metadataOnly.push(`${pkg.name}@${metadata.version}`);
      fragments.push(
        "\nPublished package declares the license above but ships no separate license/notice file. The exact package manifest and available README follow verbatim; no copyright holder or absent notice is fabricated.\n",
        readFileSync(path.join(directory, "package.json"), "utf8"),
      );
      const readme = readdirSync(directory).find((name) => /^readme(\.|$)/i.test(name));
      if (readme)
        fragments.push(
          "\n--- Published README ---\n",
          readFileSync(path.join(directory, readme), "utf8"),
        );
      continue;
    }
  }
  for (const file of files.sort()) {
    const absolute = path.join(directory, file);
    const descriptor = openSync(absolute, "r");
    try {
      const metadata = fstatSync(descriptor);
      if (!metadata.isFile() || metadata.size > 2 * 1024 * 1024)
        throw new Error(`Invalid or unexpectedly large notice: ${absolute}`);
      fragments.push(`\n--- ${file} ---\n`, readFileSync(descriptor, "utf8"));
    } finally {
      closeSync(descriptor);
    }
  }
}
if (metadataOnly.length)
  console.log(`Metadata-only upstream declarations: ${metadataOnly.join(", ")}`);
const output = fragments.join("");
if (process.argv.includes("--check")) {
  if (
    !existsSync("public/THIRD_PARTY_LICENSES.txt") ||
    readFileSync("public/THIRD_PARTY_LICENSES.txt", "utf8") !== output
  )
    throw new Error(
      "Generated notices are missing or stale. Run npm run licenses:generate after reviewing upstream notices.",
    );
  console.log("Third-party notices match the installed production tree.");
} else {
  writeFileSync("public/THIRD_PARTY_LICENSES.txt", output);
  console.log(`Generated ${Buffer.byteLength(output)} notice bytes.`);
}
