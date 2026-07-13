import { trackNativeUxEvent } from "@/lib/nativeAnalytics";

export type PremiumEntrySource =
  | "account_center"
  | "author_signature"
  | "home_discovery"
  | "me_card"
  | "photo_save"
  | "profile_photo"
  | "sentence_frame"
  | "unknown";

export type PremiumFunnelEvent =
  | "premium_entry_impression"
  | "premium_entry_click"
  | "premium_paywall_view"
  | "premium_plan_select"
  | "premium_purchase_start"
  | "premium_purchase_success"
  | "premium_purchase_cancel"
  | "premium_purchase_error";

export function normalizePremiumEntrySource(value: unknown): PremiumEntrySource {
  if (
    value === "account_center" ||
    value === "author_signature" ||
    value === "home_discovery" ||
    value === "me_card" ||
    value === "photo_save" ||
    value === "profile_photo" ||
    value === "sentence_frame"
  ) {
    return value;
  }
  return "unknown";
}

export function buildPremiumPath(source: PremiumEntrySource) {
  return `/premium?source=${encodeURIComponent(source)}`;
}

export function trackPremiumFunnelEvent(
  eventName: PremiumFunnelEvent,
  source: PremiumEntrySource,
  properties: Record<string, string | number | boolean | null | undefined> = {}
) {
  return trackNativeUxEvent(eventName, {
    pagePath: "/premium",
    properties: { source, ...properties },
  });
}
