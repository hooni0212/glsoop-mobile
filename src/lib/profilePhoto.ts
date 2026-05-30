import { buildApiUrl } from "@/lib/api";

export function toAbsoluteProfilePhotoUrl(...values: unknown[]) {
  for (const value of values) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/")) return buildApiUrl(raw);
    return buildApiUrl(`/${raw}`);
  }
  return "";
}
