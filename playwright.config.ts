import { defineConfig } from "@playwright/test";

function resolveWebPort() {
  const rawPort = process.env.EXPO_WEB_PORT?.trim();
  const parsedPort = Number.parseInt(rawPort ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    return 8081;
  }

  return parsedPort;
}

const webPort = resolveWebPort();

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
      EXPO_WEB_PORT: String(webPort),
      EXPO_PUBLIC_E2E: "true",
    },
  },
});
