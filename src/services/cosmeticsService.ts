import { apiGet, apiPut } from "@/lib/api";
import {
  createEmptyProfileCosmeticsState,
  normalizeCosmeticItem,
  normalizeProfileCosmeticsExpanded,
  normalizeProfileCosmeticsState,
  type CosmeticItem,
  type NormalizedProfileCosmeticsExpanded,
  type ProfileCosmeticsState,
} from "@/types/cosmetics";

type CosmeticsInventory = {
  badges: CosmeticItem[];
  stickers: CosmeticItem[];
  backgrounds: CosmeticItem[];
};

export type MyCosmeticsResult = {
  inventory: CosmeticsInventory;
  profile: ProfileCosmeticsState;
};

export type UpdateProfileCosmeticsResult = {
  message: string;
  profile: ProfileCosmeticsState;
  profile_cosmetics: NormalizedProfileCosmeticsExpanded;
};

type GetMyCosmeticsResponse = {
  ok?: boolean;
  message?: string;
  data?: unknown;
  inventory?: unknown;
  profile?: unknown;
};

type UpdateProfileCosmeticsResponse = {
  ok?: boolean;
  message?: string;
  data?: unknown;
  profile_cosmetics?: unknown;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function extractBasePayload<T extends { data?: unknown }>(response: T): Record<string, unknown> {
  if (response?.data && typeof response.data === "object") {
    return response.data as Record<string, unknown>;
  }
  return toRecord(response);
}

function normalizeItemList(value: unknown): CosmeticItem[] {
  const rows = toArray(value);
  const items: CosmeticItem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const item = normalizeCosmeticItem(row);
    if (!item || seen.has(item.key)) continue;
    seen.add(item.key);
    items.push(item);
  }

  return items;
}

function normalizeInventory(value: unknown): CosmeticsInventory {
  const row = toRecord(value);

  const badges = normalizeItemList(row.badges ?? row.badge_items);
  const stickers = normalizeItemList(row.stickers ?? row.sticker_items);
  const backgrounds = normalizeItemList(row.backgrounds ?? row.background_items);

  return { badges, stickers, backgrounds };
}

export async function getMyCosmetics(): Promise<MyCosmeticsResult> {
  const response = await apiGet<GetMyCosmeticsResponse>("/api/cosmetics/me");
  if (response?.ok === false) {
    throw new Error(response?.message || "코스메틱 정보를 불러오지 못했어요.");
  }

  const base = extractBasePayload(response);

  const inventory = normalizeInventory(base.inventory ?? base);
  const profile = normalizeProfileCosmeticsState(
    base.profile ??
      base.profile_cosmetics ??
      base.profile_cosmetics_state ??
      createEmptyProfileCosmeticsState()
  );

  return {
    inventory,
    profile,
  };
}

export async function updateProfileCosmetics(
  payload: ProfileCosmeticsState
): Promise<UpdateProfileCosmeticsResult> {
  const normalizedPayload = normalizeProfileCosmeticsState(payload);

  const response = await apiPut<UpdateProfileCosmeticsResponse>(
    "/api/me/profile-cosmetics",
    normalizedPayload
  );

  if (response?.ok === false) {
    throw new Error(response?.message || "프로필 꾸미기 저장에 실패했어요.");
  }

  const base = extractBasePayload(response);
  const message = toText(base.message) || response.message || "저장했어요";

  return {
    message,
    profile: normalizedPayload,
    profile_cosmetics: normalizeProfileCosmeticsExpanded(
      base.profile_cosmetics ?? response.profile_cosmetics
    ),
  };
}
