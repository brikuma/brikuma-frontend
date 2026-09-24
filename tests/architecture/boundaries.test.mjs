import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const project = process.cwd();
const config = require("../../.dependency-cruiser.cjs");
function cruise(files) {
  mkdirSync("artifacts/architecture", { recursive: true });
  const root = mkdtempSync(path.resolve("artifacts/architecture/case-"));
  try {
    symlinkSync(path.join(project, "node_modules"), path.join(root, "node_modules"), "dir");
    writeFileSync(path.join(root, "package.json"), readFileSync("package.json"));
    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@/*": ["./src/*"] },
          moduleResolution: "bundler",
          module: "esnext",
        },
      }),
    );
    writeFileSync(
      path.join(root, ".dependency-cruiser.cjs"),
      `module.exports = ${JSON.stringify(config)};`,
    );
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), content);
    }
    const result = spawnSync(
      process.execPath,
      [
        path.join(project, "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs"),
        "src",
        "--config",
        ".dependency-cruiser.cjs",
        "--output-type",
        "json",
      ],
      { cwd: root, encoding: "utf8" },
    );
    const report = JSON.parse(result.stdout);
    return report.summary.violations.map((violation) => violation.rule.name);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const cases = [
  [
    "type-only framework import",
    {
      "src/core/model/domain/a.ts":
        'import type { ReactNode } from "react"; export type A = ReactNode;',
    },
    "core-is-pure",
  ],
  [
    "type-only Three import",
    {
      "src/core/model/domain/a.ts":
        'import type { Vector3 } from "three"; export type A = Vector3;',
    },
    "core-is-pure",
  ],
  [
    "type-only Next import",
    {
      "src/core/model/domain/a.ts":
        'import type { Metadata } from "next"; export type A = Metadata;',
    },
    "core-is-pure",
  ],
  [
    "aliased UI import",
    {
      "src/core/model/domain/a.ts": 'export { value } from "@/components/ui/a";',
      "src/components/ui/a.ts": "export const value = 1;",
    },
    "core-is-pure",
  ],
  [
    "relative adapter import",
    {
      "src/core/model/domain/a.ts": 'export { value } from "../../../adapters/a";',
      "src/adapters/a.ts": "export const value = 1;",
    },
    "core-is-pure",
  ],
  [
    "domain application dependency",
    {
      "src/core/model/domain/a.ts": 'export { value } from "../application/a";',
      "src/core/model/application/a.ts": "export const value = 1;",
    },
    "domain-does-not-know-application",
  ],
  [
    "cross-module private contract",
    {
      "src/core/other/domain/a.ts": 'export { value } from "../../model/domain/a";',
      "src/core/model/domain/a.ts": "export const value = 1;",
    },
    "public-core-contracts-only",
  ],
  [
    "cycle",
    {
      "src/a.ts": 'export { b } from "./b"; export const a = 1;',
      "src/b.ts": 'export { a } from "./a"; export const b = 2;',
    },
    "no-cycles",
  ],
  ["unresolved module", { "src/a.ts": 'import "./does-not-exist";' }, "no-unresolved"],
  ["undeclared package", { "src/a.ts": 'import "is-number";' }, "no-undeclared"],
  [
    "production test dependency",
    { "src/a.ts": 'export { expect } from "vitest";' },
    "production-no-tests",
  ],
  [
    "dynamic renderer dependency",
    { "src/features/workspace/a.ts": 'export const load = () => import("three");' },
    "renderer-boundary",
  ],
];
for (const [name, files, expected] of cases)
  test(`FE-022 rejects ${name}`, () =>
    assert.ok(cruise(files).includes(expected), `Expected ${expected}`));
test("FE-022 accepts a passive fixture using the explicit public contract", () => {
  assert.deepEqual(
    cruise({
      "src/fixtures/a.ts": 'import type { A } from "@/core/model/public"; export const a: A = 1;',
      "src/core/model/public.ts": 'export type { A } from "./domain/a";',
      "src/core/model/domain/a.ts": "export type A = number;",
    }),
    [],
  );
});

test("FE-022 scoped syntax guards reject core JSX, browser globals and directives", () => {
  for (const [name, content, expected] of [
    ["src/core/syntax-fixture.tsx", "export const plain = 1;", "no-restricted-syntax"],
    [
      "src/core/syntax-fixture.ts",
      "export const value = window.location;",
      "no-restricted-globals",
    ],
    ["src/core/syntax-fixture.ts", '"use client"; export const value = 1;', "no-restricted-syntax"],
    ["src/core/syntax-fixture.ts", "export const value = Math.random();", "no-restricted-syntax"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        path.join(project, "node_modules/eslint/bin/eslint.js"),
        "--stdin",
        "--stdin-filename",
        name,
        "--format",
        "json",
      ],
      { cwd: project, input: content, encoding: "utf8" },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.ok(JSON.parse(result.stdout)[0].messages.some((message) => message.ruleId === expected));
  }
});
