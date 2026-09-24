import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "artifacts/**",
    ".agents/**",
    ".claude/**",
    ".husky/_/**",
    "next-env.d.ts",
    "tests/architecture/fixtures/**",
  ]),
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "fetch",
        "localStorage",
        "sessionStorage",
        "setTimeout",
        "setInterval",
        "process",
        "Date",
        "performance",
        "crypto",
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExpressionStatement[directive='use client']",
          message: "Core is framework independent.",
        },
        {
          selector: "ExpressionStatement[directive='use server']",
          message: "Core is framework independent.",
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "Supply deterministic values at the boundary.",
        },
      ],
    },
  },
  {
    files: ["src/core/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message: "Production core files must be plain .ts; JSX is forbidden.",
        },
      ],
    },
  },
]);
