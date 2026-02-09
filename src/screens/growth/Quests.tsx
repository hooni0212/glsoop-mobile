import React, { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { GrowthDetailTopBar } from "@/components/growth/GrowthDetailTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { GrowthQuest } from "@/features/growth/useGrowthData";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { tokens } from "@/theme/tokens";

const STATUS_ORDER: Record<GrowthQuest["status"], number> = {
  in_progress: 0,
  completed: 1,
  locked: 2,
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getQuestStatusMeta(status: GrowthQuest["status"]) {
  if (status === "completed") return { label: "완료", color: tokens.colors.green700 };
  if (status === "in_progress") return { label: "진행중", color: tokens.colors.green900 };
  return { label: "잠금", color: tokens.colors.textMuted };
}

export default function QuestsScreen() {
  const router = useRouter();
  const { campaigns, loading, error, refetch } = useGrowthData();

  const sortedCampaigns = useMemo(() => {
    return campaigns
      .map((campaign) => ({
        ...campaign,
        quests: [...campaign.quests].sort((a, b) => {
          if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
            return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          }
          return a.positionIndex - b.positionIndex;
        }),
      }))
      .sort((a, b) => {
        const aTime = a.startAt ? new Date(a.startAt).getTime() : 0;
        const bTime = b.startAt ? new Date(b.startAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [campaigns]);

  const questCount = useMemo(() => {
    return campaigns.reduce((acc, campaign) => acc + campaign.quests.length, 0);
  }, [campaigns]);

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="퀘스트 상세"
          subtitle="로그인이 필요해요"
          onPressBack={() => router.back()}
        />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="퀘스트를 확인하려면 로그인해 주세요."
            primaryAction={{ label: "로그인 하러가기", onPress: () => router.push("/(auth)") }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading && questCount === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="퀘스트 상세"
          subtitle="캠페인 진행"
          onPressBack={() => router.back()}
          onPressRefresh={refetch}
        />
        <View style={styles.center}>
          <AppLoading message="퀘스트 목록을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error && questCount === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="퀘스트 상세"
          subtitle="캠페인 진행"
          onPressBack={() => router.back()}
          onPressRefresh={refetch}
        />
        <View style={styles.center}>
          <AppError error={error} onRetry={error.canRetry ? refetch : undefined} />
        </View>
      </SafeAreaView>
    );
  }

  if (questCount === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GrowthDetailTopBar
          title="퀘스트 상세"
          subtitle="캠페인 진행"
          onPressBack={() => router.back()}
          onPressRefresh={refetch}
        />
        <View style={styles.center}>
          <AppEmpty
            title="활성 퀘스트가 없어요"
            description="다음 캠페인이 열리면 여기에 자동으로 표시됩니다."
            primaryAction={{ label: "새로고침", onPress: refetch }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GrowthDetailTopBar
        title="퀘스트 상세"
        subtitle={`캠페인 ${campaigns.length}개 · 퀘스트 ${questCount}개`}
        onPressBack={() => router.back()}
        onPressRefresh={refetch}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>일부 데이터가 오래된 상태일 수 있어요. 새로고침으로 동기화하세요.</Text>
            <Pressable onPress={refetch} style={styles.noticeBtn}>
              <Text style={styles.noticeBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : null}

        {sortedCampaigns.map((campaign) => (
          <View key={campaign.id} style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignName}>{campaign.name}</Text>
              <Text style={styles.campaignMeta}>{campaign.quests.length}개 퀘스트</Text>
            </View>
            {campaign.description ? <Text style={styles.campaignDesc}>{campaign.description}</Text> : null}

            <View style={styles.questList}>
              {campaign.quests.map((quest) => (
                <QuestItem key={quest.id} quest={quest} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuestItem({ quest }: { quest: GrowthQuest }) {
  const statusMeta = getQuestStatusMeta(quest.status);
  const percent = quest.target > 0 ? clampPercent((quest.progress / quest.target) * 100) : 0;
  const progressCurrent = Math.min(quest.progress, quest.target);

  return (
    <View style={styles.questItem}>
      <View style={styles.questHeaderRow}>
        <View style={styles.questTitleBlock}>
          <Text style={styles.questName}>{quest.name}</Text>
          {quest.description ? <Text style={styles.questDesc}>{quest.description}</Text> : null}
        </View>
        <Text style={[styles.statusChip, { color: statusMeta.color }]}>{statusMeta.label}</Text>
      </View>

      <View style={styles.questMetaRow}>
        <Text style={styles.questMeta}>보상 +{quest.rewardXp} XP</Text>
        <Text style={styles.questMeta}>
          진행 {progressCurrent}/{quest.target}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${percent}%` }]} />
      </View>
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
  campaignCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  campaignName: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
    flex: 1,
  },
  campaignMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  campaignDesc: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  questList: {
    gap: tokens.space.sm as any,
  },
  questItem: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    gap: tokens.space.xs as any,
  },
  questHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  questTitleBlock: {
    flex: 1,
    gap: 2,
  },
  questName: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  questDesc: {
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
  questMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questMeta: {
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
});
