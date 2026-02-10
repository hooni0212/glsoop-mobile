type GrowthTelemetryValue = string | number | boolean | null | undefined;
type GrowthTelemetryPayload = Record<string, GrowthTelemetryValue>;

const TELEMETRY_ENABLED =
  __DEV__ || (typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_GROWTH_TELEMETRY === "true");

function compactPayload(payload: GrowthTelemetryPayload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

export function toGrowthTelemetryError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function trackGrowthTelemetry(event: string, payload: GrowthTelemetryPayload = {}) {
  if (!TELEMETRY_ENABLED) return;

  const timestamp = new Date().toISOString();
  const compact = compactPayload(payload);
  console.info("[growth:telemetry]", event, { timestamp, ...compact });
}
