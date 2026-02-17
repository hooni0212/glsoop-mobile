export type CosmeticStickerSlot = "tl" | "tr" | "br";

export const COSMETIC_STICKER_SLOTS: CosmeticStickerSlot[] = ["tl", "tr", "br"];
export const MAX_SHOWCASE_BADGES = 6;
export const MAX_HEADER_STICKERS = 3;

export type CosmeticItem = {
  key: string;
  name: string;
  icon_emoji: string | null;
  rarity: string | null;
  season: string | null;
};

export type ProfileCosmeticsState = {
  primary_badge_key: string | null;
  showcase_badge_keys: string[];
  header_stickers: { slot: CosmeticStickerSlot; key: string }[];
};

export type ProfileCosmeticsExpanded = {
  primary_badge?: CosmeticItem | null;
  showcase_badges?: CosmeticItem[];
  header_stickers?: { slot: CosmeticStickerSlot; sticker: CosmeticItem }[];
};

export type NormalizedProfileCosmeticsExpanded = {
  primary_badge: CosmeticItem | null;
  showcase_badges: CosmeticItem[];
  header_stickers: { slot: CosmeticStickerSlot; sticker: CosmeticItem }[];
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableText(value: unknown): string | null {
  const trimmed = toText(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function normalizeCosmeticKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeStickerSlot(value: unknown): CosmeticStickerSlot | null {
  if (typeof value !== "string") return null;
  const slot = value.trim().toLowerCase();
  if (slot === "tl" || slot === "tr" || slot === "br") return slot;
  return null;
}

export function normalizeCosmeticItem(value: unknown): CosmeticItem | null {
  const row = toRecord(value);
  const key = normalizeCosmeticKey(row.key);
  if (!key) return null;

  const name = toNullableText(row.name) || key;

  return {
    key,
    name,
    icon_emoji: toNullableText(row.icon_emoji ?? row.iconEmoji),
    rarity: toNullableText(row.rarity) || "common",
    season: toNullableText(row.season),
  };
}

export function createEmptyProfileCosmeticsState(): ProfileCosmeticsState {
  return {
    primary_badge_key: null,
    showcase_badge_keys: [],
    header_stickers: [],
  };
}

export function normalizeProfileCosmeticsState(value: unknown): ProfileCosmeticsState {
  const row = toRecord(value);

  const primary_badge_key = normalizeCosmeticKey(
    row.primary_badge_key ?? row.primaryBadgeKey
  );

  const rawShowcase = toArray(row.showcase_badge_keys ?? row.showcaseBadgeKeys);
  const showcaseSeen = new Set<string>();
  const showcase_badge_keys: string[] = [];

  for (const rawKey of rawShowcase) {
    const key = normalizeCosmeticKey(rawKey);
    if (!key || showcaseSeen.has(key)) continue;
    showcaseSeen.add(key);
    showcase_badge_keys.push(key);
    if (showcase_badge_keys.length >= MAX_SHOWCASE_BADGES) break;
  }

  const rawStickers = toArray(row.header_stickers ?? row.headerStickers);
  const slotSeen = new Set<CosmeticStickerSlot>();
  const header_stickers: { slot: CosmeticStickerSlot; key: string }[] = [];

  for (const rawEntry of rawStickers) {
    const entry = toRecord(rawEntry);
    const slot = normalizeStickerSlot(entry.slot);
    const key = normalizeCosmeticKey(entry.key);
    if (!slot || !key || slotSeen.has(slot)) continue;

    slotSeen.add(slot);
    header_stickers.push({ slot, key });
    if (header_stickers.length >= MAX_HEADER_STICKERS) break;
  }

  return {
    primary_badge_key,
    showcase_badge_keys,
    header_stickers,
  };
}

export function normalizeProfileCosmeticsExpanded(
  value: unknown
): NormalizedProfileCosmeticsExpanded {
  const row = toRecord(value);

  const primary_badge = normalizeCosmeticItem(row.primary_badge ?? row.primaryBadge);

  const rawShowcase = toArray(row.showcase_badges ?? row.showcaseBadges);
  const showcaseSeen = new Set<string>();
  const showcase_badges: CosmeticItem[] = [];

  for (const rawItem of rawShowcase) {
    const item = normalizeCosmeticItem(rawItem);
    if (!item || showcaseSeen.has(item.key)) continue;
    showcaseSeen.add(item.key);
    showcase_badges.push(item);
    if (showcase_badges.length >= MAX_SHOWCASE_BADGES) break;
  }

  const rawStickers = toArray(row.header_stickers ?? row.headerStickers);
  const slotSeen = new Set<CosmeticStickerSlot>();
  const header_stickers: { slot: CosmeticStickerSlot; sticker: CosmeticItem }[] = [];

  for (const rawEntry of rawStickers) {
    const entry = toRecord(rawEntry);
    const slot = normalizeStickerSlot(entry.slot);
    const sticker = normalizeCosmeticItem(
      entry.sticker ?? entry.item ?? entry.cosmetic
    );

    if (!slot || !sticker || slotSeen.has(slot)) continue;
    slotSeen.add(slot);
    header_stickers.push({ slot, sticker });
    if (header_stickers.length >= MAX_HEADER_STICKERS) break;
  }

  return {
    primary_badge,
    showcase_badges,
    header_stickers,
  };
}
