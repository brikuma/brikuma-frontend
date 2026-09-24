const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "app",
        "core",
        "workspace",
        "editor",
        "parts",
        "instructions",
        "checks",
        "ai-preview",
        "community",
        "marketplace",
        "plans",
        "design-system",
        "a11y",
        "deps",
        "docs",
        "spec",
        "tooling",
        "architecture",
      ],
    ],
    "scope-empty": [2, "never"],
    "header-max-length": [2, "always", 72],
  },
};

export default config;
