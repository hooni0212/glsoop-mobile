import { defineConfig } from "@playwright/test";

const webPort = process.env.EXPO_WEB_PORT || "8081";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "list",
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: `expo start --web --port ${webPort} --host localhost`,
    url: `http://localhost:${webPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      EXPO_WEB_PORT: webPort,
    },
  },
});
