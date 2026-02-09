import React, { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { GrowthDetailTopBar } from "@/components/growth/GrowthDetailTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { GrowthAchievement } from "@/features/growth/useGrowthData";
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
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="업적 상세"
          subtitle="로그인이 필요해요"
          onPressBack={() => router.back()}
        />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="업적을 확인하려면 로그인해 주세요."
            primaryAction={{ label: "로그인 하러가기", onPress: () => router.push("/(auth)") }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading && achievements.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="업적 상세"
          subtitle="성장 기록"
          onPressBack={() => router.back()}
          onPressRefresh={refetch}
        />
        <View style={styles.center}>
          <AppLoading message="업적 목록을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error && achievements.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="업적 상세"
          subtitle="성장 기록"
          onPressBack={() => router.back()}
          onPressRefresh={refetch}
        />
        <View style={styles.center}>
          <AppError error={error} onRetry={error.canRetry ? refetch : undefined} />
        </View>
      </SafeAreaView>
    );
  }

  if (achievements.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="업적 상세"
          subtitle="성장 기록"
          onPressBack={() => router.back()}
          onPressRefresh={refetch}
        />
        <View style={styles.center}>
          <AppEmpty
            title="업적이 아직 없어요"
            description="글쓰기와 상호작용을 시작하면 업적이 열립니다."
            primaryAction={{ label: "새로고침", onPress: refetch }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GrowthDetailTopBar
        title="업적 상세"
        subtitle={`전체 ${achievements.length}개`}
        onPressBack={() => router.back()}
        onPressRefresh={refetch}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>일부 데이터를 다시 가져오는 중이에요. 최신 상태가 아닐 수 있어요.</Text>
            <Pressable onPress={refetch} style={styles.noticeBtn}>
              <Text style={styles.noticeBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.list}>
              {section.items.map((item) => (
                <AchievementCard key={item.id} item={item} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({ item }: { item: GrowthAchievement }) {
  const statusMeta = getStatusMeta(item.status);
  const percent = item.target > 0 ? clampPercent((item.progress / item.target) * 100) : 0;
  const unlockedLabel = item.unlockedAt ? `달성일 ${formatDateLabel(item.unlockedAt)}` : "아직 달성 전";

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
  notice: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  noticeText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  noticeBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green100,
  },
  noticeBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
  section: {
    gap: tokens.space.sm as any,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
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
