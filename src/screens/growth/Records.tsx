import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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

import { GrowthDetailTopBar } from "@/components/growth/GrowthDetailTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { type GrowthAchievement, useGrowthData } from "@/features/growth/useGrowthData";
import { DailyWritingCampaignStepper } from "@/features/writingCampaign/DailyWritingCampaignStepper";
import {
  buildDailyWritingPromptWritePath,
  getDailyWritingCampaignFocusSteps,
  type DailyWritingCampaignStatus,
} from "@/features/writingCampaign/dailyWritingCampaign";
import {
  fetchWritingEventStatus,
  fetchWritingEventPosts,
  type WritingEventPost,
} from "@/features/writingCampaign/writingEventPosts";
import { formatKstDateDot, toTimestampMs } from "@/lib/dateTime";
import { tokens } from "@/theme/tokens";

function getCompletedAchievements(achievements: GrowthAchievement[]) {
  return achievements
    .filter((item) => item.status === "completed")
    .sort((a, b) => (toTimestampMs(b.unlockedAt) || 0) - (toTimestampMs(a.unlockedAt) || 0))
    .slice(0, 3);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getXpPercent(summary: NonNullable<ReturnType<typeof useGrowthData>["summary"]>) {
  if (summary.nextLevelXp <= 0) return 0;
  return clampPercent((summary.currentXp / summary.nextLevelXp) * 100);
}

function getRemainingXp(summary: NonNullable<ReturnType<typeof useGrowthData>["summary"]>) {
  return Math.max(0, summary.nextLevelXp - summary.currentXp);
}

export default function GrowthRecordsScreen() {
  const router = useRouter();
  const { summary, achievements, loading, error, refetch } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);
  const [dailyWritingCampaign, setDailyWritingCampaign] =
    useState<DailyWritingCampaignStatus | null>(null);
  const [writingEventPosts, setWritingEventPosts] = useState<WritingEventPost[]>([]);
  const [writingEventPostsLoading, setWritingEventPostsLoading] = useState(false);
  const [writingEventPostsError, setWritingEventPostsError] = useState<string | null>(null);
  const dailyWritingProgressSteps = useMemo(
    () =>
      dailyWritingCampaign
        ? getDailyWritingCampaignFocusSteps(dailyWritingCampaign)
        : [],
    [dailyWritingCampaign]
  );

  const loadWritingCampaign = useCallback(
    async (silent = false) => {
      if (!silent) setWritingEventPostsLoading(true);
      setWritingEventPostsError(null);
      try {
        const status = await fetchWritingEventStatus();
        setDailyWritingCampaign(status);
        if (!status) {
          setWritingEventPosts([]);
          return;
        }

        const posts = await fetchWritingEventPosts(status.campaignKey);
        setWritingEventPosts(posts);
      } catch (postsError) {
        setDailyWritingCampaign(null);
        setWritingEventPosts([]);
        setWritingEventPostsError(
          postsError instanceof Error
            ? postsError.message
            : "프로젝트 글 목록을 불러오지 못했어요."
        );
      } finally {
        if (!silent) setWritingEventPostsLoading(false);
      }
    },
    []
  );

  const completedAchievements = useMemo(
    () => getCompletedAchievements(achievements),
    [achievements]
  );

  useEffect(() => {
    trackGrowthTelemetry("growth_screen_viewed", { screen: "records" });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWritingCampaign();
    }, [loadWritingCampaign])
  );

  const onRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    const startedAt = Date.now();
    trackGrowthTelemetry("growth_refresh_started", { screen: "records" });
    setRefreshing(true);
    try {
      await Promise.all([refetch(), loadWritingCampaign(true)]);
      trackGrowthTelemetry("growth_refresh_succeeded", {
        screen: "records",
        durationMs: Date.now() - startedAt,
      });
    } catch (refreshError) {
      trackGrowthTelemetry("growth_refresh_failed", {
        screen: "records",
        durationMs: Date.now() - startedAt,
        error: toGrowthTelemetryError(refreshError),
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loading, refetch, loadWritingCampaign]);

  const openDailyWritingPrompt = useCallback(() => {
    if (!dailyWritingCampaign) return;
    trackGrowthTelemetry("growth_action_clicked", {
      action: "open_daily_writing_prompt_from_records",
    });
    router.push(buildDailyWritingPromptWritePath(dailyWritingCampaign) as never);
  }, [dailyWritingCampaign, router]);

  const openWritingEventPost = useCallback(
    (postId: string) => {
      router.push(`/posts/${postId}` as never);
    },
    [router]
  );

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe} testID="growth-records-screen">
        <GrowthDetailTopBar
          title="성장 기록"
          subtitle="로그인이 필요해요"
          onPressBack={() => router.back()}
          backButtonTestID="growth-records-back-btn"
        />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="성장 기록을 보려면 로그인해 주세요."
            primaryAction={{ label: "로그인 하러가기", onPress: () => router.push("/(auth)") }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const showLoading = loading && !summary;
  const showError = Boolean(error && !summary);
  const showEmpty = !showLoading && !showError && !summary;

  return (
    <SafeAreaView style={styles.safe} testID="growth-records-screen">
      <GrowthDetailTopBar
        title="성장 기록"
        subtitle="자세한 지표"
        onPressBack={() => router.back()}
        backButtonTestID="growth-records-back-btn"
      />

      <ScrollView
        testID="growth-records-scroll"
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
        {showLoading ? <AppLoading message="성장 기록을 불러오는 중..." /> : null}

        {showError && error ? <AppError error={error} /> : null}

        {showEmpty ? (
          <AppEmpty
            title="아직 성장 기록이 없어요"
            description="활동이 쌓이면 세부 기록이 표시돼요."
          />
        ) : null}

        {summary ? (
          <>
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  일부 데이터가 최신 상태가 아닐 수 있어요. 화면을 아래로 당겨 갱신해 주세요.
                </Text>
              </View>
            ) : null}

            <RecordHero summary={summary} />

            {dailyWritingCampaign ? (
              <DailyWritingCampaignProgressCard
                status={dailyWritingCampaign}
                steps={dailyWritingProgressSteps}
                onPressWrite={openDailyWritingPrompt}
              />
            ) : null}

            <RecordSection title="이번 흐름">
              <RecordRow label="오늘 XP" value={`+${summary.todayXp}`} />
              <RecordRow label="이번 주 글" value={`${summary.weeklyPosts}개`} />
              <RecordRow label="현재 스트릭" value={`${summary.streakDays}일`} />
            </RecordSection>

            <RecordSection title="쌓인 기록">
              <RecordRow label="최장 스트릭" value={`${summary.maxStreakDays}일`} />
              <RecordRow label="누적 XP" value={`${summary.currentXp}`} />
              <RecordRow label="다음 기준" value={`${summary.nextLevelXp} XP`} />
            </RecordSection>

            {completedAchievements.length > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>최근 획득 업적</Text>
                <View style={styles.achievementList}>
                  {completedAchievements.map((item) => (
                    <View key={item.id} style={styles.achievementItem}>
                      <Text style={styles.achievementIcon}>{item.icon || "🌿"}</Text>
                      <View style={styles.achievementCopy}>
                        <Text style={styles.achievementTitle}>{item.name}</Text>
                        <Text style={styles.achievementMeta}>
                          {item.unlockedAt ? formatKstDateDot(item.unlockedAt) : "획득 완료"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {dailyWritingCampaign ? (
              <WritingEventPostsCarousel
                posts={writingEventPosts}
                loading={writingEventPostsLoading}
                error={writingEventPostsError}
                promptLabel={dailyWritingCampaign.promptLabel}
                onPressWrite={openDailyWritingPrompt}
                onPressPost={openWritingEventPost}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function WritingEventPostsCarousel({
  posts,
  loading,
  error,
  promptLabel,
  onPressWrite,
  onPressPost,
}: {
  posts: WritingEventPost[];
  loading: boolean;
  error: string | null;
  promptLabel: string;
  onPressWrite: () => void;
  onPressPost: (postId: string) => void;
}) {
  return (
    <View style={styles.writingEventPostsSection} testID="growth-records-writing-event-posts">
      <View style={styles.writingEventPostsHeader}>
        <View style={styles.writingEventPostsHeading}>
          <Text style={styles.sectionTitle}>이번 프로젝트에 남긴 글</Text>
          <Text style={styles.writingEventPostsSubtitle}>
            {promptLabel}으로 쌓은 글을 옆으로 넘겨 확인해요.
          </Text>
        </View>
        <Text style={styles.writingEventPostsCount}>{posts.length}개</Text>
      </View>

      {loading ? (
        <View style={styles.writingEventPostsStateBox}>
          <Text style={styles.writingEventPostsStateText}>프로젝트 글을 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.writingEventPostsStateBox}>
          <Text style={styles.writingEventPostsStateText}>{error}</Text>
        </View>
      ) : posts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.writingEventPostsList}
        >
          {posts.map((post) => {
            const dateLabel = formatKstDateDot(post.createdAt);
            return (
              <Pressable
                key={post.id}
                onPress={() => onPressPost(post.id)}
                style={({ pressed }) => [
                  styles.writingEventPostCard,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${post.title} 글 보기`}
                testID={`growth-records-writing-event-post-${post.id}`}
              >
                <Text style={styles.writingEventPostMeta}>
                  {post.promptDay ? `${post.promptDay}일차` : promptLabel}
                  {post.promptTitle ? ` · ${post.promptTitle}` : ""}
                </Text>
                <Text style={styles.writingEventPostTitle} numberOfLines={2}>
                  {post.title}
                </Text>
                <Text style={styles.writingEventPostExcerpt} numberOfLines={3}>
                  {post.excerpt || post.promptBody || "남긴 글을 열어 내용을 확인해보세요."}
                </Text>
                <Text style={styles.writingEventPostDate}>
                  {dateLabel || "작성일 확인 중"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.writingEventPostsEmpty}>
          <Text style={styles.writingEventPostsEmptyTitle}>아직 프로젝트에 남긴 글이 없어요</Text>
          <Text style={styles.writingEventPostsEmptyText}>
            {promptLabel}으로 첫 글을 남기면 여기에서 다시 볼 수 있어요.
          </Text>
          <Pressable
            onPress={onPressWrite}
            style={({ pressed }) => [styles.writingEventPostsEmptyButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${promptLabel}으로 글쓰기`}
            testID="growth-records-writing-event-empty-write-btn"
          >
            <Text style={styles.writingEventPostsEmptyButtonText}>오늘 주제로 쓰기</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function DailyWritingCampaignProgressCard({
  status,
  steps,
  onPressWrite,
}: {
  status: DailyWritingCampaignStatus;
  steps: ReturnType<typeof getDailyWritingCampaignFocusSteps>;
  onPressWrite: () => void;
}) {
  return (
    <View style={styles.writingCampaignProgressCard} testID="growth-records-writing-campaign-progress">
      <View style={styles.writingCampaignProgressHeader}>
        <View style={styles.writingCampaignProgressHeading}>
          <Text style={styles.recordHeroLabel}>{status.title}</Text>
          <Text style={styles.writingCampaignProgressTitle}>{status.currentDay}일차 진행 중</Text>
          <Text style={styles.writingCampaignProgressText}>
            {status.completedDays}개 글감을 지나 {status.promptLabel}을 쓰는 단계예요.
          </Text>
        </View>
        <View style={styles.writingCampaignProgressBadge}>
          <Text style={styles.writingCampaignProgressBadgeText}>
            {status.currentDay}/{status.totalDays}
          </Text>
        </View>
      </View>

      <View style={styles.writingCampaignProgressTrack}>
        <View
          style={[
            styles.writingCampaignProgressBar,
            status.progressPercent > 0 && styles.writingCampaignProgressBarMinimum,
            { width: `${status.progressPercent}%` },
          ]}
        />
      </View>

      <DailyWritingCampaignStepper
        steps={steps}
        title={`오늘 ${status.prompt.day}일차 진행 중`}
      />

      <View style={styles.writingCampaignTodayBox}>
        <Text style={styles.writingCampaignTodayMeta}>{status.promptLabel} · {status.prompt.day}일차</Text>
        <Text style={styles.writingCampaignTodayTitle}>{status.prompt.title}</Text>
        <Text style={styles.writingCampaignTodayBody}>{status.prompt.body}</Text>
      </View>

      <View style={styles.writingCampaignProgressFooter}>
        <Text style={styles.writingCampaignProgressHint}>
          남은 주제 {status.remainingDays}개
        </Text>
        <Pressable
          onPress={onPressWrite}
          style={({ pressed }) => [styles.writingCampaignWriteButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${status.promptLabel}으로 글쓰기`}
          testID="growth-records-writing-campaign-write-btn"
        >
          <Text style={styles.writingCampaignWriteButtonText}>이 주제로 쓰기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RecordHero({
  summary,
}: {
  summary: NonNullable<ReturnType<typeof useGrowthData>["summary"]>;
}) {
  const remainingXp = getRemainingXp(summary);
  const xpPercent = getXpPercent(summary);

  return (
    <View style={styles.recordHero}>
      <Text style={styles.recordHeroLabel}>최근의 숲</Text>
      <Text style={styles.recordHeroTitle}>
        Lv. {summary.level} {summary.title || "새싹"}
      </Text>
      <Text style={styles.recordHeroText}>
        다음 레벨까지 {remainingXp} XP 남았어요. 지금 속도 그대로 천천히 이어가면 돼요.
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${xpPercent}%` }]} />
      </View>
    </View>
  );
}

function RecordSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.recordSection}>
      <Text style={styles.recordSectionTitle}>{title}</Text>
      <View style={styles.recordRows}>{children}</View>
    </View>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordRow}>
      <Text style={styles.recordLabel}>{label}</Text>
      <Text style={styles.recordValue}>{value}</Text>
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
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    paddingBottom: 120,
    gap: tokens.space.lg as any,
  },
  contentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  notice: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
  },
  noticeText: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    color: tokens.colors.textMuted,
  },
  recordHero: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  recordHeroLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  recordHeroTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  recordHeroText: {
    fontSize: tokens.font.small,
    lineHeight: 19,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  progressTrack: {
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: "rgba(73, 128, 90, 0.16)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
  writingCampaignProgressCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 1,
  },
  writingCampaignProgressHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
  },
  writingCampaignProgressHeading: {
    flex: 1,
    gap: 3,
  },
  writingCampaignProgressTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    color: tokens.colors.green900,
    letterSpacing: 0,
  },
  writingCampaignProgressText: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    letterSpacing: 0,
  },
  writingCampaignProgressBadge: {
    minHeight: 34,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  writingCampaignProgressBadgeText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingCampaignProgressTrack: {
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    overflow: "hidden",
  },
  writingCampaignProgressBar: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
  writingCampaignProgressBarMinimum: {
    minWidth: 22,
  },
  writingCampaignTodayBox: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.md,
    gap: 5,
  },
  writingCampaignTodayMeta: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingCampaignTodayTitle: {
    fontSize: tokens.font.body,
    lineHeight: 21,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  writingCampaignTodayBody: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingCampaignProgressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  writingCampaignProgressHint: {
    flex: 1,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  writingCampaignWriteButton: {
    minHeight: 38,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
  },
  writingCampaignWriteButtonText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  pressed: {
    opacity: 0.82,
  },
  recordSection: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  recordSectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  recordRows: {
    gap: 2,
  },
  recordRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.bgMuted,
    gap: tokens.space.md as any,
  },
  recordLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  recordValue: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  writingEventPostsSection: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    paddingVertical: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  writingEventPostsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
    paddingHorizontal: tokens.space.lg,
  },
  writingEventPostsHeading: {
    flex: 1,
    gap: 4,
  },
  writingEventPostsSubtitle: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingEventPostsCount: {
    minWidth: 42,
    minHeight: 30,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    textAlign: "center",
    textAlignVertical: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingEventPostsList: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  writingEventPostCard: {
    width: 220,
    minHeight: 164,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.md,
    gap: 7,
  },
  writingEventPostMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingEventPostTitle: {
    fontSize: tokens.font.body,
    lineHeight: 21,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  writingEventPostExcerpt: {
    flex: 1,
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingEventPostDate: {
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  writingEventPostsStateBox: {
    marginHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
    padding: tokens.space.md,
  },
  writingEventPostsStateText: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingEventPostsEmpty: {
    marginHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  writingEventPostsEmptyTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  writingEventPostsEmptyText: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingEventPostsEmptyButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
  },
  writingEventPostsEmptyButtonText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  sectionCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  achievementList: {
    gap: tokens.space.sm as any,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  achievementIcon: {
    width: 32,
    fontSize: 20,
    textAlign: "center",
  },
  achievementCopy: {
    flex: 1,
    gap: 2,
  },
  achievementTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  achievementMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
});
