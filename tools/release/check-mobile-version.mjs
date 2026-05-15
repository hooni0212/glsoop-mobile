import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsonPath = path.resolve(__dirname, "../../app.json");
const appConfigPath = path.resolve(__dirname, "../../app.config.ts");
const minBuildArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--min-build="));
const minBuildNumber = minBuildArg
  ? Number(minBuildArg.replace("--min-build=", ""))
  : null;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function getExpoConfig() {
  try {
    const raw = execFileSync("npx", ["expo", "config", "--type", "public", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw);
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr).trim() : "";
    fail(`Could not read Expo config.${stderr ? `\n${stderr}` : ""}`);
  }
}

function parseBuildNumber(source) {
  const match = source.match(/const MOBILE_BUILD_NUMBER = (\d+);/);
  if (!match) {
    fail("Could not find `MOBILE_BUILD_NUMBER` in app.config.ts.");
  }
  return Number(match[1]);
}

function assertSemver(version) {
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`expo.version must use x.y.z format. Received ${version ?? "(missing)"}`);
  }
}

const [appJsonRaw, appConfigSource] = await Promise.all([
  readFile(appJsonPath, "utf8"),
  readFile(appConfigPath, "utf8"),
]);

const appJson = JSON.parse(appJsonRaw);
const configuredVersion = appJson?.expo?.version;
const configuredBuildNumber = parseBuildNumber(appConfigSource);
const expoConfig = getExpoConfig();

const resolvedVersion = expoConfig?.version;
const iosBuildNumber = expoConfig?.ios?.buildNumber;
const androidVersionCode = expoConfig?.android?.versionCode;
const extraBuildNumber = expoConfig?.extra?.mobileBuildNumber;

assertSemver(configuredVersion);

if (
  minBuildNumber !== null &&
  (!Number.isInteger(minBuildNumber) || minBuildNumber <= 0)
) {
  fail(`--min-build must be a positive integer. Received ${minBuildArg}`);
}

if (minBuildNumber !== null && configuredBuildNumber < minBuildNumber) {
  fail(
    `Build number is too low: current=${configuredBuildNumber}, required minimum=${minBuildNumber}`
  );
}

if (resolvedVersion !== configuredVersion) {
  fail(
    `Resolved Expo version mismatch: app.json=${configuredVersion}, expo config=${resolvedVersion ?? "(missing)"}`
  );
}

if (iosBuildNumber !== String(configuredBuildNumber)) {
  fail(
    `iOS buildNumber mismatch: app.config.ts=${configuredBuildNumber}, expo config=${iosBuildNumber ?? "(missing)"}`
  );
}

if (androidVersionCode !== configuredBuildNumber) {
  fail(
    `Android versionCode mismatch: app.config.ts=${configuredBuildNumber}, expo config=${androidVersionCode ?? "(missing)"}`
  );
}

if (extraBuildNumber !== configuredBuildNumber) {
  fail(
    `extra.mobileBuildNumber mismatch: app.config.ts=${configuredBuildNumber}, expo config=${extraBuildNumber ?? "(missing)"}`
  );
}

console.log("Mobile release version check passed:");
console.log(`- version=${resolvedVersion}`);
console.log(`- ios.buildNumber=${iosBuildNumber}`);
console.log(`- android.versionCode=${androidVersionCode}`);
console.log(`- extra.mobileBuildNumber=${extraBuildNumber}`);
if (minBuildNumber !== null) {
  console.log(`- minBuild=${minBuildNumber}`);
}
