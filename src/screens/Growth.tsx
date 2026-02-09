import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
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

  const sourceLabel = source === "dashboard" ? "Dashboard" : source === "fallback" ? "Fallback" : "";

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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.h1}>성장</Text>
              <Text style={styles.subtitle}>레벨, 업적, 퀘스트를 한 흐름에서 관리해요.</Text>
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
          onRetry={refetch}
        />

        <View style={styles.actionRow}>
          <ActionCard
            title="업적 상세"
            description={`전체 ${achievementSummary.total}개`}
            icon="trophy-outline"
            onPress={() => router.push("/growth/achievements")}
          />
          <ActionCard
            title="퀘스트 상세"
            description={`전체 ${questSummary.total}개`}
            icon="trail-sign-outline"
            onPress={() => router.push("/growth/quests")}
          />
        </View>

        <PreviewSection
          title="진행 중 업적"
          caption={`${achievementSummary.inProgress}개 진행 중`}
          items={achievementHighlights}
          emptyText="업적 데이터가 준비되면 여기서 바로 확인할 수 있어요."
          onPressMore={() => router.push("/growth/achievements")}
        />

        <PreviewSection
          title="퀘스트 진행 하이라이트"
          caption={`${questSummary.inProgress}개 진행 중`}
          items={questHighlights}
          emptyText="활성 퀘스트가 없어요. 다음 캠페인을 기다려주세요."
          onPressMore={() => router.push("/growth/quests")}
        />

        <TopPostsList
          items={[]}
          loading={false}
          error={null}
          onRetry={refetch}
          title="인기 글"
          description="좋아요/저장 반응이 높은 글을 보여주는 영역이에요."
          emptyDescription="현재 서버 응답에는 top_posts가 없어 준비 중 상태로 표시됩니다."
        />

        <Pressable onPress={refetch} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color={tokens.colors.green900} />
          <Text style={styles.refreshBtnText}>성장 데이터 새로고침</Text>
        </Pressable>
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
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
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
}: {
  title: string;
  caption: string;
  items: ProgressItem[];
  emptyText: string;
  onPressMore: () => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCaption}>{caption}</Text>
        </View>
        <Pressable onPress={onPressMore} style={styles.moreBtn}>
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
    backgroundColor: tokens.colors.surfaceStrong,
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
  h1: {
    fontSize: tokens.font.h1,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
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
    gap: tokens.space.sm as any,
  },
  actionCard: {
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
  refreshBtn: {
    alignSelf: "center",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green100,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
});
