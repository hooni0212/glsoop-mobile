import { apiGet } from "@/lib/api";

export const PREMIUM_ENTITLEMENT_KEY = "premium:glsoop";

type RawEntitlement = {
  entitlement_key?: unknown;
  entitlementKey?: unknown;
  status?: unknown;
  starts_at?: unknown;
  startsAt?: unknown;
  ends_at?: unknown;
  endsAt?: unknown;
  source?: unknown;
};

type EntitlementsResponse = {
  ok?: boolean;
  entitlements?: RawEntitlement[];
};

export type UserEntitlement = {
  entitlementKey: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  source: string | null;
};

function toNullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEntitlement(row: RawEntitlement): UserEntitlement | null {
  const entitlementKey = toNullableText(row.entitlement_key) || toNullableText(row.entitlementKey);
  if (!entitlementKey) return null;

  return {
    entitlementKey,
    status: toNullableText(row.status) || "inactive",
    startsAt: toNullableText(row.starts_at) || toNullableText(row.startsAt),
    endsAt: toNullableText(row.ends_at) || toNullableText(row.endsAt),
    source: toNullableText(row.source),
  };
}

export async function listMyEntitlements(): Promise<UserEntitlement[]> {
  const response = await apiGet<EntitlementsResponse>("/api/entitlements/me");
  if (response?.ok === false) {
    return [];
  }

  return Array.isArray(response?.entitlements)
    ? response.entitlements.map(normalizeEntitlement).filter(Boolean) as UserEntitlement[]
    : [];
}

export function hasActiveEntitlement(
  entitlements: UserEntitlement[],
  entitlementKey = PREMIUM_ENTITLEMENT_KEY,
  nowMs = Date.now()
) {
  return entitlements.some((item) => {
    if (item.entitlementKey !== entitlementKey || item.status !== "active") {
      return false;
    }

    if (item.startsAt) {
      const startsAtMs = Date.parse(item.startsAt);
      if (!Number.isFinite(startsAtMs) || startsAtMs > nowMs) return false;
    }

    if (item.endsAt) {
      const endsAtMs = Date.parse(item.endsAt);
      if (!Number.isFinite(endsAtMs) || endsAtMs <= nowMs) return false;
    }

    return true;
  });
}
