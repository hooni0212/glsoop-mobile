import { apiGet, apiPatch } from "@/lib/api";

export type MarketingPushConsent = {
  marketingPushOptIn: boolean;
  marketingVersion: string;
  updatedAt: string | null;
};

type MarketingPushConsentResponse = {
  ok?: boolean;
  message?: string;
  consent?: {
    marketing_push_opt_in?: unknown;
    marketingPushOptIn?: unknown;
    marketing_version?: unknown;
    marketingVersion?: unknown;
    updated_at?: unknown;
    updatedAt?: unknown;
  };
};

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeConsent(res: MarketingPushConsentResponse): MarketingPushConsent {
  const consent = res.consent ?? {};
  const updatedAt = toText(consent.updated_at ?? consent.updatedAt).trim();

  return {
    marketingPushOptIn: toBoolean(
      consent.marketing_push_opt_in ?? consent.marketingPushOptIn
    ),
    marketingVersion: toText(consent.marketing_version ?? consent.marketingVersion).trim(),
    updatedAt: updatedAt || null,
  };
}

export async function getMarketingPushConsent() {
  const res = await apiGet<MarketingPushConsentResponse>("/api/marketing-push-consent");
  return normalizeConsent(res);
}

export async function updateMarketingPushConsent(input: {
  marketingPushOptIn: boolean;
  marketingVersion?: string;
}) {
  const res = await apiPatch<MarketingPushConsentResponse>("/api/marketing-push-consent", {
    marketing_push_opt_in: input.marketingPushOptIn,
    marketing_version: input.marketingVersion,
  });
  return normalizeConsent(res);
}
