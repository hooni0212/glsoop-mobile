import React, { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { GrowthChart } from "@/components/growth/GrowthChart";
import { TopPostsList } from "@/components/growth/TopPostsList";
import { AppEmpty } from "@/components/state/AppEmpty";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { tokens } from "@/theme/tokens";

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>성장</Text>
          <Text style={styles.subtitle}>레벨, 스트릭, 퀘스트 진행 상황을 한 번에 확인해요.</Text>
        </View>

        <GrowthChart
          summary={summary}
          loading={loading}
          error={error}
          source={source}
          onRetry={refetch}
        />

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>퀘스트 현황</Text>
            <Text style={styles.sectionCaption}>활성 캠페인 {campaigns.length}개</Text>
          </View>
          <View style={styles.metricsWrap}>
            <MetricChip label="전체" value={`${questSummary.total}`} />
            <MetricChip label="진행중" value={`${questSummary.inProgress}`} />
            <MetricChip label="완료" value={`${questSummary.completed}`} />
            <MetricChip label="잠금" value={`${questSummary.locked}`} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>업적 현황</Text>
            <Text style={styles.sectionCaption}>전체 업적 {achievementSummary.total}개</Text>
          </View>
          <View style={styles.metricsWrap}>
            <MetricChip label="진행중" value={`${achievementSummary.inProgress}`} />
            <MetricChip label="완료" value={`${achievementSummary.completed}`} />
            <MetricChip label="잠금" value={`${achievementSummary.locked}`} />
          </View>
        </View>

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
          <Text style={styles.refreshBtnText}>성장 데이터 새로고침</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
    paddingBottom: 100,
    gap: tokens.space.lg as any,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  headerBlock: {
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
  metricsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  metricChip: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    minWidth: 84,
    gap: 2,
  },
  metricLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: tokens.font.body,
    color: tokens.colors.text,
    fontWeight: "900",
  },
  refreshBtn: {
    alignSelf: "center",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green100,
  },
  refreshBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
});
