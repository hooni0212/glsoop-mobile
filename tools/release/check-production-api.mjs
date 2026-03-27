const endpoint = "https://glsoop.com/api/runtime-config";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

try {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: controller.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!response.ok) {
    fail(`runtime-config returned HTTP ${response.status}. Body preview: ${text.slice(0, 200)}`);
  }

  if (!contentType.includes("application/json")) {
    fail(`runtime-config is not JSON. content-type=${contentType || "(missing)"}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("runtime-config JSON parse failed.");
  }

  if (parsed?.ok !== true) {
    fail(`runtime-config response is missing ok=true. Received: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  const termsVersion = parsed?.legal?.versions?.terms ?? null;
  const privacyVersion = parsed?.legal?.versions?.privacy ?? null;
  const flags = parsed?.flags ?? null;

  console.log("Verified production runtime-config endpoint:");
  console.log(`- url=${endpoint}`);
  console.log(`- status=${response.status}`);
  console.log(`- legal.versions.terms=${termsVersion ?? "(missing)"}`);
  console.log(`- legal.versions.privacy=${privacyVersion ?? "(missing)"}`);
  console.log(`- flags=${JSON.stringify(flags)}`);
} finally {
  clearTimeout(timeout);
}
