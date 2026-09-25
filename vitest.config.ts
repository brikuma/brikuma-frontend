import { defineConfig } from "vitest/config";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/component/**/*.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
    // Leave capacity for the coordinator on small runners with CPU-heavy DOM suites.
    maxWorkers: Math.min(4, Math.max(1, availableParallelism() - 1)),
  },
});
