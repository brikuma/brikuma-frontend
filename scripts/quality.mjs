import { sanitizeEvidence } from "./evidence-sanitize.mjs";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const hash = (value) => createHash("sha256").update(value).digest("hex");
export function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
  return result.stdout.trim();
}
export function relevant(name) {
  return (
    /^(LICENSE$|src\/|tests\/|scripts\/|docs\/|public\/|\.husky\/|\.github\/|[^/]+\.(?:json|mjs|cjs|ts|mts|css|md|yaml|yml)$|\.node-version$|\.npmrc$|\.prettierignore$|\.gitignore$|\.editorconfig$)/.test(
      name,
    ) && name !== "skills-lock.json"
  );
}
export function assertSnapshot(root) {
  const unstaged = git(root, ["diff", "--name-only"])
    .split("\n")
    .filter((name) => name && relevant(name));
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"])
    .split("\n")
    .filter((name) => name && relevant(name));
  if (unstaged.length || untracked.length)
    throw new Error(
      `Candidate inputs do not match the working tree. Stage intended changes without discarding unrelated work:\n${[...unstaged, ...untracked].join("\n")}`,
    );
  return git(root, ["write-tree"]);
}
export function identity(root) {
  const head = spawnSync("git", ["-C", root, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
  });
  return {
    repository: "brikuma-frontend",
    baseCommit: head.status === 0 ? head.stdout.trim() : "initial-state",
    candidateTree: assertSnapshot(root),
    lockfileHash: hash(readFileSync(path.join(root, "package-lock.json"))),
    nodeVersion: process.version,
    npmVersion: spawnSync("npm", ["--version"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  };
}
export function assertCommittedInputs(root) {
  const current = identity(root);
  if (
    current.baseCommit === "initial-state" ||
    current.candidateTree !== git(root, ["rev-parse", "HEAD^{tree}"])
  )
    throw new Error(
      "Push verification requires source, tests, configuration and documentation to match committed HEAD. Preserve local work and verify a clean checkout of the revision to publish.",
    );
  return current;
}
export function checkPush(root) {
  const before = assertCommittedInputs(root);
  for (const script of ["check", "build", "perf:check", "test:e2e", "test:a11y"]) {
    const result = spawnSync("npm", ["run", script], { cwd: root, stdio: "inherit" });
    if (result.status !== 0) throw new Error(`Push gate failed: npm run ${script}`);
    sameIdentity(before, assertCommittedInputs(root));
  }
}
function recordPath(root, name) {
  return path.join(root, "artifacts", "quality", name);
}
function checkCommands(root, commands) {
  if (!Array.isArray(commands) || !commands.length)
    throw new Error("Executed command evidence is required.");
  for (const command of commands) {
    if (
      typeof command.command !== "string" ||
      command.exitCode !== 0 ||
      !command.log ||
      !command.logHash
    )
      throw new Error("Invalid or failed check evidence.");
    const file = path.resolve(root, command.log);
    if (
      !file.startsWith(path.join(root, "artifacts") + path.sep) ||
      !existsSync(file) ||
      hash(readFileSync(file)) !== command.logHash
    )
      throw new Error("Check log missing or changed.");
  }
}
function sameIdentity(actual, expected) {
  for (const key of [
    "repository",
    "baseCommit",
    "candidateTree",
    "lockfileHash",
    "nodeVersion",
    "npmVersion",
  ])
    if (actual[key] !== expected[key]) throw new Error(`Stale evidence: ${key} changed.`);
}
export function validateReview(root, record) {
  const current = identity(root);
  if (record.schemaVersion !== 1 || !record.reviewer || !Array.isArray(record.findings))
    throw new Error("Review record schema invalid.");
  sameIdentity(record, current);
  const age = Date.now() - Date.parse(record.recordedAt);
  if (!Number.isFinite(age) || age < 0 || age > 4 * 60 * 60 * 1000)
    throw new Error("A fresh review within four hours is required.");
  if (
    record.findings.some((finding) => !["resolved", "owner-accepted"].includes(finding.resolution))
  )
    throw new Error("Unresolved review findings block this commit.");
  if (
    record.findings.some(
      (finding) =>
        ["critical", "high"].includes(finding.severity) && finding.resolution !== "resolved",
    )
  )
    throw new Error("High/critical findings must be resolved.");
  checkCommands(root, record.commands);
  return current;
}
export function verify(root) {
  const before = identity(root);
  mkdirSync(path.join(root, "artifacts/quality"), { recursive: true });
  const started = Date.now();
  const result = spawnSync("npm", ["run", "check"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const log = sanitizeEvidence(
    `${result.stdout || ""}\n${result.stderr || ""}`,
    root,
    "brikuma-frontend",
  );
  const relativeLog = `artifacts/quality/check-${before.candidateTree}.log`;
  writeFileSync(path.join(root, relativeLog), log);
  process.stdout.write(log);
  const after = identity(root);
  sameIdentity(before, after);
  const record = {
    schemaVersion: 1,
    ...after,
    recordedAt: new Date().toISOString(),
    environment: { platform: process.platform, arch: process.arch },
    commands: [
      {
        command: "npm run check",
        exitCode: result.status,
        elapsedMs: Date.now() - started,
        log: relativeLog,
        logHash: hash(log),
      },
    ],
  };
  writeFileSync(recordPath(root, "verification.json"), JSON.stringify(record, null, 2) + "\n");
  if (result.status !== 0)
    throw new Error("Deterministic check failed; review cannot authorize a failing gate.");
  return record;
}
export function recordReview(root, reviewer, findingsFile) {
  if (!reviewer || !findingsFile)
    throw new Error("Usage: record-review <honest-reviewer-label> <findings-json-path>");
  const verification = JSON.parse(readFileSync(recordPath(root, "verification.json"), "utf8"));
  sameIdentity(verification, identity(root));
  checkCommands(root, verification.commands);
  const findings = JSON.parse(readFileSync(path.resolve(root, findingsFile), "utf8"));
  const record = { ...verification, reviewer, findings, recordedAt: new Date().toISOString() };
  validateReview(root, record);
  writeFileSync(recordPath(root, "review.json"), JSON.stringify(record, null, 2) + "\n");
  return record;
}
export function review(root) {
  if (!existsSync(recordPath(root, "review.json")))
    throw new Error(
      "Fresh candidate review missing. Run verify, inspect exact diff/logs read-only, then record-review.",
    );
  return validateReview(root, JSON.parse(readFileSync(recordPath(root, "review.json"), "utf8")));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = process.cwd();
    const mode = process.argv[2];
    if (mode === "verify") verify(root);
    else if (mode === "record-review") recordReview(root, process.argv[3], process.argv[4]);
    else if (mode === "review") review(root);
    else if (mode === "push") checkPush(root);
    else if (mode === "commit") {
      const before = review(root);
      const result = spawnSync(path.join(root, "node_modules/.bin/lint-staged"), [], {
        cwd: root,
        stdio: "inherit",
      });
      if (result.status !== 0) throw new Error("Read-only staged hygiene failed.");
      sameIdentity(before, identity(root));
      review(root);
    } else throw new Error("Expected verify, record-review, review, commit or push.");
    console.log(`Frontend quality ${mode}: passed.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
