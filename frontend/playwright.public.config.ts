import { defineConfig, devices } from "@playwright/test";

// Exercises the built frontend against the real stateless backend, without mocks.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "public-release.spec.ts",
  workers: 1,
  reporter: "list",
  outputDir: "test-results/public",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
});
