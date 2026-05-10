import type {
  GrowthAchievement,
  GrowthCosmeticReward,
  GrowthQuest,
} from "@/features/growth/useGrowthData";

export type GrowthRewardCosmeticPreview = {
  key: string;
  icon: string;
  label: string;
  type: "badge" | "background" | "sticker";
};

type RewardCosmeticSource = Pick<
  GrowthAchievement | GrowthQuest,
  "rewardCosmeticKeys" | "rewardCosmetics" | "uiJson"
>;

function normalizeRewardType(
  key: string,
  type: GrowthCosmeticReward["type"]
): GrowthRewardCosmeticPreview["type"] {
  if (type === "badge" || type === "background" || type === "sticker") return type;
  if (key.startsWith("background_")) return "background";
  if (key.startsWith("badge_")) return "badge";
  return "sticker";
}

function normalizeKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => String(item || "").trim()).filter(Boolean))
  ).slice(0, 4);
}

function parseUiJsonRewardKeys(uiJson: string | null | undefined): string[] {
  if (!uiJson) return [];
  try {
    const parsed = JSON.parse(uiJson) as { rewards?: { cosmetics?: unknown } };
    return normalizeKeys(parsed?.rewards?.cosmetics);
  } catch {
    return [];
  }
}

function fallbackRewardPreview(key: string): GrowthRewardCosmeticPreview {
  if (key.startsWith("background_")) {
    return { key, icon: "🎨", label: "프로필 배경", type: "background" };
  }
  if (key.startsWith("badge_")) {
    return { key, icon: "🏅", label: "배지", type: "badge" };
  }
  return { key, icon: "✨", label: "스티커", type: "sticker" };
}

export function buildRewardCosmeticPreviews(
  source: RewardCosmeticSource
): GrowthRewardCosmeticPreview[] {
  const serverRewards = Array.isArray(source.rewardCosmetics) ? source.rewardCosmetics : [];
  const serverKeys = normalizeKeys(source.rewardCosmeticKeys);
  if (serverRewards.length > 0) {
    const seen = new Set<string>();
    return serverRewards
      .filter((reward) => {
        if (!reward.key || seen.has(reward.key)) return false;
        seen.add(reward.key);
        return true;
      })
      .slice(0, 4)
      .map((reward) => ({
        key: reward.key,
        icon: reward.iconEmoji || fallbackRewardPreview(reward.key).icon,
        label: reward.name || fallbackRewardPreview(reward.key).label,
        type: normalizeRewardType(reward.key, reward.type),
      }));
  }

  if (serverKeys.length > 0) return [];

  const keys = parseUiJsonRewardKeys(source.uiJson);
  return keys.map(fallbackRewardPreview);
}
