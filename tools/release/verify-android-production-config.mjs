import { execFileSync } from "node:child_process";

const EXPECTED = {
  packageName: "com.glsoop.app",
  version: "2.0.0",
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
const packageName = config?.android?.package;
const version = config?.version;
const versionCode = config?.android?.versionCode;

if (packageName !== EXPECTED.packageName) {
  fail(`android.package mismatch: expected ${EXPECTED.packageName}, received ${packageName ?? "(missing)"}`);
}

if (version !== EXPECTED.version) {
  fail(`version mismatch: expected ${EXPECTED.version}, received ${version ?? "(missing)"}`);
}

if (!Number.isInteger(versionCode) || versionCode <= 0) {
  fail(`android.versionCode must be a positive integer. Received ${versionCode ?? "(missing)"}`);
}

if (versionCode > 2_100_000_000) {
  fail(`android.versionCode exceeds Google Play's maximum supported value. Received ${versionCode}`);
}

console.log("Verified Expo public config:");
console.log(`- android.package=${packageName}`);
console.log(`- version=${version}`);
console.log(`- android.versionCode=${versionCode}`);

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
