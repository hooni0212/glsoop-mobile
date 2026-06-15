import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import {
  type GrowthAchievement,
  type GrowthCampaign,
  type GrowthSummary,
  useGrowthData,
} from "@/features/growth/useGrowthData";
import { DailyWritingCampaignStepper } from "@/features/writingCampaign/DailyWritingCampaignStepper";
import {
  buildDailyWritingPromptWritePath,
  getDailyWritingCampaignFocusSteps,
  getDailyWritingCampaignStatus,
  type DailyWritingCampaignStatus,
} from "@/features/writingCampaign/dailyWritingCampaign";
import { toTimestampMs } from "@/lib/dateTime";
import { tokens } from "@/theme/tokens";

type AchievementHighlight = {
  id: string;
  title: string;
  progressText: string;
  percent: number;
};

type CampaignPreviewItem = {
  id: number;
  title: string;
  typeLabel: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getXpPercent(summary: GrowthSummary | null) {
  if (!summary || summary.nextLevelXp <= 0) return 0;
  return clampPercent((summary.currentXp / summary.nextLevelXp) * 100);
}

function getRemainingXp(summary: GrowthSummary | null) {
  if (!summary) return 0;
  return Math.max(0, summary.nextLevelXp - summary.currentXp);
}

function formatCampaignType(value: string) {
  if (value === "daily") return "데일리";
  if (value === "weekly") return "위클리";
  if (value === "season") return "시즌";
  if (value === "event") return "이벤트";
  if (value === "permanent") return "상시";
  return "이벤트";
}

function selectAchievementHighlight(achievements: GrowthAchievement[]): AchievementHighlight | null {
  const inProgress = achievements
    .filter((item) => item.status === "in_progress" && item.target > 0 && item.progress > 0)
    .map((item) => ({
      item,
      percent: clampPercent((item.progress / item.target) * 100),
    }))
    .sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return b.item.progress - a.item.progress;
    });

  const picked =
    inProgress[0]?.item ??
    [...achievements]
      .filter((item) => item.status === "completed")
      .sort((a, b) => (toTimestampMs(b.unlockedAt) || 0) - (toTimestampMs(a.unlockedAt) || 0))[0] ??
    null;

  if (!picked || picked.target <= 0) return null;
  return {
    id: String(picked.id),
    title: picked.name,
    progressText: `${Math.min(picked.progress, picked.target)} / ${picked.target}`,
    percent: clampPercent((picked.progress / picked.target) * 100),
  };
}

function selectCampaignPreview(campaigns: GrowthCampaign[]): CampaignPreviewItem | null {
  const [picked] = campaigns
    .filter(
      (campaign) =>
        campaign.quests.length > 0 &&
        (campaign.campaignType === "event" || campaign.campaignType === "season")
    )
    .map((campaign) => ({
      id: campaign.id,
      title: campaign.name,
      typeLabel: formatCampaignType(campaign.campaignType),
      inProgressCount: campaign.quests.filter((quest) => quest.status === "in_progress").length,
      questCount: campaign.quests.length,
    }))
    .sort((a, b) => b.inProgressCount - a.inProgressCount || b.questCount - a.questCount);

  if (!picked) return null;
  return {
    id: picked.id,
    title: picked.title,
    typeLabel: picked.typeLabel,
  };
}

export default function GrowthScreen() {
  const router = useRouter();
  const { summary, achievements, campaigns, loading, error, refetch } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);

  const achievementHighlight = useMemo(
    () => selectAchievementHighlight(achievements),
    [achievements]
  );
  const campaignPreview = useMemo(() => selectCampaignPreview(campaigns), [campaigns]);
  const dailyWritingCampaign = useMemo(() => getDailyWritingCampaignStatus(), []);
  const dailyWritingCampaignSteps = useMemo(
    () => getDailyWritingCampaignFocusSteps(dailyWritingCampaign),
    [dailyWritingCampaign]
  );
  const openDailyWritingPrompt = useCallback(() => {
    trackGrowthTelemetry("growth_action_clicked", { action: "open_daily_writing_prompt" });
    router.push(buildDailyWritingPromptWritePath(dailyWritingCampaign) as never);
  }, [dailyWritingCampaign, router]);

  useEffect(() => {
    trackGrowthTelemetry("growth_screen_viewed", { screen: "home" });
  }, []);

  const onRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    const startedAt = Date.now();
    trackGrowthTelemetry("growth_refresh_started", { screen: "home" });
    setRefreshing(true);
    try {
      await refetch();
      trackGrowthTelemetry("growth_refresh_succeeded", {
        screen: "home",
        durationMs: Date.now() - startedAt,
      });
    } catch (refreshError) {
      trackGrowthTelemetry("growth_refresh_failed", {
        screen: "home",
        durationMs: Date.now() - startedAt,
        error: toGrowthTelemetryError(refreshError),
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loading, refetch]);

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="성장 탭을 보려면 로그인해 주세요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.push("/(auth)"),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} testID="growth-screen">
      <ScrollView
        testID="growth-scroll"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
        <Text style={styles.screenTitle}>성장</Text>

        <ForestCard summary={summary} loading={loading} error={error} />

        <WritingCampaignProjectCard
          status={dailyWritingCampaign}
          steps={dailyWritingCampaignSteps}
          onPress={openDailyWritingPrompt}
        />

        <Pressable
          onPress={() => {
            trackGrowthTelemetry("growth_action_clicked", { action: "open_records" });
            router.push("/growth/records" as never);
          }}
          style={({ pressed }) => [styles.recordButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="성장 기록 보기"
          testID="growth-action-records"
        >
          <Text style={styles.recordButtonText}>기록 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.green700} />
        </Pressable>

        <View style={styles.actionRow}>
          <ActionButton
            title="업적"
            icon="trophy-outline"
            onPress={() => {
              trackGrowthTelemetry("growth_action_clicked", { action: "open_achievements" });
              router.push("/growth/achievements");
            }}
            testID="growth-action-achievements"
          />
          <ActionButton
            title="퀘스트"
            icon="trail-sign-outline"
            onPress={() => {
              trackGrowthTelemetry("growth_action_clicked", { action: "open_quests" });
              router.push("/growth/quests");
            }}
            testID="growth-action-quests"
          />
        </View>

        {achievementHighlight ? (
          <AchievementCard item={achievementHighlight} />
        ) : null}

        <ReflectionCard summary={summary} />

        {campaignPreview ? (
          <CampaignCard item={campaignPreview} onPress={() => router.push("/growth/quests")} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ForestCard({
  summary,
  loading,
  error,
}: {
  summary: GrowthSummary | null;
  loading: boolean;
  error: ReturnType<typeof useGrowthData>["error"];
}) {
  if (loading && !summary) {
    return (
      <View style={styles.forestCard}>
        <AppLoading message="성장 정보를 불러오는 중..." />
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.forestCard}>
        <AppError error={error} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.forestCard}>
        <AppEmpty
          title="아직 성장 데이터가 없어요"
          description="활동이 쌓이면 여기에 표시돼요."
        />
      </View>
    );
  }

  const remainingXp = getRemainingXp(summary);
  const xpPercent = getXpPercent(summary);

  return (
    <View style={styles.forestCard} testID="growth-forest-card">
      <View style={styles.forestHeader}>
        <Text style={styles.forestEyebrow}>나의 숲</Text>
        <Text style={styles.forestTitle}>천천히 자라고 있어요.</Text>
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.levelText}>Lv. {summary.level}</Text>
        <Text style={styles.levelTitle}>{summary.title || "새싹"}</Text>
      </View>

      <View style={styles.progressBlock}>
        <Text style={styles.progressHint}>다음 레벨까지 {remainingXp} XP</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${xpPercent}%` }]} />
        </View>
      </View>

      {error ? (
        <Text style={styles.subtleNotice}>
          일부 데이터가 최신이 아닐 수 있어요. 아래로 당겨 새로고침해 주세요.
        </Text>
      ) : null}
    </View>
  );
}

function ActionButton({
  title,
  icon,
  onPress,
  testID,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title} 보기`}
      testID={testID}
    >
      <Ionicons name={icon} size={17} color={tokens.colors.green700} />
      <Text style={styles.actionButtonText}>{title}</Text>
    </Pressable>
  );
}

function AchievementCard({ item }: { item: AchievementHighlight }) {
  return (
    <View style={styles.sectionCard} testID="growth-achievement-highlight">
      <Text style={styles.sectionLabel}>가까워진 업적</Text>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressSmallText}>{item.progressText}</Text>
          <Text style={styles.progressSmallText}>{item.percent}%</Text>
        </View>
        <View style={styles.progressTrackSoft}>
          <View style={[styles.progressBarSoft, { width: `${item.percent}%` }]} />
        </View>
      </View>
    </View>
  );
}

function ReflectionCard({ summary }: { summary: GrowthSummary | null }) {
  if (!summary) return null;

  const hasWeeklyPosts = summary.weeklyPosts > 0;
  const title = hasWeeklyPosts
    ? `이번 주 ${summary.weeklyPosts}편의 글이 쌓였어요.`
    : "이번 주는 아직 조용해요.";
  const streakText =
    summary.streakDays > 0 ? `${summary.streakDays}일째 이어지는 중` : "오늘부터 다시 시작";
  const remainingXp = getRemainingXp(summary);

  return (
    <View style={styles.reflectionCard} testID="growth-reflection-card">
      <Text style={styles.sectionLabel}>오늘의 숲</Text>
      <Text style={styles.reflectionTitle}>{title}</Text>
      <Text style={styles.reflectionBody}>
        남기고 싶은 문장부터 천천히 적어도 괜찮아요.
      </Text>
      <View style={styles.reflectionMetaRow}>
        <View style={styles.reflectionPill}>
          <Ionicons name="leaf-outline" size={14} color={tokens.colors.green700} />
          <Text style={styles.reflectionPillText}>{streakText}</Text>
        </View>
        <View style={styles.reflectionPill}>
          <Ionicons name="flag-outline" size={14} color={tokens.colors.green700} />
          <Text style={styles.reflectionPillText}>다음까지 {remainingXp} XP</Text>
        </View>
      </View>
    </View>
  );
}

function WritingCampaignProjectCard({
  status,
  steps,
  onPress,
}: {
  status: DailyWritingCampaignStatus;
  steps: ReturnType<typeof getDailyWritingCampaignFocusSteps>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.writingCampaignCard, pressed && styles.pressed]}
      testID="growth-writing-campaign-card"
      accessibilityRole="button"
      accessibilityLabel={`${status.title} 오늘 주제로 글쓰기`}
    >
      <View style={styles.writingCampaignHeader}>
        <View style={styles.writingCampaignHeading}>
          <Text style={styles.sectionLabel}>진행 중인 캠페인</Text>
          <Text style={styles.writingCampaignTitle}>{status.title}</Text>
        </View>
        <View style={styles.writingCampaignBadge}>
          <Text style={styles.writingCampaignBadgeText}>
            {status.prompt.day}/{status.totalDays}
          </Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressSmallText}>프로젝트 진행률</Text>
          <Text style={styles.progressSmallText}>{status.progressPercent}%</Text>
        </View>
        <View style={styles.progressTrackSoft}>
          <View
            style={[
              styles.progressBarSoft,
              status.progressPercent > 0 && styles.progressBarSoftMinimum,
              { width: `${status.progressPercent}%` },
            ]}
          />
        </View>
      </View>

      <DailyWritingCampaignStepper
        steps={steps}
        title={`오늘 ${status.prompt.day}일차 진행 중`}
      />

      <View style={styles.writingPromptPreview}>
        <Text style={styles.writingPromptMeta}>
          오늘의 글감 · {status.prompt.day}일차
        </Text>
        <Text style={styles.writingPromptTitle}>{status.prompt.title}</Text>
        <Text style={styles.writingPromptBody}>{status.prompt.body}</Text>
      </View>

      <View style={styles.writingCampaignFooter}>
        <Text style={styles.writingCampaignHint}>
          남은 주제 {status.remainingDays}개
        </Text>
        <View style={styles.writingCampaignCta}>
          <Text style={styles.writingCampaignCtaText}>이 주제로 쓰기</Text>
          <Ionicons name="chevron-forward" size={15} color={tokens.colors.textInverse} />
        </View>
      </View>
    </Pressable>
  );
}

function CampaignCard({
  item,
  onPress,
}: {
  item: CampaignPreviewItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
      testID="growth-campaign-preview"
      accessibilityRole="button"
      accessibilityLabel={`${item.title} 이벤트 보기`}
    >
      <View style={styles.eventBody}>
        <Text style={styles.sectionLabel}>진행 중인 이벤트</Text>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
      <Text style={styles.eventBadge}>{item.typeLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    paddingBottom: 120,
    gap: tokens.space.md as any,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  screenTitle: {
    fontSize: tokens.font.h1,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  forestCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 26,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  forestHeader: {
    gap: 5,
  },
  forestEyebrow: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  forestTitle: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm as any,
  },
  levelText: {
    fontSize: 24,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  levelTitle: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  progressBlock: {
    gap: tokens.space.xs as any,
  },
  progressHint: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  progressTrack: {
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
  subtleNotice: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    color: tokens.colors.textMuted,
  },
  recordButton: {
    minHeight: 46,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordButtonText: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  actionRow: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonText: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  sectionLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textFaint,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  reflectionCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  reflectionTitle: {
    fontSize: tokens.font.body,
    lineHeight: 24,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  reflectionBody: {
    fontSize: tokens.font.small,
    lineHeight: 19,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  reflectionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
    paddingTop: 2,
  },
  reflectionPill: {
    minHeight: 30,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bgMuted,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reflectionPillText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  writingCampaignCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 1,
  },
  writingCampaignHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  writingCampaignHeading: {
    flex: 1,
    gap: 4,
  },
  writingCampaignTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: tokens.colors.green900,
    letterSpacing: 0,
  },
  writingCampaignBadge: {
    minHeight: 32,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  writingCampaignBadgeText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingPromptPreview: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
    gap: 5,
  },
  writingPromptMeta: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingPromptTitle: {
    fontSize: tokens.font.body,
    lineHeight: 21,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  writingPromptBody: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingCampaignFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  writingCampaignHint: {
    flex: 1,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  writingCampaignCta: {
    minHeight: 38,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
    gap: 4,
  },
  writingCampaignCtaText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  progressSmallText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  progressTrackSoft: {
    height: 7,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    overflow: "hidden",
  },
  progressBarSoft: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green600,
  },
  progressBarSoftMinimum: {
    minWidth: 22,
  },
  eventCard: {
    minHeight: 72,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  eventBody: {
    flex: 1,
    gap: 5,
  },
  eventBadge: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  pressed: {
    opacity: 0.84,
  },
});
