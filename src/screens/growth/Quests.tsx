import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { GrowthDetailTopBar } from "@/components/growth/GrowthDetailTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { GrowthQuest } from "@/features/growth/useGrowthData";
import { useGrowthData } from "@/features/growth/useGrowthData";
import { normalizeApiError } from "@/lib/errors";
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
  const { campaigns, loading, error, refetch, claimQuestReward } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);
  const [claimPendingByStateId, setClaimPendingByStateId] = useState<Record<number, boolean>>({});

  const onRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loading, refetch]);

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

  const handleClaimReward = useCallback(
    async (stateId: number) => {
      if (claimPendingByStateId[stateId]) return;

      setClaimPendingByStateId((prev) => ({ ...prev, [stateId]: true }));
      try {
        const result = await claimQuestReward(stateId);
        Alert.alert("보상 수령 완료", `+${result.gainedXp} XP를 얻었어요.`);
      } catch (claimError) {
        const normalized = normalizeApiError(claimError);

        if (normalized.kind === "auth") {
          Alert.alert(normalized.title, normalized.description);
          router.push("/(auth)");
          return;
        }

        Alert.alert(normalized.title, normalized.description || "잠시 후 다시 시도해주세요.");
      } finally {
        setClaimPendingByStateId((prev) => ({ ...prev, [stateId]: false }));
      }
    },
    [claimPendingByStateId, claimQuestReward, router]
  );

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe} testID="growth-quests-screen">
        <GrowthDetailTopBar
          title="퀘스트 상세"
          subtitle="로그인이 필요해요"
          onPressBack={() => router.back()}
          backButtonTestID="growth-quests-back-btn"
        />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="퀘스트 정보를 보려면 로그인해 주세요."
            primaryAction={{ label: "로그인 하러가기", onPress: () => router.push("/(auth)") }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const showLoading = loading && questCount === 0;
  const showError = Boolean(error && questCount === 0);
  const showEmpty = !showLoading && !showError && questCount === 0;

  return (
    <SafeAreaView style={styles.safe} testID="growth-quests-screen">
      <GrowthDetailTopBar
        title="퀘스트 상세"
        subtitle={`캠페인 ${campaigns.length}개 · 퀘스트 ${questCount}개`}
        onPressBack={() => router.back()}
        backButtonTestID="growth-quests-back-btn"
      />

      <ScrollView
        testID="growth-quests-scroll"
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
        {showLoading ? <AppLoading message="퀘스트 목록을 불러오는 중..." /> : null}

        {showError ? (
          <AppError
            error={{
              title: error?.title || "퀘스트 정보를 불러오지 못했어요",
              description: error?.description,
            }}
          />
        ) : null}

        {showEmpty ? (
          <AppEmpty
            title="진행 가능한 퀘스트가 없어요"
            description="지금은 표시할 퀘스트가 없어요. 새 캠페인이 열리면 자동으로 표시돼요."
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

            {sortedCampaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignCard}>
                <View style={styles.campaignHeader}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignMeta}>{campaign.quests.length}개 퀘스트</Text>
                </View>
                {campaign.description ? <Text style={styles.campaignDesc}>{campaign.description}</Text> : null}

                <View style={styles.questList}>
                  {campaign.quests.map((quest) => (
                    <QuestItem
                      key={quest.id}
                      quest={quest}
                      claimPending={Boolean(claimPendingByStateId[quest.stateId])}
                      onClaim={handleClaimReward}
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

function QuestItem({
  quest,
  claimPending,
  onClaim,
}: {
  quest: GrowthQuest;
  claimPending: boolean;
  onClaim: (stateId: number) => void;
}) {
  const statusMeta = getQuestStatusMeta(quest.status);
  const percent = quest.target > 0 ? clampPercent((quest.progress / quest.target) * 100) : 0;
  const progressCurrent = Math.min(quest.progress, quest.target);
  const canClaim = quest.status === "completed" && !quest.rewardClaimedAt;

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

      {canClaim ? (
        <Pressable
          onPress={() => onClaim(quest.stateId)}
          disabled={claimPending}
          style={({ pressed }) => [
            styles.claimBtn,
            claimPending && styles.claimBtnDisabled,
            pressed && !claimPending && styles.claimBtnPressed,
          ]}
          testID={`quest-claim-btn-${quest.stateId}`}
        >
          <Text style={styles.claimBtnText}>{claimPending ? "수령 처리 중..." : "보상 수령"}</Text>
        </Pressable>
      ) : null}

      {!canClaim && quest.rewardClaimedAt ? (
        <Text style={styles.claimedText}>보상 수령됨</Text>
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
  claimBtn: {
    alignSelf: "flex-start",
    marginTop: 2,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green100,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  claimBtnPressed: {
    opacity: 0.88,
  },
  claimBtnDisabled: {
    opacity: 0.65,
  },
  claimBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  claimedText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
});
