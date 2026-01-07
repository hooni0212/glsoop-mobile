const { spawn } = require("child_process");
const { startMockApiServer } = require("./mock-api");

const apiPort = Number(process.env.E2E_API_PORT || "4010");
const webPort = Number(process.env.E2E_WEB_PORT || "8081");
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

const { server, close } = startMockApiServer({ port: apiPort });

const expo = spawn(
  "npx",
  ["expo", "start", "--web", "--port", String(webPort), "--host", "localhost"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      E2E_WEB_PORT: String(webPort),
      EXPO_WEB_PORT: String(webPort),
      EXPO_NO_BROWSER: "1",
    },
  }
);

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (expo && !expo.killed) {
    expo.kill(signal);
  }

  close().finally(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

expo.on("exit", (code) => {
  close().finally(() => {
    process.exit(code ?? 0);
  });
});

expo.on("error", (error) => {
  console.error("[e2e] Failed to start Expo:", error);
  shutdown("SIGTERM");
});
