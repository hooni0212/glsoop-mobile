const DEFAULT_SITE_URL = "https://www.glsoop.com";

function normalizeOptionalUrl(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/+$/, "") : null;
}

function normalizeOptionalText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const siteUrl = normalizeOptionalUrl(process.env.EXPO_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;

export const releaseConfig = {
  iosBundleIdentifier: "com.glsoop.mobile",
  siteUrl,
  supportUrl: normalizeOptionalUrl(process.env.EXPO_PUBLIC_SUPPORT_URL),
  supportEmail: normalizeOptionalText(process.env.EXPO_PUBLIC_SUPPORT_EMAIL),
} as const;

export type LegalDocumentKey = "terms" | "privacy" | "guidelines";

const LEGAL_PATHS: Record<LegalDocumentKey, string> = {
  terms: "/html/terms.html",
  privacy: "/html/privacy.html",
  guidelines: "/html/community-guidelines.html",
};

export function getLegalDocumentUrl(key: LegalDocumentKey) {
  return `${releaseConfig.siteUrl}${LEGAL_PATHS[key]}`;
}
