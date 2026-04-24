#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import process from "node:process";
import { spawn } from "node:child_process";

const WORKDIR = process.cwd();
const APP_ID = "com.glsoop.app";
const APP_SCHEME = "glsoopmobile";
const DEFAULT_IPHONE_DEVICE = "iPhone 16e";
const DEFAULT_IPAD_DEVICE = "iPad Air 11-inch (M3)";
const DEFAULT_OUTPUT_ROOT = path.resolve(
  WORKDIR,
  "../glsoop-ops/docs/archive/glsoop-mobile/ios-simulator-screenshots"
);
const DEFAULT_API_BASE = "http://127.0.0.1:3000";
const DEFAULT_EXPO_PORT = 8081;
const DEFAULT_BOOT_TIMEOUT_MS = 120000;
const DEFAULT_SCREEN_TIMEOUT_MS = 60000;
const DEFAULT_TRANSITION_PAUSE_MS = 1200;
const MAESTRO_BIN = process.env.IOS_SCREENSHOT_MAESTRO_BIN || "maestro";
const IOS_SCREENSHOT_APP_BINARY = process.env.IOS_SCREENSHOT_APP_BINARY
  ? path.resolve(WORKDIR, process.env.IOS_SCREENSHOT_APP_BINARY)
  : null;

const MAESTRO_ROOT = path.join(WORKDIR, "tools/ops/maestro");

const SCREEN_SPECS = [
  {
    id: "01-home",
    label: "home",
    routePath: "",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-home.yaml"),
  },
  {
    id: "02-search",
    label: "search",
    routePath: "search",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-search.yaml"),
  },
  {
    id: "03-post-detail",
    label: "post-detail",
    routePath: ({ latestPostId }) => (latestPostId ? `posts/${latestPostId}` : null),
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-post-detail.yaml"),
    dataKeys: ["latestPostId"],
  },
  {
    id: "04-author",
    label: "author",
    routePath: ({ latestAuthorId }) => (latestAuthorId ? `users/${latestAuthorId}` : null),
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-author.yaml"),
    dataKeys: ["latestAuthorId"],
  },
  {
    id: "05-bookmarks",
    label: "bookmarks",
    routePath: "bookmarks",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-bookmarks.yaml"),
  },
  {
    id: "06-growth",
    label: "growth",
    routePath: "growth",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-growth.yaml"),
  },
  {
    id: "07-me",
    label: "me",
    routePath: "me",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-me.yaml"),
  },
  {
    id: "08-write",
    label: "write",
    routePath: "write",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-write.yaml"),
  },
  {
    id: "09-profile-customize",
    label: "profile-customize",
    routePath: "profile-customize",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-profile-customize.yaml"),
  },
  {
    id: "10-account-center",
    label: "account-center",
    routePath: "account-center",
    assertFlow: path.join(MAESTRO_ROOT, "screens/assert-account-center.yaml"),
  },
];

let metroProcess = null;
let spawnedMetro = false;

function printHelp() {
  console.log(`
Usage:
  npm run ops:ios:screenshots -- [--device=all|iphone|ipad]

Required env:
  IOS_SCREENSHOT_QA_EMAIL
  IOS_SCREENSHOT_QA_PASSWORD

Optional env:
  IOS_SCREENSHOT_OUTPUT_ROOT   Defaults to ../glsoop-ops/docs/archive/glsoop-mobile/ios-simulator-screenshots
  IOS_SCREENSHOT_IPHONE_DEVICE Defaults to "${DEFAULT_IPHONE_DEVICE}"
  IOS_SCREENSHOT_IPAD_DEVICE   Defaults to "${DEFAULT_IPAD_DEVICE}"
  IOS_SCREENSHOT_API_BASE      Defaults to EXPO_PUBLIC_API_BASE_URL or ${DEFAULT_API_BASE}
  IOS_SCREENSHOT_EXPO_PORT     Defaults to ${DEFAULT_EXPO_PORT}
  IOS_SCREENSHOT_APP_BINARY    Optional .app/.ipa path to install instead of expo run:ios
  IOS_SCREENSHOT_MAESTRO_BIN   Defaults to "maestro"
`);
}

function parseArgs(argv) {
  const args = { device: "all" };
  for (const raw of argv) {
    if (raw === "--help" || raw === "-h") {
      args.help = true;
      continue;
    }
    if (raw.startsWith("--device=")) {
      args.device = raw.slice("--device=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${raw}`);
  }
  if (!["all", "iphone", "ipad"].includes(args.device)) {
    throw new Error(`Invalid --device value: ${args.device}`);
  }
  return args;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function resolveApiBase() {
  const raw =
    process.env.IOS_SCREENSHOT_API_BASE ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE;
  const trimmed = trimTrailingSlash(String(raw).trim());

  if (!trimmed) {
    return DEFAULT_API_BASE;
  }

  if (trimmed.startsWith("/")) {
    return `${DEFAULT_API_BASE}${trimmed}`;
  }

  return trimmed;
}

function resolveExpoPort() {
  const parsed = Number.parseInt(process.env.IOS_SCREENSHOT_EXPO_PORT ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_EXPO_PORT;
  }
  return parsed;
}

function timestampParts(date = new Date()) {
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  const [day, rest] = iso.split("T");
  const time = rest.slice(0, 8).replace(/:/g, "");
  return { day, time };
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function fileExists(targetPath) {
  return fs.access(targetPath).then(
    () => true,
    () => false
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args, options = {}) {
  const {
    capture = false,
    allowFailure = false,
    env,
    cwd = WORKDIR,
    stdio,
    timeoutMs = 0,
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: stdio ?? (capture ? ["ignore", "pipe", "pipe"] : "inherit"),
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeoutId = null;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      callback(value);
    };

    if (capture && child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (capture && child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        child.kill("SIGTERM");
        finish(
          reject,
          new Error(`Command timed out after ${timeoutMs}ms: ${formatCommand(command, args)}`)
        );
      }, timeoutMs);
    }

    child.on("error", (error) => {
      finish(reject, error);
    });

    child.on("close", (code) => {
      const result = { code: code ?? 0, stdout, stderr };
      if ((code ?? 0) === 0 || allowFailure) {
        finish(resolve, result);
        return;
      }
      const error = new Error(
        `Command failed (${code ?? 1}): ${formatCommand(command, args)}${
          stderr ? `\n${stderr.trim()}` : ""
        }`
      );
      error.result = result;
      finish(reject, error);
    });
  });
}

async function commandExists(command, args = ["--version"]) {
  try {
    const result = await runCommand(command, args, { capture: true, allowFailure: true });
    return result.code === 0;
  } catch {
    return false;
  }
}

async function ensurePreconditions(config) {
  if (!config.qaEmail || !config.qaPassword) {
    throw new Error(
      "IOS_SCREENSHOT_QA_EMAIL and IOS_SCREENSHOT_QA_PASSWORD must be set before running screenshots."
    );
  }

  if (!(await commandExists("xcrun", ["simctl", "help"]))) {
    throw new Error("xcrun simctl is not available. Install Xcode command line tools first.");
  }

  if (!(await commandExists(MAESTRO_BIN, ["--version"]))) {
    throw new Error(
      `Maestro CLI is not available as "${MAESTRO_BIN}". Install Maestro or set IOS_SCREENSHOT_MAESTRO_BIN.`
    );
  }

  const opsRepoRoot = path.resolve(WORKDIR, "../glsoop-ops");
  if (config.outputRoot.startsWith(DEFAULT_OUTPUT_ROOT) && !(await fileExists(opsRepoRoot))) {
    throw new Error(
      `Expected sibling ops repo at ${opsRepoRoot}, but it does not exist. Set IOS_SCREENSHOT_OUTPUT_ROOT to override.`
    );
  }

  await fs.mkdir(config.outputRoot, { recursive: true });
  await fs.access(config.outputRoot, fsConstants.W_OK);

  if (IOS_SCREENSHOT_APP_BINARY && !(await fileExists(IOS_SCREENSHOT_APP_BINARY))) {
    throw new Error(`IOS_SCREENSHOT_APP_BINARY does not exist: ${IOS_SCREENSHOT_APP_BINARY}`);
  }

  const requiredFlows = [
    path.join(MAESTRO_ROOT, "bootstrap-login-and-acknowledge.yaml"),
    path.join(MAESTRO_ROOT, "accept-open-link-prompt.yaml"),
    ...SCREEN_SPECS.map((screen) => screen.assertFlow),
  ];
  for (const flowPath of requiredFlows) {
    if (!(await fileExists(flowPath))) {
      throw new Error(`Required Maestro flow is missing: ${flowPath}`);
    }
  }
}

function parseRuntimeVersion(runtimeId) {
  const match = runtimeId.match(/iOS-(\d+)-(\d+)/);
  if (!match) return [0, 0];
  return [Number(match[1]), Number(match[2])];
}

async function listAvailableDevices() {
  const result = await runCommand("xcrun", ["simctl", "list", "devices", "available", "--json"], {
    capture: true,
  });
  const json = JSON.parse(result.stdout);
  const devices = [];

  for (const [runtimeId, entries] of Object.entries(json.devices ?? {})) {
    for (const entry of entries ?? []) {
      if (!entry?.isAvailable) continue;
      devices.push({
        name: entry.name,
        udid: entry.udid,
        state: entry.state,
        runtimeId,
        runtimeVersion: parseRuntimeVersion(runtimeId),
      });
    }
  }

  return devices.sort((a, b) => {
    if (b.runtimeVersion[0] !== a.runtimeVersion[0]) {
      return b.runtimeVersion[0] - a.runtimeVersion[0];
    }
    if (b.runtimeVersion[1] !== a.runtimeVersion[1]) {
      return b.runtimeVersion[1] - a.runtimeVersion[1];
    }
    return a.name.localeCompare(b.name);
  });
}

function selectDevice(devices, requestedName) {
  const exactMatches = devices.filter((device) => device.name === requestedName);
  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  const availableNames = devices.map((device) => `${device.name} (${device.runtimeId})`);
  throw new Error(
    `Requested simulator "${requestedName}" was not found.\nAvailable devices:\n- ${availableNames.join(
      "\n- "
    )}`
  );
}

async function bootDevice(device) {
  console.log(`\n==> Booting ${device.name} (${device.udid})`);
  await runCommand("xcrun", ["simctl", "boot", device.udid], {
    capture: true,
    allowFailure: true,
  });
  await runCommand("xcrun", ["simctl", "bootstatus", device.udid, "-b"]);
  await runCommand("open", ["-a", "Simulator", "--args", "-CurrentDeviceUDID", device.udid], {
    capture: true,
    allowFailure: true,
  });
  await delay(1500);
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

async function waitForMetro(port, timeoutMs = DEFAULT_BOOT_TIMEOUT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) {
      return true;
    }
    await delay(1000);
  }
  return false;
}

async function ensureMetroRunning(port) {
  if (await isPortOpen(port)) {
    console.log(`\n==> Reusing existing Expo dev server on port ${port}`);
    return;
  }

  console.log(`\n==> Starting Expo dev server on port ${port}`);
  metroProcess = spawn(
    "npx",
    [
      "expo",
      "start",
      "--dev-client",
      "--localhost",
      "--scheme",
      APP_SCHEME,
      "--port",
      String(port),
    ],
    {
      cwd: WORKDIR,
      env: process.env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  spawnedMetro = true;

  if (metroProcess.stdout) {
    metroProcess.stdout.on("data", (chunk) => {
      process.stdout.write(`[expo] ${chunk.toString()}`);
    });
  }

  if (metroProcess.stderr) {
    metroProcess.stderr.on("data", (chunk) => {
      process.stderr.write(`[expo] ${chunk.toString()}`);
    });
  }

  metroProcess.on("error", (error) => {
    console.error(`\n[expo] Failed to start Expo dev server: ${error.message}`);
  });

  metroProcess.unref();

  const ready = await waitForMetro(port);
  if (!ready) {
    throw new Error(`Expo dev server did not become reachable on port ${port} within timeout.`);
  }
}

async function isAppInstalled(device) {
  const result = await runCommand(
    "xcrun",
    ["simctl", "get_app_container", device.udid, APP_ID, "data"],
    { capture: true, allowFailure: true }
  );
  return result.code === 0;
}

async function installBinaryOnDevice(device, binaryPath) {
  console.log(`\n==> Installing ${path.basename(binaryPath)} on ${device.name}`);
  await runCommand("xcrun", ["simctl", "install", device.udid, binaryPath]);
}

async function buildAndInstallDeviceApp(device, port) {
  console.log(`\n==> Building and installing app on ${device.name}`);
  await runCommand(
    "npx",
    [
      "expo",
      "run:ios",
      "-d",
      device.udid,
      "--scheme",
      APP_SCHEME,
      "--no-bundler",
    ],
    { stdio: "inherit" }
  );
}

async function ensureAppInstalled(device, port) {
  if (await isAppInstalled(device)) {
    console.log(`\n==> App already installed on ${device.name}`);
    return;
  }

  if (IOS_SCREENSHOT_APP_BINARY) {
    await installBinaryOnDevice(device, IOS_SCREENSHOT_APP_BINARY);
    return;
  }

  await buildAndInstallDeviceApp(device, port);
}

async function launchApp(device) {
  console.log(`\n==> Launching ${APP_ID} on ${device.name}`);
  await runCommand("xcrun", [
    "simctl",
    "launch",
    "--terminate-running-process",
    device.udid,
    APP_ID,
  ]);
}

async function runMaestroFlow(
  device,
  flowPath,
  extraEnv = {},
  timeoutMs = DEFAULT_SCREEN_TIMEOUT_MS
) {
  const envArgs = Object.entries(extraEnv).flatMap(([key, value]) => ["-e", `${key}=${value}`]);
  await runCommand(
    MAESTRO_BIN,
    ["--device", device.udid, "test", flowPath, ...envArgs],
    { stdio: "inherit", timeoutMs }
  );
}

function buildDeepLink(routePath) {
  if (!routePath) return `${APP_SCHEME}://`;
  return `${APP_SCHEME}://${routePath.replace(/^\/+/, "")}`;
}

async function openRoute(device, routePath) {
  const url = buildDeepLink(routePath);
  console.log(`\n==> Opening ${url} on ${device.name}`);
  await runCommand("xcrun", ["simctl", "openurl", device.udid, url]);
  return url;
}

async function takeSimulatorScreenshot(device, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await runCommand("xcrun", ["simctl", "io", device.udid, "screenshot", targetPath]);
}

function normalizePublicPost(raw) {
  if (!raw || typeof raw !== "object") return null;
  const postId = String(raw.id ?? raw.post_id ?? "").trim();
  const authorId = String(raw.author_id ?? raw.user_id ?? raw.uid ?? "").trim();
  return {
    postId: postId || null,
    authorId: authorId || null,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 160)}`);
  }

  return parsed;
}

async function resolveLatestPublicContext(apiBase) {
  const postsUrl = `${apiBase}/api/posts?limit=1&sort=latest`;
  const feed = await fetchJson(postsUrl);
  const firstPost = Array.isArray(feed?.posts) ? feed.posts[0] : null;
  const normalized = normalizePublicPost(firstPost);

  if (!normalized?.postId) {
    return {
      latestPostId: null,
      latestAuthorId: null,
    };
  }

  if (normalized.authorId) {
    return {
      latestPostId: normalized.postId,
      latestAuthorId: normalized.authorId,
    };
  }

  const detailUrl = `${apiBase}/api/posts/${encodeURIComponent(normalized.postId)}`;
  const detail = await fetchJson(detailUrl);
  const fromDetail = normalizePublicPost(detail?.post);

  return {
    latestPostId: normalized.postId,
    latestAuthorId: fromDetail?.authorId ?? null,
  };
}

async function safeResolveLatestPublicContext(apiBase) {
  try {
    return await resolveLatestPublicContext(apiBase);
  } catch (error) {
    console.warn(`\n[warn] Failed to resolve latest public context: ${error.message}`);
    return {
      latestPostId: null,
      latestAuthorId: null,
      resolutionError: error.message,
    };
  }
}

function buildScreenDataPayload(spec, publicContext) {
  const payload = {};
  for (const key of spec.dataKeys ?? []) {
    payload[key] = publicContext[key] ?? null;
  }
  return payload;
}

async function captureScreen(device, spec, outputDir, publicContext) {
  const screenData = buildScreenDataPayload(spec, publicContext);
  const startedAt = new Date().toISOString();
  const routePath =
    typeof spec.routePath === "function" ? spec.routePath(publicContext) : spec.routePath;

  if (routePath === null) {
    return {
      id: spec.id,
      label: spec.label,
      status: "skipped_no_data",
      routePath: null,
      deepLink: null,
      screenshot: null,
      data: screenData,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: "Latest public data was not available for this screen.",
    };
  }

  try {
    const deepLink = spec.id === "01-home" ? buildDeepLink("") : await openRoute(device, routePath);
    if (spec.id !== "01-home") {
      await delay(DEFAULT_TRANSITION_PAUSE_MS);
      try {
        await runMaestroFlow(
          device,
          path.join(MAESTRO_ROOT, "accept-open-link-prompt.yaml"),
          {},
          4000
        );
      } catch (error) {
        console.warn(`\n[warn] Open-link prompt helper failed for ${spec.id}: ${error.message}`);
      }
      await delay(800);
    }

    await runMaestroFlow(device, spec.assertFlow);
    const screenshotPath = path.join(outputDir, `${spec.id}.png`);
    await takeSimulatorScreenshot(device, screenshotPath);

    return {
      id: spec.id,
      label: spec.label,
      status: "captured",
      routePath: routePath || "/",
      deepLink,
      screenshot: screenshotPath,
      data: screenData,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      id: spec.id,
      label: spec.label,
      status: "failed",
      routePath: routePath || "/",
      deepLink: routePath === null ? null : buildDeepLink(routePath),
      screenshot: null,
      data: screenData,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message,
    };
  }
}

async function writeJson(targetPath, value) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function getGitSha() {
  const result = await runCommand("git", ["rev-parse", "--short", "HEAD"], {
    capture: true,
    allowFailure: true,
  });
  return result.code === 0 ? result.stdout.trim() : null;
}

async function captureDevice(device, config, publicContext, runDir) {
  const deviceSlug = slugify(device.name);
  const outputDir = path.join(runDir, deviceSlug);
  const manifestPath = path.join(outputDir, "manifest.json");

  await fs.mkdir(outputDir, { recursive: true });

  await bootDevice(device);
  await ensureAppInstalled(device, config.expoPort);
  await launchApp(device);

  console.log(`\n==> Running bootstrap flow on ${device.name}`);
  await runMaestroFlow(device, path.join(MAESTRO_ROOT, "bootstrap-login-and-acknowledge.yaml"), {
    QA_EMAIL: config.qaEmail,
    QA_PASSWORD: config.qaPassword,
  }, DEFAULT_BOOT_TIMEOUT_MS);

  const screens = [];
  for (const spec of SCREEN_SPECS) {
    const result = await captureScreen(device, spec, outputDir, publicContext);
    screens.push(result);
  }

  const deviceManifest = {
    device: {
      name: device.name,
      udid: device.udid,
      runtimeId: device.runtimeId,
    },
    outputDir,
    screens,
  };

  await writeJson(manifestPath, deviceManifest);
  return deviceManifest;
}

function cleanupMetro() {
  if (!spawnedMetro || !metroProcess) return;
  try {
    process.kill(-metroProcess.pid, "SIGTERM");
  } catch {
    // ignore cleanup failure
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = {
    qaEmail: process.env.IOS_SCREENSHOT_QA_EMAIL?.trim() || "",
    qaPassword: process.env.IOS_SCREENSHOT_QA_PASSWORD?.trim() || "",
    outputRoot: path.resolve(WORKDIR, process.env.IOS_SCREENSHOT_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT),
    iphoneDevice: process.env.IOS_SCREENSHOT_IPHONE_DEVICE || DEFAULT_IPHONE_DEVICE,
    ipadDevice: process.env.IOS_SCREENSHOT_IPAD_DEVICE || DEFAULT_IPAD_DEVICE,
    apiBase: resolveApiBase(),
    expoPort: resolveExpoPort(),
  };

  await ensurePreconditions(config);

  const { day, time } = timestampParts();
  const runDir = path.join(config.outputRoot, day, `run-${time}`);
  await fs.mkdir(runDir, { recursive: true });

  const devices = await listAvailableDevices();
  const selectedDevices = [];

  if (args.device === "all" || args.device === "iphone") {
    selectedDevices.push(selectDevice(devices, config.iphoneDevice));
  }
  if (args.device === "all" || args.device === "ipad") {
    selectedDevices.push(selectDevice(devices, config.ipadDevice));
  }

  const gitSha = await getGitSha();

  process.on("SIGINT", () => {
    cleanupMetro();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanupMetro();
    process.exit(143);
  });
  process.on("exit", cleanupMetro);

  await ensureMetroRunning(config.expoPort);
  const publicContext = await safeResolveLatestPublicContext(config.apiBase);

  const deviceResults = [];
  for (const device of selectedDevices) {
    deviceResults.push(await captureDevice(device, config, publicContext, runDir));
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    gitSha,
    apiBase: config.apiBase,
    outputRoot: config.outputRoot,
    runDir,
    devices: deviceResults,
    publicContext,
  };

  await writeJson(path.join(runDir, "manifest.json"), manifest);

  const totals = deviceResults.flatMap((device) => device.screens).reduce(
    (acc, screen) => {
      acc[screen.status] = (acc[screen.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  console.log("\n==> Screenshot run finished");
  console.log(`Run directory: ${runDir}`);
  console.log(`Summary: ${JSON.stringify(totals)}`);
}

main().catch((error) => {
  cleanupMetro();
  console.error(`\n[error] ${error.message}`);
  process.exit(1);
});
