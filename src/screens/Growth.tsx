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

import { GrowthChart } from "@/components/growth/GrowthChart";
import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { AppEmpty } from "@/components/state/AppEmpty";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { tokens } from "@/theme/tokens";

type ProgressItem = {
  id: string;
  title: string;
  subtitle: string;
  status: "in_progress" | "completed" | "locked";
};

type CampaignPreviewItem = {
  id: number;
  title: string;
  typeLabel: string;
  questCount: number;
  inProgressCount: number;
  completedCount: number;
};

function getStatusMeta(status: ProgressItem["status"]) {
  if (status === "completed") return { label: "완료", color: tokens.colors.green700 };
  if (status === "in_progress") return { label: "진행 중", color: tokens.colors.green900 };
  return { label: "잠금", color: tokens.colors.textMuted };
}

function formatCampaignType(value: string) {
  if (value === "daily") return "데일리";
  if (value === "weekly") return "위클리";
  if (value === "season") return "시즌";
  if (value === "event") return "이벤트";
  if (value === "permanent") return "상시";
  return "이벤트";
}

export default function GrowthScreen() {
  const router = useRouter();
  const { summary, achievements, campaigns, loading, error, source, refetch } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);

  const questSummary = useMemo(() => {
    const all = campaigns.flatMap((campaign) => campaign.quests);
    const completed = all.filter((q) => q.status === "completed").length;
    const inProgress = all.filter((q) => q.status === "in_progress").length;

    return {
      total: all.length,
      completed,
      inProgress,
      locked: Math.max(0, all.length - completed - inProgress),
    };
  }, [campaigns]);

  const achievementSummary = useMemo(() => {
    const completed = achievements.filter((a) => a.status === "completed").length;
    const inProgress = achievements.filter((a) => a.status === "in_progress").length;

    return {
      total: achievements.length,
      completed,
      inProgress,
      locked: Math.max(0, achievements.length - completed - inProgress),
    };
  }, [achievements]);

  const questHighlights = useMemo<ProgressItem[]>(() => {
    return campaigns
      .flatMap((campaign) =>
        campaign.quests.map((quest) => ({
          id: `${campaign.id}-${quest.id}`,
          title: quest.name,
          subtitle: quest.isLocked
            ? `${campaign.name} · 시즌 패스 필요 · +${quest.rewardXp} XP`
            : `${campaign.name} · ${Math.min(quest.progress, quest.target)}/${quest.target} · +${quest.rewardXp} XP`,
          status: quest.isLocked ? "locked" : quest.status,
          order: quest.isLocked ? 2 : quest.status === "in_progress" ? 0 : quest.status === "completed" ? 1 : 2,
          progress: quest.progress,
        }))
      )
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.progress - a.progress;
      })
      .slice(0, 3)
      .map(({ id, title, subtitle, status }) => ({ id, title, subtitle, status }));
  }, [campaigns]);

  const campaignPreview = useMemo<CampaignPreviewItem[]>(() => {
    return campaigns
      .map((campaign) => {
        const inProgressCount = campaign.quests.filter((quest) => quest.status === "in_progress").length;
        const completedCount = campaign.quests.filter((quest) => quest.status === "completed").length;
        return {
          id: campaign.id,
          title: campaign.name,
          typeLabel: formatCampaignType(campaign.campaignType),
          questCount: campaign.quests.length,
          inProgressCount,
          completedCount,
        };
      })
      .filter((campaign) => campaign.questCount > 0)
      .sort((a, b) => b.inProgressCount - a.inProgressCount || b.questCount - a.questCount)
      .slice(0, 3);
  }, [campaigns]);

  const achievementHighlights = useMemo<ProgressItem[]>(() => {
    return achievements
      .map((achievement) => ({
        id: String(achievement.id),
        title: `${achievement.icon || "🌿"} ${achievement.name}`,
        subtitle: `${Math.min(achievement.progress, achievement.target)}/${achievement.target}`,
        status: achievement.status,
        order: achievement.status === "in_progress" ? 0 : achievement.status === "completed" ? 1 : 2,
        progress: achievement.progress,
      }))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.progress - a.progress;
      })
      .slice(0, 3)
      .map(({ id, title, subtitle, status }) => ({ id, title, subtitle, status }));
  }, [achievements]);

  useEffect(() => {
    trackGrowthTelemetry("growth_screen_viewed", { screen: "home" });
  }, []);

  useEffect(() => {
    if (!source) return;
    trackGrowthTelemetry("growth_screen_source_updated", { screen: "home", source });
  }, [source]);

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
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroEyebrow}>오늘의 리포트</Text>
              <Text style={styles.h1}>성장</Text>
              <Text style={styles.subtitle}>지금 진행 중인 흐름을 확인해요.</Text>
              <Text style={styles.heroQuickStatus}>
                {summary
                  ? `Lv.${summary.level} · 오늘 +${summary.todayXp} XP`
                  : "데이터를 불러오는 중이에요."}
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <HeroStat label="활성 이벤트" value={`${campaigns.length}`} />
            <HeroStat label="진행 업적" value={`${achievementSummary.inProgress}`} />
            <HeroStat label="진행 퀘스트" value={`${questSummary.inProgress}`} />
          </View>
        </View>

        <GrowthChart
          summary={summary}
          loading={loading}
          error={error}
          source={source}
        />

        <View style={styles.actionRow}>
          <ActionCard
            title="업적 보기"
            description={`${achievementSummary.total}개`}
            icon="trophy-outline"
            onPress={() => {
              trackGrowthTelemetry("growth_action_clicked", { action: "open_achievements" });
              router.push("/growth/achievements");
            }}
            accessibilityHint="업적 상세 화면으로 이동"
            testID="growth-action-achievements"
          />
          <ActionCard
            title="퀘스트 보기"
            description={`${questSummary.total}개`}
            icon="trail-sign-outline"
            onPress={() => {
              trackGrowthTelemetry("growth_action_clicked", { action: "open_quests" });
              router.push("/growth/quests");
            }}
            accessibilityHint="퀘스트 상세 화면으로 이동"
            testID="growth-action-quests"
          />
        </View>

        <CampaignPreviewSection
          items={campaignPreview}
          onPressMore={() => router.push("/growth/quests")}
        />

        <PreviewSection
          title="업적 하이라이트"
          caption={`${achievementSummary.inProgress}개 진행 중`}
          items={achievementHighlights}
          emptyText="진행 중인 업적이 없어요."
          onPressMore={() => router.push("/growth/achievements")}
          moreButtonTestID="growth-achievements-more"
        />

        <PreviewSection
          title="퀘스트 진행 하이라이트"
          caption={`${questSummary.inProgress}개 진행 중`}
          items={questHighlights}
          emptyText="진행 중인 퀘스트가 없어요."
          onPressMore={() => router.push("/growth/quests")}
          moreButtonTestID="growth-quests-more"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatPill}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

function ActionCard({
  title,
  description,
  icon,
  onPress,
  accessibilityHint,
  testID,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityHint?: string;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={tokens.colors.green900} />
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={tokens.colors.textMuted} />
    </Pressable>
  );
}

function CampaignPreviewSection({
  items,
  onPressMore,
}: {
  items: CampaignPreviewItem[];
  onPressMore: () => void;
}) {
  return (
    <View style={styles.sectionCard} testID="growth-campaign-preview">
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>진행 이벤트</Text>
          <Text style={styles.sectionCaption}>
            {items.length > 0 ? `${items.length}개 이벤트 표시 중` : "열린 이벤트를 확인해요"}
          </Text>
        </View>
        <Pressable
          onPress={onPressMore}
          style={styles.moreBtn}
          testID="growth-campaigns-more"
          accessibilityRole="button"
          accessibilityLabel="진행 이벤트 전체보기"
          accessibilityHint="퀘스트 상세 화면으로 이동"
        >
          <Text style={styles.moreBtnText}>전체보기</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>진행 중인 이벤트가 없어요.</Text>
      ) : (
        <View style={styles.campaignPreviewList}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={onPressMore}
              style={({ pressed }) => [styles.campaignPreviewItem, pressed && styles.pressed]}
              testID={`growth-campaign-preview-item-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} 이벤트 보기`}
              accessibilityHint="퀘스트 상세 화면으로 이동"
            >
              <View style={styles.campaignPreviewBody}>
                <View style={styles.campaignPreviewTitleRow}>
                  <Text numberOfLines={1} style={styles.campaignPreviewTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.campaignPreviewBadge}>{item.typeLabel}</Text>
                </View>
                <Text style={styles.campaignPreviewMeta}>
                  퀘스트 {item.questCount}개 · 진행 {item.inProgressCount}개 · 완료 {item.completedCount}개
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function PreviewSection({
  title,
  caption,
  items,
  emptyText,
  onPressMore,
  moreButtonTestID,
}: {
  title: string;
  caption: string;
  items: ProgressItem[];
  emptyText: string;
  onPressMore: () => void;
  moreButtonTestID: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCaption}>{caption}</Text>
        </View>
        <Pressable
          onPress={onPressMore}
          style={styles.moreBtn}
          testID={moreButtonTestID}
          accessibilityRole="button"
          accessibilityLabel={`${title} 전체보기`}
          accessibilityHint="상세 화면으로 이동"
        >
          <Text style={styles.moreBtnText}>전체보기</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.previewList}>
          {items.map((item) => {
            const statusMeta = getStatusMeta(item.status);
            return (
              <View key={item.id} style={styles.previewItem}>
                <View style={styles.previewItemBody}>
                  <Text numberOfLines={1} style={styles.previewTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
                <Text style={[styles.previewStatus, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  content: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    paddingBottom: 120,
    gap: tokens.space.lg as any,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  heroCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green900,
    letterSpacing: 0.2,
  },
  h1: {
    fontSize: tokens.font.h1,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  heroQuickStatus: {
    marginTop: 2,
    fontSize: tokens.font.small,
    color: tokens.colors.text,
    fontWeight: "700",
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  heroStatPill: {
    flex: 1,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    gap: 2,
  },
  heroStatLabel: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  heroStatValue: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  actionRow: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  actionCard: {
    flex: 1,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  pressed: {
    opacity: 0.86,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  actionDesc: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  sectionCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  sectionHeading: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionCaption: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  moreBtn: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: tokens.colors.surface,
  },
  moreBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  emptyText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  previewList: {
    gap: tokens.space.sm as any,
  },
  previewItem: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
    minHeight: 62,
  },
  previewItemBody: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  previewSubtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  previewStatus: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    backgroundColor: tokens.colors.green050,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  campaignPreviewList: {
    gap: tokens.space.sm as any,
  },
  campaignPreviewItem: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
    minHeight: 64,
  },
  campaignPreviewBody: {
    flex: 1,
    gap: 5,
  },
  campaignPreviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs as any,
  },
  campaignPreviewTitle: {
    flex: 1,
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  campaignPreviewBadge: {
    flexShrink: 0,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    color: tokens.colors.green900,
    fontSize: tokens.font.small,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  campaignPreviewMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
});
