import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "../../app.config.ts");

const argv = process.argv.slice(2);
const shouldPrintOnly = argv.includes("--print");
const numericArg = argv.find((arg) => /^\d+$/.test(arg));

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseBuildNumber(source) {
  const match = source.match(/const MOBILE_BUILD_NUMBER = (\d+);/);
  if (!match) {
    fail("Could not find `MOBILE_BUILD_NUMBER` in app.config.ts.");
  }
  return {
    value: Number(match[1]),
    matchText: match[0],
  };
}

function resolveNextBuildNumber(current) {
  if (!numericArg) return current + 1;

  const next = Number(numericArg);
  if (!Number.isInteger(next) || next <= 0) {
    fail("Build number must be a positive integer.");
  }

  return next;
}

const source = await readFile(configPath, "utf8");
const { value: current, matchText } = parseBuildNumber(source);

if (shouldPrintOnly) {
  console.log(current);
  process.exit(0);
}

const next = resolveNextBuildNumber(current);

if (next === current) {
  console.log(`Build number is already ${current}. No changes made.`);
  process.exit(0);
}

const nextSource = source.replace(matchText, `const MOBILE_BUILD_NUMBER = ${next};`);
await writeFile(configPath, nextSource, "utf8");

console.log(`Updated mobile build number: ${current} -> ${next}`);
console.log("iOS buildNumber and Android versionCode will now both use this value.");
