import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "editor-specialist.spec.ts",
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", channel: process.env.CI ? undefined : "chrome" },
    },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
