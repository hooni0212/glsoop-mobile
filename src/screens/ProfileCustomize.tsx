import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useToast } from "@/feedback/ToastProvider";
import { refreshMyCosmetics, useMyCosmetics } from "@/features/cosmetics/useMyCosmetics";
import { normalizeApiError } from "@/lib/errors";
import { updateProfileCosmetics } from "@/services/cosmeticsService";
import { tokens } from "@/theme/tokens";
import {
  COSMETIC_STICKER_SLOTS,
  MAX_SHOWCASE_BADGES,
  createEmptyProfileCosmeticsState,
  normalizeProfileCosmeticsState,
  type CosmeticItem,
  type CosmeticStickerSlot,
  type ProfileCosmeticsState,
} from "@/types/cosmetics";

const PROFILE_UI_COLORS = {
  paper: "#FAF8F1",
  ink: "#222222",
  muted: "#77736A",
  border: "#E6E0D5",
  green: "#3F7A4C",
  greenSoft: "#EAF4EC",
  warmSoft: "#FFF8E9",
  blueSoft: "#EEF5FB",
};

const NON_SELECTABLE_TEXT = {
  userSelect: "none",
} as const;

function toEmoji(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function slotLabel(slot: CosmeticStickerSlot) {
  if (slot === "tl") return "좌상단";
  if (slot === "tr") return "우상단";
  return "우하단";
}

function backgroundTone(key: string | null | undefined) {
  if (key === "background_writer_grove") {
    return {
      backgroundColor: "#EAF5EE",
      borderColor: "#9EC9AD",
      accentColor: tokens.colors.green700,
      surfaceColor: "#DCEFE4",
      lineColor: "#A7CDB4",
    };
  }
  if (key === "background_deep_forest") {
    return {
      backgroundColor: "#DCEFE5",
      borderColor: "#7DAE91",
      accentColor: tokens.colors.green900,
      surfaceColor: "#C7E1D2",
      lineColor: "#7DAE91",
    };
  }
  if (key === "background_prompt_letters") {
    return {
      backgroundColor: "#FFF1E8",
      borderColor: "#E6BDA6",
      accentColor: "#8A4B2A",
      surfaceColor: "#FFE3D1",
      lineColor: "#D49A7C",
    };
  }
  return {
    backgroundColor: PROFILE_UI_COLORS.paper,
    borderColor: PROFILE_UI_COLORS.border,
    accentColor: tokens.colors.green700,
    surfaceColor: "#F2ECDF",
    lineColor: "#D9CEBE",
  };
}

function badgeTone(item: CosmeticItem | null) {
  const key = item?.key ?? "";
  const rarity = item?.rarity ?? "";

  if (key.includes("like") || key.includes("loved")) {
    return {
      backgroundColor: PROFILE_UI_COLORS.blueSoft,
      borderColor: "#C9DDEB",
      accentColor: "#326A8F",
    };
  }
  if (key.includes("streak") || key.includes("posts") || key.includes("post")) {
    return {
      backgroundColor: PROFILE_UI_COLORS.greenSoft,
      borderColor: "#C9DDC8",
      accentColor: PROFILE_UI_COLORS.green,
    };
  }
  if (rarity === "rare" || rarity === "epic") {
    return {
      backgroundColor: "#FFF6DB",
      borderColor: "#E7D69A",
      accentColor: "#8A6A20",
    };
  }
  return {
    backgroundColor: PROFILE_UI_COLORS.warmSoft,
    borderColor: PROFILE_UI_COLORS.border,
    accentColor: PROFILE_UI_COLORS.green,
  };
}

function buildSlotSelection(state: ProfileCosmeticsState) {
  const map = new Map<CosmeticStickerSlot, string>();
  for (const entry of state.header_stickers) {
    map.set(entry.slot, entry.key);
  }
  return map;
}

export default function ProfileCustomizeScreen() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const { inventory, profile, loading, loaded, error, refetch } = useMyCosmetics();

  const [selection, setSelection] = React.useState<ProfileCosmeticsState>(
    createEmptyProfileCosmeticsState
  );
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (!loaded || loading || hydratedRef.current) return;
    setSelection(normalizeProfileCosmeticsState(profile));
    hydratedRef.current = true;
  }, [loaded, loading, profile]);

  const slotSelection = React.useMemo(() => buildSlotSelection(selection), [selection]);
  const hasInventory =
    inventory.badges.length > 0 ||
    inventory.stickers.length > 0 ||
    inventory.backgrounds.length > 0;

  const selectedBackground = React.useMemo(
    () =>
      inventory.backgrounds.find((item) => item.key === selection.profile_background_key) ??
      null,
    [inventory.backgrounds, selection.profile_background_key]
  );
  const selectedPrimaryBadge = React.useMemo(
    () => inventory.badges.find((item) => item.key === selection.primary_badge_key) ?? null,
    [inventory.badges, selection.primary_badge_key]
  );
  const selectedShowcaseBadges = React.useMemo(
    () =>
      selection.showcase_badge_keys
        .map((key) => inventory.badges.find((item) => item.key === key))
        .filter(Boolean) as CosmeticItem[],
    [inventory.badges, selection.showcase_badge_keys]
  );

  const pickPrimaryBadge = React.useCallback((key: string | null) => {
    setDirty(true);
    setSelection((prev) =>
      normalizeProfileCosmeticsState({
        ...prev,
        primary_badge_key: key,
      })
    );
  }, []);

  const pickBackground = React.useCallback((key: string | null) => {
    setDirty(true);
    setSelection((prev) =>
      normalizeProfileCosmeticsState({
        ...prev,
        profile_background_key: key,
      })
    );
  }, []);

  const toggleShowcaseBadge = React.useCallback(
    (key: string) => {
      if (!key) return;

      const isSelected = selection.showcase_badge_keys.includes(key);
      if (!isSelected && selection.showcase_badge_keys.length >= MAX_SHOWCASE_BADGES) {
        showToast(`쇼케이스는 최대 ${MAX_SHOWCASE_BADGES}개까지 선택할 수 있어요.`, {
          tone: "error",
        });
        return;
      }

      setDirty(true);
      setSelection((prev) => {
        const nextShowcase = prev.showcase_badge_keys.includes(key)
          ? prev.showcase_badge_keys.filter((item) => item !== key)
          : [...prev.showcase_badge_keys, key];

        return normalizeProfileCosmeticsState({
          ...prev,
          showcase_badge_keys: nextShowcase,
        });
      });
    },
    [selection.showcase_badge_keys, showToast]
  );

  const pickStickerForSlot = React.useCallback(
    (slot: CosmeticStickerSlot, key: string | null) => {
      setDirty(true);
      setSelection((prev) => {
        const next = prev.header_stickers.filter((entry) => entry.slot !== slot);
        if (key) next.push({ slot, key });

        return normalizeProfileCosmeticsState({
          ...prev,
          header_stickers: next,
        });
      });
    },
    []
  );

  const saveProfileCosmetics = React.useCallback(async () => {
    const payload = normalizeProfileCosmeticsState(selection);
    setSelection(payload);
    setSaving(true);

    try {
      await updateProfileCosmetics(payload);
      setDirty(false);
      showToast("저장했어요", { tone: "success" });
      await refreshMyCosmetics(true);
    } catch (err) {
      const normalized = normalizeApiError(err);
      if (normalized.kind === "auth") {
        showToast("로그인이 필요해요", { tone: "error" });
        router.replace(buildAuthRoute("/(auth)/login", pathname));
        return;
      }

      showToast(normalized.description || normalized.title || "저장에 실패했어요.", {
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [pathname, selection, showToast]);

  const showInitialLoading = !loaded || (loading && !hydratedRef.current);

  if (showInitialLoading) {
    return (
      <SafeAreaView style={styles.safe} testID="profile-customize-screen">
        <ProfileCustomizeTopBar />
        <View style={styles.center}>
          <AppLoading message="코스메틱 정보를 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe} testID="profile-customize-screen">
        <ProfileCustomizeTopBar />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="프로필 꾸미기는 로그인 후 이용할 수 있어요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.replace(buildAuthRoute("/(auth)/login", pathname)),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !hasInventory) {
    return (
      <SafeAreaView style={styles.safe} testID="profile-customize-screen">
        <ProfileCustomizeTopBar />
        <View style={styles.center}>
          <AppError error={error} onRetry={refetch} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} testID="profile-customize-screen">
      <ProfileCustomizeTopBar />

      <ScrollView
        contentContainerStyle={styles.content}
        testID="profile-customize-scroll"
      >
        {error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              일부 데이터를 새로고침하지 못했어요. 저장은 계속할 수 있어요.
            </Text>
          </View>
        ) : null}

        <ProfilePreview
          background={selectedBackground}
          primaryBadge={selectedPrimaryBadge}
          showcaseBadges={selectedShowcaseBadges}
          stickers={selection.header_stickers}
          stickerInventory={inventory.stickers}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 분위기</Text>
          <Text style={styles.sectionHint}>프로필 카드에 담길 분위기를 골라요.</Text>

          {inventory.backgrounds.length === 0 ? (
            <Text style={styles.emptyText}>사용할 수 있는 배경이 아직 없어요.</Text>
          ) : (
            <View style={styles.cardGrid}>
              {inventory.backgrounds.map((item) => (
                <BackgroundOptionCard
                  key={item.key}
                  item={item}
                  selected={selection.profile_background_key === item.key}
                  onPress={() => pickBackground(item.key)}
                  testID={`profile-background-${item.key}`}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>대표 뱃지</Text>
          <Text style={styles.sectionHint}>프로필에 가장 먼저 보여줄 나의 흔적을 골라요.</Text>

          {inventory.badges.length === 0 ? (
            <Text style={styles.emptyText}>보유한 뱃지가 아직 없어요.</Text>
          ) : (
            <View style={styles.cardGrid}>
              <BadgeOptionCard
                label="없음"
                emoji="—"
                selected={selection.primary_badge_key === null}
                onPress={() => pickPrimaryBadge(null)}
                testID="profile-primary-none"
              />
              {inventory.badges.map((item) => (
                <BadgeOptionCard
                  key={item.key}
                  label={item.name}
                  emoji={toEmoji(item.icon_emoji, "🏷️")}
                  tone={badgeTone(item)}
                  selected={selection.primary_badge_key === item.key}
                  onPress={() => pickPrimaryBadge(item.key)}
                  testID={`profile-primary-${item.key}`}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            표시 배지 {selection.showcase_badge_keys.length}/{MAX_SHOWCASE_BADGES}
          </Text>
          <Text style={styles.sectionHint}>다른 사람에게 보여줄 배지를 선택해요.</Text>

          {inventory.badges.length === 0 ? (
            <Text style={styles.emptyText}>표시할 뱃지가 없어요.</Text>
          ) : (
            <View style={styles.cardGrid}>
              {inventory.badges.map((item) => (
                <BadgeOptionCard
                  key={`showcase-${item.key}`}
                  label={item.name}
                  emoji={toEmoji(item.icon_emoji, "🏷️")}
                  tone={badgeTone(item)}
                  selected={selection.showcase_badge_keys.includes(item.key)}
                  onPress={() => toggleShowcaseBadge(item.key)}
                  testID={`profile-showcase-${item.key}`}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>헤더 스티커</Text>
          <Text style={styles.sectionHint}>세 슬롯을 각각 고를 수 있어요.</Text>

          {inventory.stickers.length === 0 ? (
            <Text style={styles.emptyText}>보유한 스티커가 아직 없어요.</Text>
          ) : (
            <View style={styles.slotList}>
              {COSMETIC_STICKER_SLOTS.map((slot) => {
                const selectedKey = slotSelection.get(slot);
                const selectedSticker = inventory.stickers.find(
                  (item) => item.key === selectedKey
                );

                return (
                  <View key={slot} style={styles.slotCard}>
                    <View style={styles.slotHeaderRow}>
                      <Text style={styles.slotTitle}>{slotLabel(slot)}</Text>
                      <Text style={styles.slotSelectedText} numberOfLines={1}>
                        {selectedSticker?.name ?? "비워둘게요"}
                      </Text>
                    </View>
                    <View style={styles.stickerGrid}>
                      <StickerOptionCard
                        label="없음"
                        emoji="—"
                        selected={!selectedKey}
                        onPress={() => pickStickerForSlot(slot, null)}
                        testID={`profile-sticker-${slot}-none`}
                      />
                      {inventory.stickers.map((item) => (
                        <StickerOptionCard
                          key={`${slot}-${item.key}`}
                          label={item.name}
                          emoji={toEmoji(item.icon_emoji, "🏷️")}
                          selected={selectedKey === item.key}
                          onPress={() => pickStickerForSlot(slot, item.key)}
                          testID={`profile-sticker-${slot}-${item.key}`}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          onPress={saveProfileCosmetics}
          disabled={saving || loading || !dirty}
          style={({ pressed }) => [
            styles.saveButton,
            (saving || loading || !dirty) && styles.saveButtonDisabled,
            pressed && !(saving || loading || !dirty) && styles.saveButtonPressed,
          ]}
          testID="profile-cosmetics-save-btn"
        >
          <Text style={styles.saveButtonText}>
            {saving ? "저장 중..." : "저장"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileCustomizeTopBar() {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.backBtn}
        testID="profile-customize-back-btn"
      >
        <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topBarTitle}>프로필 꾸미기</Text>
      <View style={styles.topBarSpacer} />
    </View>
  );
}

function ProfilePreview({
  background,
  primaryBadge,
  showcaseBadges,
  stickers,
  stickerInventory,
}: {
  background: CosmeticItem | null;
  primaryBadge: CosmeticItem | null;
  showcaseBadges: CosmeticItem[];
  stickers: ProfileCosmeticsState["header_stickers"];
  stickerInventory: CosmeticItem[];
}) {
  const tone = backgroundTone(background?.key);
  const stickerByKey = React.useMemo(
    () => new Map(stickerInventory.map((item) => [item.key, item])),
    [stickerInventory]
  );
  const hasTopLeftSticker = stickers.some(
    (entry) => entry.slot === "tl" && stickerByKey.has(entry.key)
  );
  const previewBadges = showcaseBadges.slice(0, 3);
  const remainingBadgeCount = Math.max(0, showcaseBadges.length - previewBadges.length);

  return (
    <View
      style={[
        styles.previewCard,
        { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
      ]}
      testID="profile-cosmetics-preview"
    >
      <View
        pointerEvents="none"
        style={[styles.previewPaperWash, { backgroundColor: tone.surfaceColor }]}
      />
      <View
        pointerEvents="none"
        style={[styles.previewPaperLine, styles.previewPaperLineTop, { backgroundColor: tone.lineColor }]}
      />
      <View
        pointerEvents="none"
        style={[styles.previewPaperLine, styles.previewPaperLineBottom, { backgroundColor: tone.lineColor }]}
      />

      {stickers.map((entry) => {
        const sticker = stickerByKey.get(entry.key);
        if (!sticker) return null;
        return (
          <View
            key={`${entry.slot}-${entry.key}`}
            pointerEvents="none"
            style={[styles.previewSticker, getPreviewStickerAnchor(entry.slot)]}
          >
            <Text style={styles.previewStickerText}>{toEmoji(sticker.icon_emoji, "✨")}</Text>
          </View>
        );
      })}

      <View style={[styles.previewHeader, hasTopLeftSticker && styles.previewHeaderWithLeftSticker]}>
        <View
          style={[
            styles.previewAvatar,
            { borderColor: tone.borderColor, backgroundColor: "rgba(255,255,255,0.72)" },
          ]}
        >
          <Text style={styles.previewAvatarText}>글</Text>
        </View>

        <View
          style={[
            styles.previewIdentity,
            hasTopLeftSticker && styles.previewNameRowWithLeftSticker,
          ]}
        >
          <Text style={styles.previewKicker}>프로필 미리보기</Text>
          <View style={styles.previewNameRow}>
            <Text style={styles.previewName}>나의 글숲</Text>
            {primaryBadge ? (
              <Text
                accessibilityLabel={`대표 뱃지 ${primaryBadge.name}`}
                style={styles.previewBadge}
              >
                {toEmoji(primaryBadge.icon_emoji, "🏅")}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.previewBio}>업적과 캠페인 보상으로 차곡차곡 가꾼 프로필입니다.</Text>

      {previewBadges.length > 0 ? (
        <View style={styles.previewShowcase}>
          {previewBadges.map((badge) => (
            <View key={badge.key} style={styles.previewShowcaseChip}>
              <Text style={styles.previewShowcaseText}>
                {toEmoji(badge.icon_emoji, "🏅")} {badge.name}
              </Text>
            </View>
          ))}
          {remainingBadgeCount > 0 ? (
            <View style={styles.previewShowcaseChip}>
              <Text style={styles.previewShowcaseText}>+{remainingBadgeCount}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.previewBackgroundLabel, { color: tone.accentColor }]}>
        {background?.name ?? "기본 배경"}
      </Text>
    </View>
  );
}

function getPreviewStickerAnchor(slot: CosmeticStickerSlot) {
  if (slot === "tl") return styles.previewStickerTL;
  if (slot === "tr") return styles.previewStickerTR;
  return styles.previewStickerBR;
}

function BackgroundOptionCard({
  item,
  selected,
  onPress,
  testID,
}: {
  item: CosmeticItem;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const tone = backgroundTone(item.key);
  const emoji = toEmoji(item.icon_emoji, "📜");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${selected ? " 선택됨" : ""}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.backgroundCard,
        selected && styles.optionCardSelected,
        pressed && styles.choiceChipPressed,
      ]}
      testID={testID}
    >
      {selected ? (
        <View style={styles.optionCheck}>
          <Ionicons name="checkmark" size={12} color={tokens.colors.textInverse} />
        </View>
      ) : null}
      <View
        style={[
          styles.backgroundSwatch,
          { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
        ]}
      >
        <View
          style={[
            styles.backgroundSwatchPanel,
            { backgroundColor: tone.surfaceColor, borderColor: tone.borderColor },
          ]}
        />
        <View style={[styles.backgroundSwatchLine, { backgroundColor: tone.lineColor }]} />
        <Text style={styles.backgroundSwatchEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.optionCardTitle, selected && styles.optionCardTitleSelected]} numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
}

function BadgeOptionCard({
  label,
  emoji,
  selected,
  onPress,
  testID,
  tone,
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  tone?: ReturnType<typeof badgeTone>;
}) {
  const cardTone =
    tone ??
    {
      backgroundColor: PROFILE_UI_COLORS.paper,
      borderColor: PROFILE_UI_COLORS.border,
      accentColor: PROFILE_UI_COLORS.green,
    };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${selected ? " 선택됨" : ""}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.badgeCard,
        { backgroundColor: cardTone.backgroundColor, borderColor: cardTone.borderColor },
        selected && styles.optionCardSelected,
        pressed && styles.choiceChipPressed,
      ]}
      testID={testID}
    >
      {selected ? (
        <View style={styles.optionCheck}>
          <Ionicons name="checkmark" size={12} color={tokens.colors.textInverse} />
        </View>
      ) : null}
      <View style={[styles.badgeIconFrame, { borderColor: cardTone.borderColor }]}>
        <Text style={styles.badgeCardEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.optionCardTitle, selected && styles.optionCardTitleSelected]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function StickerOptionCard({
  label,
  emoji,
  selected,
  onPress,
  testID,
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${selected ? " 선택됨" : ""}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.stickerOptionCard,
        selected && styles.stickerOptionCardSelected,
        pressed && styles.choiceChipPressed,
      ]}
      testID={testID}
    >
      {selected ? (
        <View style={styles.stickerOptionCheck}>
          <Ionicons name="checkmark" size={10} color={tokens.colors.textInverse} />
        </View>
      ) : null}
      <Text style={styles.stickerOptionEmoji}>{emoji}</Text>
      <Text
        style={[styles.stickerOptionLabel, selected && styles.stickerOptionLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
    ...NON_SELECTABLE_TEXT,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xl,
  },
  topBar: {
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    ...NON_SELECTABLE_TEXT,
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    ...NON_SELECTABLE_TEXT,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
    paddingBottom: 156,
    gap: tokens.space.lg as any,
  },
  notice: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
  },
  noticeText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  previewCard: {
    ...NON_SELECTABLE_TEXT,
    minHeight: 224,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: tokens.space.md as any,
    position: "relative",
    overflow: "hidden",
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  previewPaperWash: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 112,
    height: 74,
    borderRadius: 18,
    opacity: 0.42,
    transform: [{ rotate: "-5deg" }],
  },
  previewPaperLine: {
    position: "absolute",
    height: 1,
    opacity: 0.32,
  },
  previewPaperLineTop: {
    top: 86,
    left: 24,
    right: 62,
  },
  previewPaperLineBottom: {
    bottom: 38,
    left: 82,
    right: 24,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    paddingRight: 54,
  },
  previewHeaderWithLeftSticker: {
    paddingTop: 18,
  },
  previewAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 21,
    fontWeight: "900",
    color: PROFILE_UI_COLORS.green,
  },
  previewIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  previewKicker: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 12,
    color: PROFILE_UI_COLORS.muted,
    fontWeight: "800",
  },
  previewNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs as any,
  },
  previewNameRowWithLeftSticker: {
    paddingLeft: 4,
  },
  previewName: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 25,
    fontWeight: "900",
    color: PROFILE_UI_COLORS.ink,
    flexShrink: 1,
  },
  previewBadge: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 22,
    lineHeight: 26,
  },
  previewBio: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.body,
    color: PROFILE_UI_COLORS.muted,
    lineHeight: 22,
    paddingRight: 28,
  },
  previewShowcase: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  previewShowcaseChip: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(63,122,76,0.22)",
    backgroundColor: "rgba(255,255,255,0.66)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  previewShowcaseText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
  previewBackgroundLabel: {
    ...NON_SELECTABLE_TEXT,
    alignSelf: "flex-start",
    marginTop: 2,
    fontSize: tokens.font.small,
    fontWeight: "900",
    borderRadius: tokens.radius.pill,
    backgroundColor: "rgba(255,255,255,0.56)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden",
  },
  previewSticker: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  previewStickerTL: {
    top: 13,
    left: 14,
  },
  previewStickerTR: {
    top: 13,
    right: 14,
  },
  previewStickerBR: {
    right: 14,
    bottom: 14,
  },
  previewStickerText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 14,
    lineHeight: 16,
  },
  section: {
    ...NON_SELECTABLE_TEXT,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PROFILE_UI_COLORS.border,
    backgroundColor: "#FFFCF6",
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  sectionTitle: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 17,
    fontWeight: "900",
    color: PROFILE_UI_COLORS.ink,
  },
  sectionHint: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    color: PROFILE_UI_COLORS.muted,
    lineHeight: 18,
  },
  emptyText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  backgroundCard: {
    ...NON_SELECTABLE_TEXT,
    width: "48%",
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PROFILE_UI_COLORS.border,
    backgroundColor: PROFILE_UI_COLORS.paper,
    padding: 10,
    gap: 8,
    position: "relative",
  },
  backgroundSwatch: {
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  backgroundSwatchPanel: {
    position: "absolute",
    top: 12,
    right: 10,
    width: 44,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    opacity: 0.62,
  },
  backgroundSwatchLine: {
    position: "absolute",
    left: 10,
    right: 28,
    bottom: 13,
    height: 1,
    opacity: 0.55,
  },
  backgroundSwatchEmoji: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 21,
    lineHeight: 26,
  },
  badgeCard: {
    ...NON_SELECTABLE_TEXT,
    width: "48%",
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "relative",
  },
  badgeIconFrame: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  badgeCardEmoji: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 24,
    lineHeight: 28,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: PROFILE_UI_COLORS.green,
    backgroundColor: "#EEF7EF",
  },
  optionCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_UI_COLORS.green,
    zIndex: 2,
  },
  optionCardTitle: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    lineHeight: 17,
    color: PROFILE_UI_COLORS.ink,
    fontWeight: "800",
    textAlign: "center",
  },
  optionCardTitleSelected: {
    color: PROFILE_UI_COLORS.green,
  },
  slotList: {
    gap: tokens.space.md as any,
  },
  slotCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PROFILE_UI_COLORS.border,
    backgroundColor: "#FFF8ED",
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  slotHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  slotTitle: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.body,
    color: PROFILE_UI_COLORS.ink,
    fontWeight: "900",
  },
  slotSelectedText: {
    ...NON_SELECTABLE_TEXT,
    flexShrink: 1,
    fontSize: tokens.font.small,
    color: PROFILE_UI_COLORS.muted,
    fontWeight: "800",
  },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stickerOptionCard: {
    ...NON_SELECTABLE_TEXT,
    width: "48%",
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PROFILE_UI_COLORS.border,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    position: "relative",
  },
  stickerOptionCardSelected: {
    borderWidth: 2,
    borderColor: PROFILE_UI_COLORS.green,
    backgroundColor: "#EAF4EC",
  },
  choiceChipPressed: {
    opacity: 0.78,
  },
  stickerOptionCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_UI_COLORS.green,
  },
  stickerOptionEmoji: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 18,
    lineHeight: 22,
  },
  stickerOptionLabel: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    lineHeight: 17,
    color: PROFILE_UI_COLORS.muted,
    fontWeight: "800",
    textAlign: "center",
  },
  stickerOptionLabelSelected: {
    color: PROFILE_UI_COLORS.green,
  },
  saveButton: {
    marginTop: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.green900,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonPressed: {
    opacity: 0.84,
  },
  saveButtonText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
});
