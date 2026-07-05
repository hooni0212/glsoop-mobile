import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  findNodeHandle,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import {
  type GrowthAchievement,
  type GrowthCampaign,
  type GrowthSummary,
  useGrowthData,
} from "@/features/growth/useGrowthData";
import {
  fetchWritingEventPosts,
  type WritingEventPost,
} from "@/features/writingCampaign/writingEventPosts";
import {
  buildDailyWritingPromptWritePath,
  getDailyWritingCampaignProgressSteps,
  getDailyWritingCampaignStatus,
  type DailyWritingCampaignProgressStep,
  type DailyWritingCampaignStatus,
} from "@/features/writingCampaign/dailyWritingCampaign";
import { toTimestampMs } from "@/lib/dateTime";
import {
  useGuidedHelpTarget,
  type GuidedHelpScrollIntoView,
} from "@/onboarding/GuidedHelpProvider";
import { tokens } from "@/theme/tokens";

type AchievementHighlight = {
  id: string;
  title: string;
  progressText: string;
  percent: number;
};

type CampaignPreviewItem = {
  id: number;
  title: string;
  typeLabel: string;
};

type WritingCampaignDayState = "written" | "missed" | "upcoming" | "pending";

type WritingCampaignDayItem = DailyWritingCampaignProgressStep & {
  calendarState: WritingCampaignDayState;
  isToday: boolean;
  post: WritingEventPost | null;
};

const GUIDED_SCROLL_VISIBLE_TOP = 140;
const GUIDED_SCROLL_VISIBLE_BOTTOM_GAP = 260;
const GUIDED_SCROLL_TARGET_TOP = 260;
const WRITING_EVENT_POST_LIMIT = 30;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getXpPercent(summary: GrowthSummary | null) {
  if (!summary || summary.nextLevelXp <= 0) return 0;
  return clampPercent((summary.currentXp / summary.nextLevelXp) * 100);
}

function getRemainingXp(summary: GrowthSummary | null) {
  if (!summary) return 0;
  return Math.max(0, summary.nextLevelXp - summary.currentXp);
}

function formatCampaignType(value: string) {
  if (value === "daily") return "데일리";
  if (value === "weekly") return "위클리";
  if (value === "season") return "시즌";
  if (value === "event") return "이벤트";
  if (value === "permanent") return "상시";
  return "이벤트";
}

function selectAchievementHighlight(achievements: GrowthAchievement[]): AchievementHighlight | null {
  const inProgress = achievements
    .filter((item) => item.status === "in_progress" && item.target > 0 && item.progress > 0)
    .map((item) => ({
      item,
      percent: clampPercent((item.progress / item.target) * 100),
    }))
    .sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return b.item.progress - a.item.progress;
    });

  const picked =
    inProgress[0]?.item ??
    [...achievements]
      .filter((item) => item.status === "completed")
      .sort((a, b) => (toTimestampMs(b.unlockedAt) || 0) - (toTimestampMs(a.unlockedAt) || 0))[0] ??
    null;

  if (!picked || picked.target <= 0) return null;
  return {
    id: String(picked.id),
    title: picked.name,
    progressText: `${Math.min(picked.progress, picked.target)} / ${picked.target}`,
    percent: clampPercent((picked.progress / picked.target) * 100),
  };
}

function selectCampaignPreview(campaigns: GrowthCampaign[]): CampaignPreviewItem | null {
  const [picked] = campaigns
    .filter(
      (campaign) =>
        campaign.quests.length > 0 &&
        (campaign.campaignType === "event" || campaign.campaignType === "season")
    )
    .map((campaign) => ({
      id: campaign.id,
      title: campaign.name,
      typeLabel: formatCampaignType(campaign.campaignType),
      inProgressCount: campaign.quests.filter((quest) => quest.status === "in_progress").length,
      questCount: campaign.quests.length,
    }))
    .sort((a, b) => b.inProgressCount - a.inProgressCount || b.questCount - a.questCount);

  if (!picked) return null;
  return {
    id: picked.id,
    title: picked.title,
    typeLabel: picked.typeLabel,
  };
}

function buildWritingCampaignDays({
  posts,
  postsLoaded,
  status,
  steps,
}: {
  posts: WritingEventPost[];
  postsLoaded: boolean;
  status: DailyWritingCampaignStatus;
  steps: DailyWritingCampaignProgressStep[];
}): WritingCampaignDayItem[] {
  const postByPromptKey = new Map(posts.map((post) => [post.promptKey, post]));

  return steps.map((step) => {
    const post = postByPromptKey.get(step.key) ?? null;
    const isToday = step.day === status.currentDay;
    let calendarState: WritingCampaignDayState = "upcoming";

    if (post) {
      calendarState = "written";
    } else if (!postsLoaded && step.day <= status.currentDay) {
      calendarState = "pending";
    } else if (step.day <= status.currentDay) {
      calendarState = "missed";
    }

    return {
      ...step,
      calendarState,
      isToday,
      post,
    };
  });
}

export default function GrowthScreen() {
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView | null>(null);
  const { summary, achievements, campaigns, loading, error, refetch } = useGrowthData();
  const [refreshing, setRefreshing] = useState(false);
  const [writingEventPosts, setWritingEventPosts] = useState<WritingEventPost[]>([]);
  const [writingEventPostsLoaded, setWritingEventPostsLoaded] = useState(false);
  const [writingEventPostsLoading, setWritingEventPostsLoading] = useState(false);
  const [writingEventPostsError, setWritingEventPostsError] = useState<string | null>(null);

  const achievementHighlight = useMemo(
    () => selectAchievementHighlight(achievements),
    [achievements]
  );
  const campaignPreview = useMemo(() => selectCampaignPreview(campaigns), [campaigns]);
  const dailyWritingCampaign = useMemo(() => getDailyWritingCampaignStatus(), []);
  const dailyWritingCampaignSteps = useMemo(
    () => getDailyWritingCampaignProgressSteps(dailyWritingCampaign),
    [dailyWritingCampaign]
  );
  const writingCampaignDays = useMemo(
    () =>
      buildWritingCampaignDays({
        posts: writingEventPosts,
        postsLoaded: writingEventPostsLoaded,
        status: dailyWritingCampaign,
        steps: dailyWritingCampaignSteps,
      }),
    [dailyWritingCampaign, dailyWritingCampaignSteps, writingEventPosts, writingEventPostsLoaded]
  );
  const loadWritingEventPosts = useCallback(
    async (silent = false) => {
      if (!silent) setWritingEventPostsLoading(true);
      setWritingEventPostsError(null);
      try {
        const posts = await fetchWritingEventPosts(
          dailyWritingCampaign.campaignKey,
          WRITING_EVENT_POST_LIMIT
        );
        setWritingEventPosts(posts);
        setWritingEventPostsLoaded(true);
      } catch (postsError) {
        setWritingEventPostsLoaded(false);
        setWritingEventPostsError(
          postsError instanceof Error
            ? postsError.message
            : "프로젝트 작성 기록을 불러오지 못했어요."
        );
      } finally {
        if (!silent) setWritingEventPostsLoading(false);
      }
    },
    [dailyWritingCampaign.campaignKey]
  );
  const scrollGuidedTargetIntoView = useCallback<GuidedHelpScrollIntoView>((targetRef) => {
    const scrollView = scrollRef.current;
    const target = targetRef.current;
    if (!scrollView || !target || typeof target.measureLayout !== "function") return;

    const scrollHandle =
      Platform.OS === "web"
        ? ((scrollView as { getScrollableNode?: () => unknown }).getScrollableNode?.() ?? scrollView)
        : findNodeHandle(scrollView);
    if (!scrollHandle) return;

    const scrollToTarget = () => {
      target.measureLayout(
        scrollHandle as Parameters<typeof target.measureLayout>[0],
        (_x, y) => {
          scrollView.scrollTo({ y: Math.max(0, y - GUIDED_SCROLL_TARGET_TOP), animated: true });
        },
        () => undefined
      );
    };

    if (typeof target.measureInWindow !== "function") {
      scrollToTarget();
      return;
    }

    target.measureInWindow((_x, windowY, _width, targetHeight) => {
      const viewportHeight = Dimensions.get("window").height;
      const comfortableBottom = viewportHeight - GUIDED_SCROLL_VISIBLE_BOTTOM_GAP;
      const targetBottom = windowY + targetHeight;
      if (windowY >= GUIDED_SCROLL_VISIBLE_TOP && targetBottom <= comfortableBottom) return;
      scrollToTarget();
    });
  }, []);
  const recordsTarget = useGuidedHelpTarget("growth", "records", {
    scrollIntoView: scrollGuidedTargetIntoView,
  });
  const openDailyWritingPrompt = useCallback(() => {
    trackGrowthTelemetry("growth_action_clicked", { action: "open_daily_writing_prompt" });
    router.push(buildDailyWritingPromptWritePath(dailyWritingCampaign) as never);
  }, [dailyWritingCampaign, router]);
  const openWritingEventPost = useCallback(
    (postId: string) => {
      trackGrowthTelemetry("growth_action_clicked", { action: "open_writing_event_post" });
      router.push(`/posts/${postId}` as never);
    },
    [router]
  );

  useEffect(() => {
    trackGrowthTelemetry("growth_screen_viewed", { screen: "home" });
  }, []);

  useEffect(() => {
    void loadWritingEventPosts();
  }, [loadWritingEventPosts]);

  const onRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    const startedAt = Date.now();
    trackGrowthTelemetry("growth_refresh_started", { screen: "home" });
    setRefreshing(true);
    try {
      await Promise.all([refetch(), loadWritingEventPosts(true)]);
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
  }, [refreshing, loading, refetch, loadWritingEventPosts]);

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
        ref={scrollRef}
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
        <Text style={styles.screenTitle}>성장</Text>

        <ForestCard summary={summary} loading={loading} error={error} />

        <WritingCampaignProjectCard
          status={dailyWritingCampaign}
          days={writingCampaignDays}
          postsLoading={writingEventPostsLoading}
          postsError={writingEventPostsError}
          scrollIntoView={scrollGuidedTargetIntoView}
          onPress={openDailyWritingPrompt}
          onPressPost={openWritingEventPost}
        />

        <Pressable
          {...recordsTarget}
          onPress={() => {
            trackGrowthTelemetry("growth_action_clicked", { action: "open_records" });
            router.push("/growth/records" as never);
          }}
          style={({ pressed }) => [styles.recordButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="성장 기록 보기"
          testID="growth-action-records"
        >
          <Text style={styles.recordButtonText}>기록 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.green700} />
        </Pressable>

        <View style={styles.actionRow}>
          <ActionButton
            title="업적"
            icon="trophy-outline"
            guidedHelpButtonKey="achievements"
            scrollIntoView={scrollGuidedTargetIntoView}
            onPress={() => {
              trackGrowthTelemetry("growth_action_clicked", { action: "open_achievements" });
              router.push("/growth/achievements");
            }}
            testID="growth-action-achievements"
          />
          <ActionButton
            title="퀘스트"
            icon="trail-sign-outline"
            guidedHelpButtonKey="quests"
            scrollIntoView={scrollGuidedTargetIntoView}
            onPress={() => {
              trackGrowthTelemetry("growth_action_clicked", { action: "open_quests" });
              router.push("/growth/quests");
            }}
            testID="growth-action-quests"
          />
        </View>

        {achievementHighlight ? (
          <AchievementCard item={achievementHighlight} />
        ) : null}

        <ReflectionCard summary={summary} />

        {campaignPreview ? (
          <CampaignCard item={campaignPreview} onPress={() => router.push("/growth/quests")} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ForestCard({
  summary,
  loading,
  error,
}: {
  summary: GrowthSummary | null;
  loading: boolean;
  error: ReturnType<typeof useGrowthData>["error"];
}) {
  if (loading && !summary) {
    return (
      <View style={styles.forestCard}>
        <AppLoading message="성장 정보를 불러오는 중..." />
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.forestCard}>
        <AppError error={error} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.forestCard}>
        <AppEmpty
          title="아직 성장 데이터가 없어요"
          description="활동이 쌓이면 여기에 표시돼요."
        />
      </View>
    );
  }

  const remainingXp = getRemainingXp(summary);
  const xpPercent = getXpPercent(summary);

  return (
    <View style={styles.forestCard} testID="growth-forest-card">
      <View style={styles.forestHeader}>
        <Text style={styles.forestEyebrow}>나의 숲</Text>
        <Text style={styles.forestTitle}>천천히 자라고 있어요.</Text>
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.levelText}>Lv. {summary.level}</Text>
        <Text style={styles.levelTitle}>{summary.title || "새싹"}</Text>
      </View>

      <View style={styles.progressBlock}>
        <Text style={styles.progressHint}>다음 레벨까지 {remainingXp} XP</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${xpPercent}%` }]} />
        </View>
      </View>

      {error ? (
        <Text style={styles.subtleNotice}>
          일부 데이터가 최신이 아닐 수 있어요. 아래로 당겨 새로고침해 주세요.
        </Text>
      ) : null}
    </View>
  );
}

function ActionButton({
  title,
  icon,
  guidedHelpButtonKey,
  scrollIntoView,
  onPress,
  testID,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  guidedHelpButtonKey: string;
  scrollIntoView: GuidedHelpScrollIntoView;
  onPress: () => void;
  testID: string;
}) {
  const guidedTarget = useGuidedHelpTarget("growth", guidedHelpButtonKey, {
    scrollIntoView,
  });

  return (
    <Pressable
      {...guidedTarget}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title} 보기`}
      testID={testID}
    >
      <Ionicons name={icon} size={17} color={tokens.colors.green700} />
      <Text style={styles.actionButtonText}>{title}</Text>
    </Pressable>
  );
}

function AchievementCard({ item }: { item: AchievementHighlight }) {
  return (
    <View style={styles.sectionCard} testID="growth-achievement-highlight">
      <Text style={styles.sectionLabel}>가까워진 업적</Text>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressSmallText}>{item.progressText}</Text>
          <Text style={styles.progressSmallText}>{item.percent}%</Text>
        </View>
        <View style={styles.progressTrackSoft}>
          <View style={[styles.progressBarSoft, { width: `${item.percent}%` }]} />
        </View>
      </View>
    </View>
  );
}

function ReflectionCard({ summary }: { summary: GrowthSummary | null }) {
  if (!summary) return null;

  const hasWeeklyPosts = summary.weeklyPosts > 0;
  const title = hasWeeklyPosts
    ? `이번 주 ${summary.weeklyPosts}편의 글이 쌓였어요.`
    : "이번 주는 아직 조용해요.";
  const streakText =
    summary.streakDays > 0 ? `${summary.streakDays}일째 이어지는 중` : "오늘부터 다시 시작";
  const remainingXp = getRemainingXp(summary);

  return (
    <View style={styles.reflectionCard} testID="growth-reflection-card">
      <Text style={styles.sectionLabel}>오늘의 숲</Text>
      <Text style={styles.reflectionTitle}>{title}</Text>
      <Text style={styles.reflectionBody}>
        남기고 싶은 문장부터 천천히 적어도 괜찮아요.
      </Text>
      <View style={styles.reflectionMetaRow}>
        <View style={styles.reflectionPill}>
          <Ionicons name="leaf-outline" size={14} color={tokens.colors.green700} />
          <Text style={styles.reflectionPillText}>{streakText}</Text>
        </View>
        <View style={styles.reflectionPill}>
          <Ionicons name="flag-outline" size={14} color={tokens.colors.green700} />
          <Text style={styles.reflectionPillText}>다음까지 {remainingXp} XP</Text>
        </View>
      </View>
    </View>
  );
}

function WritingCampaignProjectCard({
  status,
  days,
  postsLoading,
  postsError,
  scrollIntoView,
  onPress,
  onPressPost,
}: {
  status: DailyWritingCampaignStatus;
  days: WritingCampaignDayItem[];
  postsLoading: boolean;
  postsError: string | null;
  scrollIntoView: GuidedHelpScrollIntoView;
  onPress: () => void;
  onPressPost: (postId: string) => void;
}) {
  const writePromptTarget = useGuidedHelpTarget("growth", "write-prompt", {
    scrollIntoView,
  });
  const writtenDaysCount = days.filter((day) => day.calendarState === "written").length;
  const writtenCountLabel = postsLoading ? "확인 중" : `작성 ${writtenDaysCount}개`;

  return (
    <View
      style={styles.writingCampaignCard}
      testID="growth-writing-campaign-card"
    >
      <View style={styles.writingCampaignHeader}>
        <View style={styles.writingCampaignHeading}>
          <Text style={styles.sectionLabel}>진행 중인 캠페인</Text>
          <Text style={styles.writingCampaignTitle}>{status.title}</Text>
        </View>
        <View style={styles.writingCampaignBadge}>
          <Text style={styles.writingCampaignBadgeText}>
            {status.prompt.day}/{status.totalDays}
          </Text>
          <Text style={styles.writingCampaignBadgeSubText}>{writtenCountLabel}</Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressSmallText}>프로젝트 진행률</Text>
          <Text style={styles.progressSmallText}>{status.progressPercent}%</Text>
        </View>
        <View style={styles.progressTrackSoft}>
          <View
            style={[
              styles.progressBarSoft,
              status.progressPercent > 0 && styles.progressBarSoftMinimum,
              { width: `${status.progressPercent}%` },
            ]}
          />
        </View>
      </View>

      <WritingCampaignCalendar
        days={days}
        onPressPost={onPressPost}
      />

      <View style={styles.writingCampaignLegend} accessibilityElementsHidden>
        <View style={styles.writingCampaignLegendItem}>
          <View style={[styles.writingCampaignLegendDot, styles.writingCampaignLegendWritten]} />
          <Text style={styles.writingCampaignLegendText}>작성</Text>
        </View>
        <View style={styles.writingCampaignLegendItem}>
          <View style={[styles.writingCampaignLegendDot, styles.writingCampaignLegendMissed]} />
          <Text style={styles.writingCampaignLegendText}>미작성</Text>
        </View>
        <View style={styles.writingCampaignLegendItem}>
          <View style={[styles.writingCampaignLegendDot, styles.writingCampaignLegendUpcoming]} />
          <Text style={styles.writingCampaignLegendText}>예정</Text>
        </View>
      </View>

      {postsError ? (
        <Text style={styles.writingCampaignStatusNotice}>
          작성 기록을 확인하지 못해 지난 날짜를 보류 표시했어요.
        </Text>
      ) : null}

      <View style={styles.writingPromptPreview}>
        <Text style={styles.writingPromptMeta}>
          {status.promptLabel} · {status.prompt.day}일차
        </Text>
        <Text style={styles.writingPromptTitle}>{status.prompt.title}</Text>
        <Text style={styles.writingPromptBody}>{status.prompt.body}</Text>
      </View>

      <View style={styles.writingCampaignFooter}>
        <Text style={styles.writingCampaignHint}>
          남은 주제 {status.remainingDays}개
        </Text>
        <Pressable
          {...writePromptTarget}
          onPress={onPress}
          style={({ pressed }) => [styles.writingCampaignCta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${status.promptLabel} ${status.prompt.day}일차 주제로 글쓰기`}
          testID="growth-writing-campaign-write-btn"
        >
          <Text style={styles.writingCampaignCtaText}>이 주제로 쓰기</Text>
          <Ionicons name="chevron-forward" size={15} color={tokens.colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

function WritingCampaignCalendar({
  days,
  onPressPost,
}: {
  days: WritingCampaignDayItem[];
  onPressPost: (postId: string) => void;
}) {
  return (
    <View
      style={styles.writingCampaignCalendar}
      testID="growth-writing-campaign-calendar"
      accessibilityLabel="30일 글쓰기 프로젝트 달력"
    >
      {days.map((day) => {
        const dayStyle = [
          styles.writingCampaignDay,
          day.calendarState === "written" && styles.writingCampaignDayWritten,
          day.calendarState === "missed" && styles.writingCampaignDayMissed,
          day.calendarState === "upcoming" && styles.writingCampaignDayUpcoming,
          day.calendarState === "pending" && styles.writingCampaignDayPending,
          day.isToday && styles.writingCampaignDayToday,
        ];
        const dayTextStyle = [
          styles.writingCampaignDayText,
          day.calendarState === "written" && styles.writingCampaignDayTextWritten,
          day.calendarState === "missed" && styles.writingCampaignDayTextMissed,
          day.calendarState === "pending" && styles.writingCampaignDayTextPending,
          day.isToday && styles.writingCampaignDayTextToday,
        ];
        const stateLabel =
          day.calendarState === "written"
            ? "작성 완료"
            : day.calendarState === "missed"
              ? "미작성"
              : day.calendarState === "pending"
                ? "확인 중"
                : "예정";
        const label = `${day.day}일차 ${stateLabel}${day.isToday ? ", 오늘" : ""}`;

        if (day.post) {
          return (
            <Pressable
              key={day.key}
              onPress={() => onPressPost(day.post!.id)}
              style={({ pressed }) => [dayStyle, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${label}, 글 상세로 이동`}
              testID={`growth-writing-campaign-day-${day.day}`}
            >
              <Text style={dayTextStyle}>{day.day}</Text>
            </Pressable>
          );
        }

        return (
          <View
            key={day.key}
            style={dayStyle}
            accessibilityLabel={label}
            testID={`growth-writing-campaign-day-${day.day}`}
          >
            <Text style={dayTextStyle}>{day.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CampaignCard({
  item,
  onPress,
}: {
  item: CampaignPreviewItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
      testID="growth-campaign-preview"
      accessibilityRole="button"
      accessibilityLabel={`${item.title} 이벤트 보기`}
    >
      <View style={styles.eventBody}>
        <Text style={styles.sectionLabel}>진행 중인 이벤트</Text>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
      <Text style={styles.eventBadge}>{item.typeLabel}</Text>
    </Pressable>
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
    gap: tokens.space.md as any,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  screenTitle: {
    fontSize: tokens.font.h1,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  forestCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 26,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  forestHeader: {
    gap: 5,
  },
  forestEyebrow: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  forestTitle: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm as any,
  },
  levelText: {
    fontSize: 24,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  levelTitle: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  progressBlock: {
    gap: tokens.space.xs as any,
  },
  progressHint: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  progressTrack: {
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
  subtleNotice: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    color: tokens.colors.textMuted,
  },
  recordButton: {
    minHeight: 46,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordButtonText: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  actionRow: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonText: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  sectionLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textFaint,
  },
  sectionTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  reflectionCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  reflectionTitle: {
    fontSize: tokens.font.body,
    lineHeight: 24,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  reflectionBody: {
    fontSize: tokens.font.small,
    lineHeight: 19,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  reflectionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
    paddingTop: 2,
  },
  reflectionPill: {
    minHeight: 30,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bgMuted,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reflectionPillText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  writingCampaignCard: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 1,
  },
  writingCampaignHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  writingCampaignHeading: {
    flex: 1,
    gap: 4,
  },
  writingCampaignTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: tokens.colors.green900,
    letterSpacing: 0,
  },
  writingCampaignBadge: {
    minHeight: 32,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  writingCampaignBadgeText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingCampaignBadgeSubText: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  writingCampaignCalendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  writingCampaignDay: {
    width: "18.9%",
    aspectRatio: 1.65,
    minHeight: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  writingCampaignDayWritten: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green700,
  },
  writingCampaignDayMissed: {
    borderColor: tokens.colors.danger,
    backgroundColor: tokens.colors.dangerSoft,
  },
  writingCampaignDayUpcoming: {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  writingCampaignDayPending: {
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.bgMuted,
  },
  writingCampaignDayToday: {
    borderWidth: 2,
  },
  writingCampaignDayText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: tokens.colors.textMuted,
  },
  writingCampaignDayTextWritten: {
    color: tokens.colors.textInverse,
  },
  writingCampaignDayTextMissed: {
    color: tokens.colors.danger,
  },
  writingCampaignDayTextPending: {
    color: tokens.colors.textFaint,
  },
  writingCampaignDayTextToday: {
    fontSize: 13,
  },
  writingCampaignLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
    marginTop: -2,
  },
  writingCampaignLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  writingCampaignLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
  },
  writingCampaignLegendWritten: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green700,
  },
  writingCampaignLegendMissed: {
    borderColor: tokens.colors.danger,
    backgroundColor: tokens.colors.dangerSoft,
  },
  writingCampaignLegendUpcoming: {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  writingCampaignLegendText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  writingCampaignStatusNotice: {
    marginTop: -4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingPromptPreview: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
    gap: 5,
  },
  writingPromptMeta: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  writingPromptTitle: {
    fontSize: tokens.font.body,
    lineHeight: 21,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  writingPromptBody: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  writingCampaignFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  writingCampaignHint: {
    flex: 1,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  writingCampaignCta: {
    minHeight: 38,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
    gap: 4,
  },
  writingCampaignCtaText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  progressSmallText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  progressTrackSoft: {
    height: 7,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    overflow: "hidden",
  },
  progressBarSoft: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green600,
  },
  progressBarSoftMinimum: {
    minWidth: 22,
  },
  eventCard: {
    minHeight: 72,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  eventBody: {
    flex: 1,
    gap: 5,
  },
  eventBadge: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  pressed: {
    opacity: 0.84,
  },
});
