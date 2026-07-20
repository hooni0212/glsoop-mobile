import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { buildAuthRoute } from "@/lib/authRedirect";
import { navigateFromAppRoot } from "@/navigation/rootNavigation";
import { useToast } from "@/feedback/ToastProvider";
import { refreshMyCosmetics, useMyCosmetics } from "@/features/cosmetics/useMyCosmetics";
import { type MeResponse } from "@/features/me/accountCenter";
import { apiGet } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { updateProfileCosmetics } from "@/services/cosmeticsService";
import {
  normalizeMeProfilePhoto,
  type ProfilePhoto,
} from "@/services/profilePhotoService";
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
  if (slot === "tl") return "왼쪽 위";
  if (slot === "tr") return "오른쪽 위";
  return "오른쪽 아래";
}

function slotHint(slot: CosmeticStickerSlot) {
  if (slot === "tl") return "프로필 카드의 첫인상 옆에 놓여요.";
  if (slot === "tr") return "카드 오른쪽 위에 작은 장식처럼 보여요.";
  return "카드 오른쪽 아래에 조용히 남겨져요.";
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

function toMetaText(item: CosmeticItem | null, keys: string[]) {
  if (!item?.meta) return "";
  for (const key of keys) {
    const value = item.meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function rarityLabel(rarity: string | null | undefined) {
  if (rarity === "epic") return "희귀한 보상";
  if (rarity === "rare") return "특별 보상";
  return "기본 보상";
}

function seasonLabel(season: string | null | undefined) {
  if (!season) return "";
  return season.replace(/_/g, " ");
}

function badgeDetail(item: CosmeticItem | null, fallback = "보유 중") {
  if (!item) return fallback;
  const metaText = toMetaText(item, ["description", "condition", "unlock_hint", "requirement"]);
  if (metaText) return metaText;

  const key = item.key;
  if (key.includes("first_post")) return "첫 글을 남기면 얻는 흔적";
  if (key.includes("posts_10")) return "열 편의 글을 쌓아 얻는 배지";
  if (key.includes("posts_50")) return "꾸준히 쓴 작가에게 주어져요";
  if (key.includes("first_like")) return "첫 좋아요를 받으면 열려요";
  if (key.includes("loved")) return "많은 좋아요를 받은 글의 기록";
  if (key.includes("streak_30")) return "긴 글쓰기 리듬을 지킨 보상";
  if (key.includes("streak_7")) return "일주일의 발걸음을 남긴 배지";
  if (key.includes("streak_3")) return "짧은 리듬을 시작한 기록";

  const season = seasonLabel(item.season);
  return season ? `${season} 시즌` : rarityLabel(item.rarity);
}

function backgroundDetail(item: CosmeticItem) {
  const metaText = toMetaText(item, ["description", "mood", "unlock_hint"]);
  if (metaText) return metaText;
  if (item.key.includes("writer_grove")) return "연한 숲빛으로 차분하게";
  if (item.key.includes("deep_forest")) return "깊은 초록 리듬의 카드";
  if (item.key.includes("prompt_letters")) return "따뜻한 편지지의 온도";
  return "가장 기본이 되는 종이 질감";
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
  const params = useLocalSearchParams<{ source?: string }>();
  const { showToast } = useToast();
  const { inventory, profile, loading, loaded, error, refetch } = useMyCosmetics();

  const [selection, setSelection] = React.useState<ProfileCosmeticsState>(
    createEmptyProfileCosmeticsState
  );
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [profilePhoto, setProfilePhoto] = React.useState<ProfilePhoto | null>(null);
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    let mounted = true;
    apiGet<MeResponse>("/api/me")
      .then((response) => {
        if (mounted) setProfilePhoto(normalizeMeProfilePhoto(response));
      })
      .catch(() => {
        if (mounted) setProfilePhoto(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!loaded || loading || hydratedRef.current) return;
    setSelection(normalizeProfileCosmeticsState(profile));
    hydratedRef.current = true;
  }, [loaded, loading, profile]);

  const slotSelection = React.useMemo(() => buildSlotSelection(selection), [selection]);
  const openedFromGrowthReward = params.source === "growth-reward";
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
      await navigateFromAppRoot("/me");
    } catch (err) {
      const normalized = normalizeApiError(err);
      if (normalized.kind === "auth") {
        showToast("로그인이 필요해요", { tone: "error" });
        await navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname));
        return;
      }

      showToast(normalized.description || normalized.title || "저장에 실패했어요.", {
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [pathname, selection, showToast]);

  const handlePressBack = React.useCallback(() => {
    if (!dirty || saving) {
      router.back();
      return;
    }

    Alert.alert(
      "변경사항이 저장되지 않았어요",
      "지금 나가면 방금 고른 프로필 꾸미기가 사라져요.",
      [
        { text: "계속 꾸미기", style: "cancel" },
        { text: "나가기", style: "destructive", onPress: () => router.back() },
      ]
    );
  }, [dirty, saving]);

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
              onPress: () => void navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname)),
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
      <ProfileCustomizeTopBar onPressBack={handlePressBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        testID="profile-customize-scroll"
      >
        {error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              일부 데이터를 새로고침하지 못했어요. 저장은 계속할 수 있어요.
            </Text>
          </View>
        ) : null}

        {openedFromGrowthReward ? (
          <View style={styles.rewardNotice} testID="profile-growth-reward-notice">
            <View style={styles.rewardNoticeIcon}>
              <Text style={styles.rewardNoticeIconText}>✓</Text>
            </View>
            <View style={styles.rewardNoticeCopy}>
              <Text style={styles.rewardNoticeTitle}>새 보상을 프로필에 적용해보세요</Text>
              <Text style={styles.rewardNoticeText}>
                방금 받은 배지와 스티커가 보유 목록에 반영됐어요.
              </Text>
            </View>
          </View>
        ) : null}

        <ProfilePreview
          background={selectedBackground}
          primaryBadge={selectedPrimaryBadge}
          showcaseBadges={selectedShowcaseBadges}
          stickers={selection.header_stickers}
          stickerInventory={inventory.stickers}
          profilePhoto={profilePhoto}
        />

        <Pressable
          onPress={() => router.push("/account-center/profile")}
          style={({ pressed }) => [
            styles.profilePhotoShortcut,
            pressed && styles.choiceChipPressed,
          ]}
          testID="profile-photo-settings-link"
        >
          <View style={styles.profilePhotoShortcutIcon}>
            <Ionicons name="camera-outline" size={18} color={tokens.colors.green900} />
          </View>
          <View style={styles.profilePhotoShortcutCopy}>
            <Text style={styles.profilePhotoShortcutTitle}>프로필 사진 변경</Text>
            <Text style={styles.profilePhotoShortcutText}>
              사진 선택과 삭제는 공개 프로필 편집에서 할 수 있어요.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
        </Pressable>

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
          <Text style={styles.sectionHint}>닉네임 옆에 가장 먼저 보여줄 나의 흔적을 골라요.</Text>

          {inventory.badges.length === 0 ? (
            <Text style={styles.emptyText}>보유한 뱃지가 아직 없어요.</Text>
          ) : (
            <View style={styles.cardGrid}>
              <BadgeOptionCard
                label="없음"
                emoji="—"
                detail="대표 배지를 비워둘게요"
                selected={selection.primary_badge_key === null}
                onPress={() => pickPrimaryBadge(null)}
                testID="profile-primary-none"
              />
              {inventory.badges.map((item) => (
                <BadgeOptionCard
                  key={item.key}
                  label={item.name}
                  emoji={toEmoji(item.icon_emoji, "🏷️")}
                  detail={badgeDetail(item)}
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
                  detail={badgeDetail(item)}
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
          <Text style={styles.sectionHint}>프로필 카드 모서리에 은은한 표시를 남겨요.</Text>

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
                      <View style={styles.slotTitleBlock}>
                        <Text style={styles.slotTitle}>{slotLabel(slot)}</Text>
                        <Text style={styles.slotSelectedText} numberOfLines={2}>
                          {selectedSticker?.name ?? "스티커 없음"} · {slotHint(slot)}
                        </Text>
                      </View>
                      <StickerSlotMiniMap slot={slot} sticker={selectedSticker} />
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
      </ScrollView>

      <View style={styles.saveDock}>
        <View style={styles.saveDockCopy}>
          <Text style={styles.saveDockTitle}>
            {saving ? "저장 중이에요" : dirty ? "변경사항이 있어요" : "저장됨"}
          </Text>
          <Text style={styles.saveDockHint}>
            {dirty ? "저장하면 작가 프로필에 바로 반영돼요." : "프로필 카드가 최신 상태예요."}
          </Text>
        </View>
        <Pressable
          onPress={saveProfileCosmetics}
          disabled={saving || loading || !dirty}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || loading || !dirty }}
          style={({ pressed }) => [
            styles.saveButton,
            (saving || loading || !dirty) && styles.saveButtonDisabled,
            pressed && !(saving || loading || !dirty) && styles.saveButtonPressed,
          ]}
          testID="profile-cosmetics-save-btn"
        >
          <Text style={styles.saveButtonText}>
            {saving ? "저장 중..." : dirty ? "변경사항 저장" : "저장됨"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ProfileCustomizeTopBar({ onPressBack }: { onPressBack?: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onPressBack ?? (() => router.back())}
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
  profilePhoto,
}: {
  background: CosmeticItem | null;
  primaryBadge: CosmeticItem | null;
  showcaseBadges: CosmeticItem[];
  stickers: ProfileCosmeticsState["header_stickers"];
  stickerInventory: CosmeticItem[];
  profilePhoto: ProfilePhoto | null;
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
  const profilePhotoUrl = profilePhoto?.thumbnail_url || profilePhoto?.url || null;

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
          {profilePhotoUrl ? (
            <Image
              source={{ uri: profilePhotoUrl }}
              style={styles.previewAvatarImage}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.previewAvatarText}>글</Text>
          )}
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
            <View
              key={badge.key}
              style={styles.previewShowcaseChip}
              accessibilityLabel={`표시 뱃지 ${badge.name}`}
            >
              <Text style={styles.previewShowcaseText}>{toEmoji(badge.icon_emoji, "🏅")}</Text>
            </View>
          ))}
          {remainingBadgeCount > 0 ? (
            <View style={styles.previewShowcaseChip}>
              <Text style={styles.previewShowcaseText}>+{remainingBadgeCount}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
      <Text style={styles.optionCardDetail} numberOfLines={2}>
        {backgroundDetail(item)}
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
  detail,
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  tone?: ReturnType<typeof badgeTone>;
  detail?: string;
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
      {detail ? (
        <Text style={styles.optionCardDetail} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

function StickerSlotMiniMap({
  slot,
  sticker,
}: {
  slot: CosmeticStickerSlot;
  sticker: CosmeticItem | undefined;
}) {
  return (
    <View style={styles.slotMiniMap} pointerEvents="none">
      <View style={styles.slotMiniMapLine} />
      {COSMETIC_STICKER_SLOTS.map((candidate) => {
        const active = candidate === slot;
        return (
          <View
            key={candidate}
            style={[
              styles.slotMiniDot,
              getSlotMiniDotAnchor(candidate),
              active && styles.slotMiniDotActive,
            ]}
          >
            {active && sticker ? (
              <Text style={styles.slotMiniDotText}>{toEmoji(sticker.icon_emoji, "✨")}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function getSlotMiniDotAnchor(slot: CosmeticStickerSlot) {
  if (slot === "tl") return styles.slotMiniDotTL;
  if (slot === "tr") return styles.slotMiniDotTR;
  return styles.slotMiniDotBR;
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
  scroll: {
    flex: 1,
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
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  rewardNotice: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C9DDC8",
    backgroundColor: PROFILE_UI_COLORS.greenSoft,
    padding: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  rewardNoticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PROFILE_UI_COLORS.green,
  },
  rewardNoticeIconText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  rewardNoticeCopy: {
    flex: 1,
    gap: 2,
  },
  rewardNoticeTitle: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: PROFILE_UI_COLORS.ink,
  },
  rewardNoticeText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: PROFILE_UI_COLORS.muted,
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
  profilePhotoShortcut: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  profilePhotoShortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  profilePhotoShortcutCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profilePhotoShortcutTitle: {
    ...NON_SELECTABLE_TEXT,
    color: tokens.colors.text,
    fontSize: tokens.font.body,
    fontWeight: "900",
  },
  profilePhotoShortcutText: {
    ...NON_SELECTABLE_TEXT,
    color: tokens.colors.textMuted,
    fontSize: tokens.font.small,
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
    overflow: "hidden",
  },
  previewAvatarImage: {
    width: "100%",
    height: "100%",
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
    minWidth: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  previewShowcaseText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
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
    minHeight: 142,
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
  optionCardDetail: {
    ...NON_SELECTABLE_TEXT,
    minHeight: 34,
    fontSize: 11,
    lineHeight: 16,
    color: PROFILE_UI_COLORS.muted,
    fontWeight: "700",
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
  slotTitleBlock: {
    flex: 1,
    gap: 3,
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
    lineHeight: 18,
  },
  slotMiniMap: {
    width: 78,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PROFILE_UI_COLORS.border,
    backgroundColor: "rgba(255,255,255,0.72)",
    position: "relative",
    overflow: "hidden",
  },
  slotMiniMapLine: {
    position: "absolute",
    left: 12,
    right: 16,
    top: 31,
    height: 1,
    backgroundColor: "#E7D8C6",
  },
  slotMiniDot: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D9CEBE",
    backgroundColor: "#F8F3E9",
    alignItems: "center",
    justifyContent: "center",
  },
  slotMiniDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderColor: PROFILE_UI_COLORS.green,
    backgroundColor: "#EAF4EC",
  },
  slotMiniDotTL: {
    top: 8,
    left: 8,
  },
  slotMiniDotTR: {
    top: 8,
    right: 8,
  },
  slotMiniDotBR: {
    right: 8,
    bottom: 8,
  },
  slotMiniDotText: {
    ...NON_SELECTABLE_TEXT,
    fontSize: 13,
    lineHeight: 15,
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
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.green900,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 118,
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
  saveDock: {
    borderTopWidth: 1,
    borderTopColor: PROFILE_UI_COLORS.border,
    backgroundColor: "#FFFCF6",
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
  },
  saveDockCopy: {
    flex: 1,
    gap: 2,
  },
  saveDockTitle: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: PROFILE_UI_COLORS.ink,
  },
  saveDockHint: {
    ...NON_SELECTABLE_TEXT,
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: PROFILE_UI_COLORS.muted,
    lineHeight: 17,
  },
});
