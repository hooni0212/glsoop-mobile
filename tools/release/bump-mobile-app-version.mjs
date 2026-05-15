import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsonPath = path.resolve(__dirname, "../../app.json");

const argv = process.argv.slice(2);
const shouldPrintOnly = argv.includes("--print");
const explicitVersion = argv.find((arg) => /^\d+\.\d+\.\d+$/.test(arg));
const bumpMajor = argv.includes("--major");
const bumpMinor = argv.includes("--minor");
const bumpPatch = argv.includes("--patch");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseVersion(value) {
  if (typeof value !== "string") {
    fail("Could not find `expo.version` in app.json.");
  }

  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    fail(`Unsupported app version: ${value}. Expected x.y.z.`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function resolveNextVersion(currentVersion) {
  if (explicitVersion) return explicitVersion;

  const selectedBumpCount = [bumpMajor, bumpMinor, bumpPatch].filter(Boolean).length;
  if (selectedBumpCount > 1) {
    fail("Use only one of --major, --minor, or --patch.");
  }

  const current = parseVersion(currentVersion);
  if (bumpMajor) {
    return formatVersion({ major: current.major + 1, minor: 0, patch: 0 });
  }
  if (bumpMinor) {
    return formatVersion({ major: current.major, minor: current.minor + 1, patch: 0 });
  }

  return formatVersion({ ...current, patch: current.patch + 1 });
}

const raw = await readFile(appJsonPath, "utf8");
const appJson = JSON.parse(raw);
const currentVersion = appJson?.expo?.version;

if (shouldPrintOnly) {
  console.log(currentVersion);
  process.exit(0);
}

const nextVersion = resolveNextVersion(currentVersion);

if (nextVersion === currentVersion) {
  console.log(`App version is already ${currentVersion}. No changes made.`);
  process.exit(0);
}

appJson.expo.version = nextVersion;
await writeFile(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`, "utf8");

console.log(`Updated app version: ${currentVersion} -> ${nextVersion}`);
console.log("Expo version will use this value for iOS and Android release metadata.");
