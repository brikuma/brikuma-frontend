import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/component/**/*.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
    // Keep CPU-heavy DOM suites from competing within the same execution budget.
    maxWorkers: 1,
  },
});
