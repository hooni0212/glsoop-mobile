import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { GrowthDetailTopBar } from "@/components/growth/GrowthDetailTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useToast } from "@/feedback/ToastProvider";
import { refreshMyCosmetics } from "@/features/cosmetics/useMyCosmetics";
import type { GrowthAchievement } from "@/features/growth/useGrowthData";
import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { formatKstDateDot, toTimestampMs } from "@/lib/dateTime";
import { tokens } from "@/theme/tokens";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStatusMeta(status: GrowthAchievement["status"]) {
  if (status === "completed") return { label: "완료", color: tokens.colors.green700 };
  if (status === "in_progress") return { label: "진행 중", color: tokens.colors.green900 };
  return { label: "잠금", color: tokens.colors.textMuted };
}

type RewardPreview = {
  key: string;
  icon: string;
  label: string;
  type: "badge" | "background" | "sticker";
};

const REWARD_PRESETS: Record<string, RewardPreview> = {
  badge_first_post: { key: "badge_first_post", icon: "🌱", label: "첫 글 배지", type: "badge" },
  badge_posts_10: { key: "badge_posts_10", icon: "🌿", label: "열 편 배지", type: "badge" },
  badge_posts_50: { key: "badge_posts_50", icon: "🌳", label: "나무 배지", type: "badge" },
  badge_first_like: { key: "badge_first_like", icon: "✨", label: "첫 공감 배지", type: "badge" },
  badge_loved_post: { key: "badge_loved_post", icon: "💙", label: "인기 글 배지", type: "badge" },
  badge_streak_3: { key: "badge_streak_3", icon: "🔥", label: "리듬 배지", type: "badge" },
  badge_streak_7: { key: "badge_streak_7", icon: "🌠", label: "7일 배지", type: "badge" },
  badge_streak_30: { key: "badge_streak_30", icon: "🏆", label: "30일 배지", type: "badge" },
  badge_first_bookmark: { key: "badge_first_bookmark", icon: "📌", label: "북마크 배지", type: "badge" },
  background_writer_grove: {
    key: "background_writer_grove",
    icon: "🌳",
    label: "작가의 작은 숲",
    type: "background",
  },
  background_deep_forest: {
    key: "background_deep_forest",
    icon: "🌲",
    label: "깊은 숲 배경",
    type: "background",
  },
};

function parseRewardPreviews(item: GrowthAchievement): RewardPreview[] {
  if (!item.uiJson) return [];
  try {
    const parsed = JSON.parse(item.uiJson) as { rewards?: { cosmetics?: unknown } };
    if (!Array.isArray(parsed?.rewards?.cosmetics)) return [];
    const keys = Array.from(
      new Set(parsed.rewards.cosmetics.map((value) => String(value || "").trim()).filter(Boolean))
    ).slice(0, 4);
    return keys.map((key) => {
      if (REWARD_PRESETS[key]) return REWARD_PRESETS[key];
      if (key.startsWith("background_")) return { key, icon: "🎨", label: "프로필 배경", type: "background" };
      if (key.startsWith("badge_")) return { key, icon: "🏅", label: "업적 배지", type: "badge" };
      return { key, icon: "✨", label: "스티커", type: "sticker" };
    });
  } catch {
    return [];
  }
}

export default function AchievementsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { achievements, loading, error, refetch, claimQuestReward } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);
  const [claimPendingByStateId, setClaimPendingByStateId] = useState<Record<number, boolean>>({});

  const onRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    const startedAt = Date.now();
    trackGrowthTelemetry("growth_refresh_started", { screen: "achievements" });
    setRefreshing(true);
    try {
      await refetch();
      trackGrowthTelemetry("growth_refresh_succeeded", {
        screen: "achievements",
        durationMs: Date.now() - startedAt,
      });
    } catch (refreshError) {
      trackGrowthTelemetry("growth_refresh_failed", {
        screen: "achievements",
        durationMs: Date.now() - startedAt,
        error: toGrowthTelemetryError(refreshError),
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loading, refetch]);

  useEffect(() => {
    trackGrowthTelemetry("growth_screen_viewed", { screen: "achievements" });
  }, []);

  const sections = useMemo(() => {
    const inProgress = achievements
      .filter((item) => item.status === "in_progress")
      .sort((a, b) => b.progress - a.progress);
    const completed = achievements
      .filter((item) => item.status === "completed")
      .sort((a, b) => {
        const aTime = a.unlockedAt ? toTimestampMs(a.unlockedAt) || 0 : 0;
        const bTime = b.unlockedAt ? toTimestampMs(b.unlockedAt) || 0 : 0;
        return bTime - aTime;
      });
    const locked = achievements
      .filter((item) => item.status === "locked")
      .sort((a, b) => a.positionIndex - b.positionIndex);

    return [
      { key: "in_progress", title: "진행 중", items: inProgress },
      { key: "completed", title: "달성 완료", items: completed },
      { key: "locked", title: "잠긴 업적", items: locked },
    ].filter((section) => section.items.length > 0);
  }, [achievements]);

  const summary = useMemo(() => {
    const completedCount = achievements.filter((item) => item.status === "completed").length;
    const claimableCount = achievements.filter(
      (item) =>
        item.status === "completed" &&
        item.stateId > 0 &&
        !item.rewardClaimedAt &&
        parseRewardPreviews(item).length > 0
    ).length;
    const progressPercent = achievements.length > 0 ? clampPercent((completedCount / achievements.length) * 100) : 0;
    return { completedCount, claimableCount, progressPercent };
  }, [achievements]);

  const handleClaimAchievement = useCallback(
    async (item: GrowthAchievement) => {
      if (!item.stateId || claimPendingByStateId[item.stateId]) return;
      setClaimPendingByStateId((current) => ({ ...current, [item.stateId]: true }));
      try {
        const result = await claimQuestReward(item.stateId);
        await refreshMyCosmetics(true);
        const gainedCount = result.gainedCosmetics.length;
        showToast(gainedCount > 0 ? `보상 ${gainedCount}개를 받았어요.` : "보상을 받았어요.", {
          tone: "success",
        });
      } catch {
        showToast("업적 보상 수령에 실패했어요.", { tone: "error" });
      } finally {
        setClaimPendingByStateId((current) => ({ ...current, [item.stateId]: false }));
      }
    },
    [claimPendingByStateId, claimQuestReward, showToast]
  );

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe} testID="growth-achievements-screen">
        <GrowthDetailTopBar
          title="업적 상세"
          subtitle="로그인이 필요해요"
          onPressBack={() => router.back()}
          backButtonTestID="growth-achievements-back-btn"
        />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="업적 정보를 보려면 로그인해 주세요."
            primaryAction={{ label: "로그인 하러가기", onPress: () => router.push("/(auth)") }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const showLoading = loading && achievements.length === 0;
  const showError = Boolean(error && achievements.length === 0);
  const showEmpty = !showLoading && !showError && achievements.length === 0;

  return (
    <SafeAreaView style={styles.safe} testID="growth-achievements-screen">
      <GrowthDetailTopBar
        title="업적 상세"
        subtitle={`전체 ${achievements.length}개`}
        onPressBack={() => router.back()}
        backButtonTestID="growth-achievements-back-btn"
      />

      <ScrollView
        testID="growth-achievements-scroll"
        contentContainerStyle={[
          styles.content,
          (showLoading || showError || showEmpty) && styles.contentCentered,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.colors.green700}
            colors={[tokens.colors.green700]}
            progressBackgroundColor={tokens.colors.surfaceStrong}
            title={refreshing ? "새로고침 중..." : "아래로 당겨 새로고침"}
            titleColor={tokens.colors.textMuted}
          />
        }
      >
        {showLoading ? <AppLoading message="업적 목록을 불러오는 중..." /> : null}

        {showError ? (
          <AppError
            error={{
              title: error?.title || "업적 정보를 불러오지 못했어요",
              description: error?.description,
            }}
          />
        ) : null}

        {showEmpty ? (
          <AppEmpty
            title="진행 중인 업적이 없어요"
            description="글 작성이나 반응 활동을 시작하면 업적이 자동으로 표시돼요."
          />
        ) : null}

	        {!showLoading && !showError && !showEmpty ? (
	          <>
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  일부 데이터가 최신 상태가 아닐 수 있어요. 화면을 아래로 당겨 갱신해 주세요.
                </Text>
              </View>
	            ) : null}

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>수집 현황</Text>
                <Text style={styles.summaryMeta}>
                  완료 {summary.completedCount}/{achievements.length}개 · 받을 보상 {summary.claimableCount}개
                </Text>
              </View>
              <Text style={styles.summaryPercent}>{summary.progressPercent}%</Text>
            </View>

	            {sections.map((section) => (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.items.length}개</Text>
                </View>
                <View style={styles.list}>
	                  {section.items.map((item) => (
	                    <AchievementCard
	                      key={item.id}
	                      item={item}
	                      claimPending={Boolean(claimPendingByStateId[item.stateId])}
	                      onClaim={handleClaimAchievement}
	                      onCustomize={() => router.push("/profile-customize")}
	                    />
	                  ))}
                </View>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({
  item,
  claimPending,
  onClaim,
  onCustomize,
}: {
  item: GrowthAchievement;
  claimPending: boolean;
  onClaim: (item: GrowthAchievement) => void;
  onCustomize: () => void;
}) {
  const statusMeta = getStatusMeta(item.status);
  const percent = item.target > 0 ? clampPercent((item.progress / item.target) * 100) : 0;
  const unlockedLabel = item.unlockedAt ? `달성일 ${formatKstDateDot(item.unlockedAt)}` : "미달성";
  const rewards = parseRewardPreviews(item);
  const canClaim = item.status === "completed" && item.stateId > 0 && !item.rewardClaimedAt && rewards.length > 0;
  const claimed = item.status === "completed" && Boolean(item.rewardClaimedAt);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{item.icon || "🌿"}</Text>
          <View style={styles.titleBlock}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        </View>
        <Text style={[styles.statusChip, { color: statusMeta.color }]}>{statusMeta.label}</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          진행도 {Math.min(item.progress, item.target)} / {item.target}
        </Text>
        <Text style={styles.progressLabel}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${percent}%` }]} />
      </View>
      {rewards.length > 0 ? (
        <View style={styles.rewardRow} testID={`achievement-rewards-${item.code}`}>
          {rewards.map((reward) => (
            <View
              key={reward.key}
              style={[
                styles.rewardChip,
                reward.type === "background" && styles.rewardChipBackground,
              ]}
              testID={`achievement-reward-${item.code}-${reward.key}`}
            >
              <Text style={styles.rewardText}>
                {reward.icon} {reward.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.dateText}>{unlockedLabel}</Text>
      {canClaim ? (
        <Pressable
          onPress={() => onClaim(item)}
          disabled={claimPending}
          style={({ pressed }) => [
            styles.claimBtn,
            claimPending && styles.claimBtnDisabled,
            pressed && !claimPending && styles.claimBtnPressed,
          ]}
          testID={`achievement-claim-btn-${item.stateId}`}
        >
          <Text style={styles.claimBtnText}>{claimPending ? "받는 중..." : "보상 받기"}</Text>
        </Pressable>
      ) : claimed ? (
        <Pressable
          onPress={onCustomize}
          style={({ pressed }) => [styles.customizeBtn, pressed && styles.claimBtnPressed]}
          testID={`achievement-customize-btn-${item.stateId}`}
        >
          <Text style={styles.customizeBtnText}>프로필에 적용하기</Text>
        </Pressable>
      ) : null}
    </View>
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
    padding: tokens.space.xl,
  },
  content: {
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.lg,
    paddingBottom: 120,
    gap: tokens.space.lg as any,
  },
  contentCentered: {
    flexGrow: 1,
    justifyContent: "center",
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
  summaryCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
  },
  summaryTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  summaryMeta: {
    marginTop: 3,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  summaryPercent: {
    fontSize: 24,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  section: {
    gap: tokens.space.sm as any,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionCount: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "800",
  },
  list: {
    gap: tokens.space.sm as any,
  },
  card: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  cardDesc: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  statusChip: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    backgroundColor: tokens.colors.green050,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
    backgroundColor: tokens.colors.green100,
  },
  progressBar: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
  dateText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
    fontWeight: "700",
  },
  rewardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  rewardChip: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rewardChipBackground: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.green700,
  },
  rewardText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
  claimBtn: {
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green700,
    paddingHorizontal: tokens.space.lg,
  },
  claimBtnDisabled: {
    opacity: 0.55,
  },
  claimBtnPressed: {
    opacity: 0.84,
  },
  claimBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  customizeBtn: {
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: tokens.space.lg,
  },
  customizeBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
});
