import { defineConfig, type ReporterDescription } from "@playwright/test";

const reporters: ReporterDescription[] = [
  [process.env.CI ? "line" : "list"],
  ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
];
if (process.env.CI) reporters.push(["github"]);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  maxFailures: process.env.CI ? 1 : 0,
  outputDir: "artifacts/playwright",
  reporter: reporters,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", channel: process.env.CI ? undefined : "chrome" },
    },
  ],
  webServer: {
    command: "node scripts/preview.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
