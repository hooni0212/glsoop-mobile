import { execFileSync } from "node:child_process";

const EXPECTED = {
  bundleIdentifier: "com.glsoop.app",
  version: "1.0.9",
  supportsTablet: true,
  requireFullScreen: true,
  env: {
    EXPO_PUBLIC_API_BASE_URL: "https://glsoop.com",
    EXPO_PUBLIC_API_DEBUG: "false",
    EXPO_PUBLIC_GROWTH_TELEMETRY: "false",
    EXPO_PUBLIC_PREMIUM_IAP_ENABLED: "true",
  },
};

const checkEnv = process.argv.includes("--check-env");

function getExpoConfig() {
  const raw = execFileSync("npx", ["expo", "config", "--type", "public", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(raw);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const config = getExpoConfig();
const bundleIdentifier = config?.ios?.bundleIdentifier;
const version = config?.version;
const buildNumber = config?.ios?.buildNumber;
const supportsTablet = config?.ios?.supportsTablet;
const requireFullScreen = config?.ios?.requireFullScreen;
const infoPlist = config?.ios?.infoPlist ?? {};

if (bundleIdentifier !== EXPECTED.bundleIdentifier) {
  fail(`ios.bundleIdentifier mismatch: expected ${EXPECTED.bundleIdentifier}, received ${bundleIdentifier ?? "(missing)"}`);
}

if (version !== EXPECTED.version) {
  fail(`version mismatch: expected ${EXPECTED.version}, received ${version ?? "(missing)"}`);
}

if (typeof buildNumber !== "string" || buildNumber.trim() === "") {
  fail("ios.buildNumber is missing.");
}

if (supportsTablet !== EXPECTED.supportsTablet) {
  fail(
    `ios.supportsTablet mismatch: expected ${String(EXPECTED.supportsTablet)}, received ${String(supportsTablet)}`
  );
}

if (requireFullScreen !== EXPECTED.requireFullScreen) {
  fail(
    `ios.requireFullScreen mismatch: expected ${String(EXPECTED.requireFullScreen)}, received ${String(requireFullScreen)}`
  );
}

if (Object.prototype.hasOwnProperty.call(infoPlist, "NSUserTrackingUsageDescription")) {
  fail("ios.infoPlist.NSUserTrackingUsageDescription must be removed unless ATT tracking is intentionally enabled.");
}

console.log("Verified Expo public config:");
console.log(`- ios.bundleIdentifier=${bundleIdentifier}`);
console.log(`- version=${version}`);
console.log(`- ios.buildNumber=${buildNumber}`);
console.log(`- ios.supportsTablet=${String(supportsTablet)}`);
console.log(`- ios.requireFullScreen=${String(requireFullScreen)}`);
console.log("- ios.infoPlist.NSUserTrackingUsageDescription=(absent)");

if (!checkEnv) {
  process.exit(0);
}

for (const [key, expectedValue] of Object.entries(EXPECTED.env)) {
  const actual = process.env[key];
  if (actual !== expectedValue) {
    fail(`${key} mismatch: expected ${expectedValue}, received ${actual ?? "(missing)"}`);
  }
}

console.log("Verified production env:");
for (const [key, expectedValue] of Object.entries(EXPECTED.env)) {
  console.log(`- ${key}=${expectedValue}`);
}
