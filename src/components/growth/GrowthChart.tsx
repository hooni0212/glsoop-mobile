import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { GrowthLoadSource, GrowthSummary } from "@/features/growth/useGrowthData";
import type { AppErrorModel } from "@/lib/errors";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { tokens } from "@/theme/tokens";

type Props = {
  summary: GrowthSummary | null;
  loading?: boolean;
  error?: AppErrorModel | null;
  source?: GrowthLoadSource;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSourceLabel(source?: GrowthLoadSource) {
  if (source === "dashboard") return "기본 데이터";
  if (source === "fallback") return "임시 데이터";
  return "";
}

export function GrowthChart({
  summary,
  loading = false,
  error = null,
  source = null,
}: Props) {
  if (loading && !summary) {
    return <AppLoading message="성장 정보를 불러오는 중..." />;
  }

  if (error && !summary) {
    return <AppError error={error} />;
  }

  if (!summary) {
    return (
      <AppEmpty
        title="아직 성장 데이터가 없어요"
        description="활동이 쌓이면 여기에 표시돼요."
      />
    );
  }

  const xpPercent =
    summary.nextLevelXp > 0 ? clampPercent((summary.currentXp / summary.nextLevelXp) * 100) : 0;
  const streakPercent =
    summary.maxStreakDays > 0 ? clampPercent((summary.streakDays / summary.maxStreakDays) * 100) : 0;
  const remainingXp = Math.max(0, summary.nextLevelXp - summary.currentXp);
  const sourceLabel = getSourceLabel(source);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>레벨 진행 현황</Text>
          <Text style={styles.headerMeta}>XP와 스트릭</Text>
        </View>
        {sourceLabel ? (
          <Text style={styles.sourceBadge} accessibilityLabel={`데이터 소스: ${sourceLabel}`}>
            {sourceLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.levelText}>Lv. {summary.level}</Text>
        <Text style={styles.levelTitle}>{summary.title || "새싹"}</Text>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>XP 진행도</Text>
          <Text style={styles.progressValue}>
            {summary.currentXp} / {summary.nextLevelXp}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${xpPercent}%` }]} />
        </View>
        <Text style={styles.progressHint}>다음 레벨까지 {remainingXp} XP</Text>
      </View>

      <View style={styles.statsRow}>
        <MetricPill label="오늘 XP" value={`+${summary.todayXp}`} />
        <MetricPill label="이번 주 글" value={`${summary.weeklyPosts}개`} />
        <MetricPill label="현재 스트릭" value={`${summary.streakDays}일`} />
        <MetricPill label="최장 스트릭" value={`${summary.maxStreakDays}일`} />
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>스트릭 진행도</Text>
          <Text style={styles.progressValue}>{streakPercent}%</Text>
        </View>
        <View style={styles.progressTrackSoft}>
          <View style={[styles.progressBarSoft, { width: `${streakPercent}%` }]} />
        </View>
      </View>

      {error ? (
        <View style={styles.noticeRow}>
          <Text style={styles.noticeText}>
            일부 데이터가 최신이 아닐 수 있어요. 아래로 당겨 새로고침해 주세요.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
  },
  headerTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  headerMeta: {
    marginTop: 2,
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
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  levelText: {
    fontSize: tokens.font.h1,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  levelTitle: {
    fontSize: tokens.font.body,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  progressBlock: {
    gap: tokens.space.xs as any,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  progressLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  progressValue: {
    fontSize: tokens.font.small,
    color: tokens.colors.text,
    fontWeight: "800",
  },
  progressTrack: {
    height: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
  progressHint: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  metricPill: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
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
    fontWeight: "800",
  },
  progressTrackSoft: {
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    overflow: "hidden",
  },
  progressBarSoft: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green600,
  },
  noticeRow: {
    marginTop: 2,
    paddingTop: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    gap: tokens.space.sm as any,
  },
  noticeText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
});
