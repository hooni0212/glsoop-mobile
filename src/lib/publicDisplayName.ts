const PUBLIC_DISPLAY_NAME_FALLBACK = "익명";

function toTrimmedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function pickOptionalText(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = toTrimmedText(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function normalizePublicDisplayName(...values: unknown[]): string {
  return pickOptionalText(...values) || PUBLIC_DISPLAY_NAME_FALLBACK;
}
