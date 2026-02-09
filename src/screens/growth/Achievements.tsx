import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { GrowthDetailTopBar } from "@/components/growth/GrowthDetailTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { GrowthAchievement } from "@/features/growth/useGrowthData";
import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { tokens } from "@/theme/tokens";

function formatDateLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStatusMeta(status: GrowthAchievement["status"]) {
  if (status === "completed") return { label: "완료", color: tokens.colors.green700 };
  if (status === "in_progress") return { label: "진행중", color: tokens.colors.green900 };
  return { label: "잠금", color: tokens.colors.textMuted };
}

export default function AchievementsScreen() {
  const router = useRouter();
  const { achievements, loading, error, refetch } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);

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
        const aTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const bTime = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
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

            {sections.map((section) => (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.items.length}개</Text>
                </View>
                <View style={styles.list}>
                  {section.items.map((item) => (
                    <AchievementCard key={item.id} item={item} />
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

function AchievementCard({ item }: { item: GrowthAchievement }) {
  const statusMeta = getStatusMeta(item.status);
  const percent = item.target > 0 ? clampPercent((item.progress / item.target) * 100) : 0;
  const unlockedLabel = item.unlockedAt ? `달성일 ${formatDateLabel(item.unlockedAt)}` : "미달성";

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
      <Text style={styles.dateText}>{unlockedLabel}</Text>
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
});
