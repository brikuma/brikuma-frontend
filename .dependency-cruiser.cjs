module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    { name: "no-unresolved", severity: "error", from: {}, to: { couldNotResolve: true } },
    {
      name: "no-undeclared",
      severity: "error",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "core-is-pure",
      severity: "error",
      from: { path: "^src/core/" },
      to: { pathNot: "^src/core/" },
    },
    {
      name: "domain-does-not-know-application",
      severity: "error",
      from: { path: "^src/core/[^/]+/domain/" },
      to: { path: "^src/core/[^/]+/application/" },
    },
    {
      name: "public-core-contracts-only",
      severity: "error",
      from: { pathNot: "^src/core/model/" },
      to: { path: "^src/core/model/(domain|application)/" },
    },
    {
      name: "ui-is-product-agnostic",
      severity: "error",
      from: { path: "^src/components/ui/" },
      to: { path: "^src/(core|fixtures|features)/" },
    },
    {
      name: "fixtures-are-passive",
      severity: "error",
      from: { path: "^src/fixtures/" },
      to: {
        path: "(^src/(features|components|adapters)/|node_modules/(react|react-dom|next|three|@react-three)/)",
      },
    },
    {
      name: "renderer-boundary",
      severity: "error",
      from: { pathNot: "^src/features/editor/scene/" },
      to: { path: "node_modules/(three|@react-three)/" },
    },
    {
      name: "production-no-tests",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/test/" },
      to: {
        path: "(^tests/|^src/test/|node_modules/(vitest|@vitest|@playwright|@testing-library|jsdom)/)",
      },
    },
    {
      name: "production-no-dev-runtime",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/test/" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types"],
    },
  },
};
