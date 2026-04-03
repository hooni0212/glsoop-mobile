const DEFAULT_SITE_URL = "https://www.glsoop.com";
const DEFAULT_SUPPORT_EMAIL = "glsoop1752@gmail.com";
const APP_IDENTIFIER = "com.glsoop.app";

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
const supportUrl =
  normalizeOptionalUrl(process.env.EXPO_PUBLIC_SUPPORT_URL) ?? `${siteUrl}/support`;
const supportEmail =
  normalizeOptionalText(process.env.EXPO_PUBLIC_SUPPORT_EMAIL) ?? DEFAULT_SUPPORT_EMAIL;

export const releaseConfig = {
  appDisplayName: "글숲",
  appIdentifier: APP_IDENTIFIER,
  iosBundleIdentifier: APP_IDENTIFIER,
  androidPackage: APP_IDENTIFIER,
  shortTagline: "일상의 작은 순간들을 기록하고 나누는 공간",
  longDescription:
    "매일 조금씩 읽고 쓰는 사람들을 위한 공간, 글숲에서 조용히 오래 남는 글을 만들고 있어요.",
  siteUrl,
  supportUrl,
  supportEmail,
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

export function getSupportUrl() {
  return releaseConfig.supportUrl;
}

export function getSupportEmail() {
  return releaseConfig.supportEmail;
}
