import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
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
import { TopPostsList } from "@/components/growth/TopPostsList";
import { AppEmpty } from "@/components/state/AppEmpty";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { tokens } from "@/theme/tokens";

type ProgressItem = {
  id: string;
  title: string;
  subtitle: string;
  status: "in_progress" | "completed" | "locked";
};

function getStatusMeta(status: ProgressItem["status"]) {
  if (status === "completed") return { label: "완료", color: tokens.colors.green700 };
  if (status === "in_progress") return { label: "진행중", color: tokens.colors.green900 };
  return { label: "잠금", color: tokens.colors.textMuted };
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
          subtitle: `${campaign.name} · ${Math.min(quest.progress, quest.target)}/${quest.target} · +${quest.rewardXp} XP`,
          status: quest.status,
          order: quest.status === "in_progress" ? 0 : quest.status === "completed" ? 1 : 2,
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

  const sourceLabel = source === "dashboard" ? "기본 데이터" : source === "fallback" ? "대체 데이터" : "";

  const onRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      await refetch();
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
              <Text style={styles.subtitle}>오늘의 성장 상태를 한 번에 확인해요.</Text>
              <Text style={styles.heroQuickStatus}>
                {summary
                  ? `Lv.${summary.level} · 오늘 +${summary.todayXp} XP`
                  : "성장 데이터를 불러오는 중이에요."}
              </Text>
            </View>
            {sourceLabel ? <Text style={styles.sourceBadge}>{sourceLabel}</Text> : null}
          </View>

          <View style={styles.heroStatsRow}>
            <HeroStat label="활성 캠페인" value={`${campaigns.length}`} />
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
            description={`전체 ${achievementSummary.total}개`}
            icon="trophy-outline"
            onPress={() => router.push("/growth/achievements")}
            testID="growth-action-achievements"
          />
          <ActionCard
            title="퀘스트 보기"
            description={`전체 ${questSummary.total}개`}
            icon="trail-sign-outline"
            onPress={() => router.push("/growth/quests")}
            testID="growth-action-quests"
          />
        </View>

        <PreviewSection
          title="업적 하이라이트"
          caption={`${achievementSummary.inProgress}개 진행 중`}
          items={achievementHighlights}
          emptyText="진행 중인 업적이 없어요. 활동을 시작하면 자동으로 표시돼요."
          onPressMore={() => router.push("/growth/achievements")}
          moreButtonTestID="growth-achievements-more"
        />

        <PreviewSection
          title="퀘스트 진행 하이라이트"
          caption={`${questSummary.inProgress}개 진행 중`}
          items={questHighlights}
          emptyText="진행 중인 퀘스트가 없어요. 새 캠페인이 시작되면 표시돼요."
          onPressMore={() => router.push("/growth/quests")}
          moreButtonTestID="growth-quests-more"
        />

        <TopPostsList
          items={[]}
          loading={false}
          error={null}
          title="인기 글"
          description="반응이 좋은 글을 모아 보여주는 영역이에요."
          emptyDescription="인기 글 추천 기능을 준비 중이에요. 곧 여기에서 확인할 수 있어요."
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
  testID,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
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
        <Pressable onPress={onPressMore} style={styles.moreBtn} testID={moreButtonTestID}>
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
  sourceBadge: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
    backgroundColor: tokens.colors.green100,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
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
});
