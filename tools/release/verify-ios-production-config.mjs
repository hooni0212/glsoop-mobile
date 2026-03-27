import { execFileSync } from "node:child_process";

const EXPECTED = {
  bundleIdentifier: "com.glsoop.app",
  version: "1.0.0",
  env: {
    EXPO_PUBLIC_API_BASE_URL: "https://glsoop.com",
    EXPO_PUBLIC_API_DEBUG: "false",
    EXPO_PUBLIC_GROWTH_TELEMETRY: "false",
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

if (bundleIdentifier !== EXPECTED.bundleIdentifier) {
  fail(`ios.bundleIdentifier mismatch: expected ${EXPECTED.bundleIdentifier}, received ${bundleIdentifier ?? "(missing)"}`);
}

if (version !== EXPECTED.version) {
  fail(`version mismatch: expected ${EXPECTED.version}, received ${version ?? "(missing)"}`);
}

if (typeof buildNumber !== "string" || buildNumber.trim() === "") {
  fail("ios.buildNumber is missing.");
}

console.log("Verified Expo public config:");
console.log(`- ios.bundleIdentifier=${bundleIdentifier}`);
console.log(`- version=${version}`);
console.log(`- ios.buildNumber=${buildNumber}`);

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
