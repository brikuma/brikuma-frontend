import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { assertCommittedInputs, assertSnapshot, identity, validateReview } from "./quality.mjs";
import { checkDocumentation } from "./docs-check.mjs";
const project = process.cwd();
const sha = (content) => createHash("sha256").update(content).digest("hex");
function command(root, executable, args, env = {}) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}
function git(root, args) {
  const result = command(root, "git", args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "brikuma-gate-"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Disposable Gate Test"]);
    git(root, ["config", "user.email", "gate-test@example.invalid"]);
    writeFileSync(path.join(root, ".gitignore"), "artifacts/\n");
    writeFileSync(path.join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
    writeFileSync(path.join(root, "package.json"), '{"private":true}\n');
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src/a.ts"), "export const valid = true;\n");
    git(root, ["add", ".gitignore", "package.json", "package-lock.json", "src/a.ts"]);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function validRecord(root) {
  const log = "Executed disposable deterministic assertion\n";
  const name = "artifacts/check.log";
  mkdirSync(path.join(root, "artifacts"), { recursive: true });
  writeFileSync(path.join(root, name), log);
  return {
    schemaVersion: 1,
    ...identity(root),
    reviewer: "structured-self-review:test-fixture",
    recordedAt: new Date().toISOString(),
    findings: [],
    commands: [{ command: "disposable assertion", exitCode: 0, log: name, logHash: sha(log) }],
  };
}
test("FE-024 accepts matching staged inputs and preserves unrelated untracked files", () =>
  fixture((root) => {
    writeFileSync(path.join(root, "personal-notes.txt"), "untouched");
    assert.ok(assertSnapshot(root));
    assert.equal(readFileSync(path.join(root, "personal-notes.txt"), "utf8"), "untouched");
  }));
test("FE-024 rejects code depending on an unstaged fix", () =>
  fixture((root) => {
    writeFileSync(path.join(root, "src/a.ts"), "export const valid = false;");
    assert.throws(() => assertSnapshot(root), /inputs do not match/);
  }));
test("FE-024 rejects relevant untracked inputs", () =>
  fixture((root) => {
    writeFileSync(path.join(root, "src/b.ts"), "export const b = true;");
    assert.throws(() => assertSnapshot(root), /inputs do not match/);
  }));
test("FE-024 push checks accept committed inputs and reject staged or unstaged fixes", () =>
  fixture((root) => {
    assert.throws(() => assertCommittedInputs(root), /match committed HEAD/);
    git(root, ["commit", "-m", "test(tooling): create committed gate fixture"]);
    assert.doesNotThrow(() => assertCommittedInputs(root));
    writeFileSync(path.join(root, "src/a.ts"), "export const unstagedFix = true;\n");
    assert.throws(() => assertCommittedInputs(root), /inputs do not match/);
    git(root, ["add", "src/a.ts"]);
    assert.throws(() => assertCommittedInputs(root), /match committed HEAD/);
    assert.equal(
      readFileSync(path.join(root, "src/a.ts"), "utf8"),
      "export const unstagedFix = true;\n",
    );
  }));
test("FE-024 rejects stale candidate review after staging a new tree", () =>
  fixture((root) => {
    const record = validRecord(root);
    validateReview(root, record);
    writeFileSync(path.join(root, "src/a.ts"), "export const valid = 2;");
    git(root, ["add", "src/a.ts"]);
    assert.throws(() => validateReview(root, record), /Stale evidence/);
  }));
test("FE-024 rejects tampered command logs and unresolved findings", () =>
  fixture((root) => {
    const record = validRecord(root);
    assert.throws(
      () =>
        validateReview(root, { ...record, findings: [{ severity: "high", resolution: "open" }] }),
      /Unresolved/,
    );
    writeFileSync(path.join(root, record.commands[0].log), "tampered");
    assert.throws(() => validateReview(root, record), /log missing or changed/);
  }));
test("FE-023 real Husky hook executes and rejects malformed messages in a disposable repository", () =>
  fixture((root) => {
    mkdirSync(path.join(root, ".husky"));
    writeFileSync(
      path.join(root, ".husky/pre-commit"),
      "node -e \"require('node:fs').writeFileSync('artifacts/hook-ran','yes')\"\n",
    );
    writeFileSync(
      path.join(root, ".husky/commit-msg"),
      `node '${path.join(project, "node_modules/@commitlint/cli/cli.js")}' --config '${path.join(project, "commitlint.config.mjs")}' --edit "$1"\n`,
    );
    mkdirSync(path.join(root, "artifacts"));
    git(root, ["add", ".husky"]);
    const install = command(root, process.execPath, [
      path.join(project, "node_modules/husky/bin.js"),
    ]);
    assert.equal(install.status, 0, install.stderr);
    assert.equal(git(root, ["config", "--local", "core.hooksPath"]), ".husky/_");
    const bad = command(root, "git", ["commit", "-m", "bad message"]);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stdout + bad.stderr, /subject-empty|type-empty|scope-empty/);
    const good = command(root, "git", ["commit", "-m", "test(tooling): verify disposable hooks"]);
    assert.equal(good.status, 0, good.stderr);
    assert.equal(readFileSync(path.join(root, "artifacts/hook-ran"), "utf8"), "yes");
    const cloneRoot = mkdtempSync(path.join(tmpdir(), "brikuma-clone-gate-"));
    try {
      const checkout = path.join(cloneRoot, "checkout");
      const cloned = command(cloneRoot, "git", [
        "clone",
        "--quiet",
        "--separate-git-dir",
        path.join(cloneRoot, "metadata"),
        root,
        checkout,
      ]);
      assert.equal(cloned.status, 0, cloned.stderr);
      assert.match(readFileSync(path.join(checkout, ".git"), "utf8"), /^gitdir:/);
      assert.notEqual(command(checkout, "git", ["config", "--get", "core.hooksPath"]).status, 0);
      mkdirSync(path.join(checkout, "artifacts"));
      const bootstrapped = command(checkout, process.execPath, [
        path.join(project, "node_modules/husky/bin.js"),
      ]);
      assert.equal(bootstrapped.status, 0, bootstrapped.stderr);
      assert.equal(git(checkout, ["config", "--get", "core.hooksPath"]), ".husky/_");
      const hook = command(checkout, "git", ["hook", "run", "pre-commit"]);
      assert.equal(hook.status, 0, hook.stderr);
      assert.equal(readFileSync(path.join(checkout, "artifacts/hook-ran"), "utf8"), "yes");
    } finally {
      rmSync(cloneRoot, { recursive: true, force: true });
    }
  }));
test("FE-024 dangling documentation file/anchor and fabricated script links fail", () =>
  fixture((root) => {
    mkdirSync(path.join(root, "docs"));
    writeFileSync(path.join(root, "docs/link-policy.json"), '{"version":1,"conditionalLinks":[]}');
    writeFileSync(
      path.join(root, "docs/README.md"),
      "# Index\n\n[Missing](missing.md) [False script](../scripts/not-real.mjs) [False anchor](#absent)\n",
    );
    const result = checkDocumentation(root);
    assert.equal(result.errors.length, 3);
    assert.ok(result.errors.some((error) => error.includes("missing anchor")));
  }));
test("FE-024 local docs accept valid code links and reject instruction import cycles", () =>
  fixture((root) => {
    mkdirSync(path.join(root, "docs"));
    writeFileSync(path.join(root, "docs/link-policy.json"), '{"version":1,"conditionalLinks":[]}');
    writeFileSync(path.join(root, "docs/README.md"), "# Index\n\n[Code](../src/a.ts)\n");
    assert.deepEqual(checkDocumentation(root).errors, []);
    writeFileSync(path.join(root, "AGENTS.md"), "@CLAUDE.md\n");
    writeFileSync(path.join(root, "CLAUDE.md"), "@AGENTS.md\n");
    assert.ok(checkDocumentation(root).errors.some((error) => error.includes("import cycle")));
  }));
