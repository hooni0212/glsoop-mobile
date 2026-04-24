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
  const { inventory, profile, loading, error, refetch } = useMyCosmetics();

  const [selection, setSelection] = React.useState<ProfileCosmeticsState>(
    createEmptyProfileCosmeticsState
  );
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || hydratedRef.current) return;
    setSelection(normalizeProfileCosmeticsState(profile));
    hydratedRef.current = true;
  }, [loading, profile]);

  const slotSelection = React.useMemo(() => buildSlotSelection(selection), [selection]);
  const hasInventory = inventory.badges.length > 0 || inventory.stickers.length > 0;

  const pickPrimaryBadge = React.useCallback((key: string | null) => {
    setDirty(true);
    setSelection((prev) =>
      normalizeProfileCosmeticsState({
        ...prev,
        primary_badge_key: key,
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
        router.replace(buildAuthRoute("/(auth)", pathname));
        return;
      }

      showToast(normalized.description || normalized.title || "저장에 실패했어요.", {
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [pathname, selection, showToast]);

  const showInitialLoading = loading && !hydratedRef.current;

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
              onPress: () => router.replace(buildAuthRoute("/(auth)", pathname)),
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>대표 뱃지</Text>
          <Text style={styles.sectionHint}>닉네임 옆에 표시돼요.</Text>

          {inventory.badges.length === 0 ? (
            <Text style={styles.emptyText}>보유한 뱃지가 아직 없어요.</Text>
          ) : (
            <View style={styles.optionWrap}>
              <ChoiceChip
                label="없음"
                emoji="—"
                selected={selection.primary_badge_key === null}
                onPress={() => pickPrimaryBadge(null)}
                testID="profile-primary-none"
              />
              {inventory.badges.map((item) => (
                <CosmeticChip
                  key={item.key}
                  item={item}
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
            쇼케이스 뱃지 {selection.showcase_badge_keys.length}/{MAX_SHOWCASE_BADGES}
          </Text>
          <Text style={styles.sectionHint}>작가 카드에 최대 6개까지 보여요.</Text>

          {inventory.badges.length === 0 ? (
            <Text style={styles.emptyText}>쇼케이스에 올릴 뱃지가 없어요.</Text>
          ) : (
            <View style={styles.optionWrap}>
              {inventory.badges.map((item) => (
                <CosmeticChip
                  key={`showcase-${item.key}`}
                  item={item}
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
              {COSMETIC_STICKER_SLOTS.map((slot) => (
                <View key={slot} style={styles.slotCard}>
                  <Text style={styles.slotTitle}>{slotLabel(slot)}</Text>
                  <View style={styles.optionWrap}>
                    <ChoiceChip
                      label="없음"
                      emoji="—"
                      selected={!slotSelection.get(slot)}
                      onPress={() => pickStickerForSlot(slot, null)}
                      testID={`profile-sticker-${slot}-none`}
                    />
                    {inventory.stickers.map((item) => (
                      <CosmeticChip
                        key={`${slot}-${item.key}`}
                        item={item}
                        selected={slotSelection.get(slot) === item.key}
                        onPress={() => pickStickerForSlot(slot, item.key)}
                        testID={`profile-sticker-${slot}-${item.key}`}
                      />
                    ))}
                  </View>
                </View>
              ))}
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

function CosmeticChip({
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
  return (
    <ChoiceChip
      emoji={toEmoji(item.icon_emoji, "🏷️")}
      label={item.name}
      selected={selected}
      onPress={onPress}
      testID={testID}
    />
  );
}

function ChoiceChip({
  emoji,
  label,
  selected,
  onPress,
  testID,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        pressed && styles.choiceChipPressed,
      ]}
      testID={testID}
    >
      <Text style={styles.choiceEmoji}>{emoji}</Text>
      <Text
        style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}
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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.md as any,
  },
  notice: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
  },
  noticeText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  section: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionHint: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  slotList: {
    gap: tokens.space.sm as any,
  },
  slotCard: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
    padding: tokens.space.sm,
    gap: tokens.space.xs as any,
  },
  slotTitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "800",
  },
  choiceChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  choiceChipSelected: {
    backgroundColor: tokens.colors.green050,
    borderColor: tokens.colors.green700,
  },
  choiceChipPressed: {
    opacity: 0.78,
  },
  choiceEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  choiceLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  choiceLabelSelected: {
    color: tokens.colors.green900,
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
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
});
