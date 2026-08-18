import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { FeedCard } from "@/components/FeedCard";
import { useFeed } from "@/features/feed/useFeed";
import {
  buildDailyWritingPromptWritePath,
  type DailyWritingCampaignStatus,
} from "@/features/writingCampaign/dailyWritingCampaign";
import { fetchWritingEventStatus } from "@/features/writingCampaign/writingEventPosts";
import { buildAuthRoute } from "@/lib/authRedirect";
import * as haptics from "@/lib/haptics";
import { trackNativeUxEvent } from "@/lib/nativeAnalytics";
import { useBottomDock } from "@/navigation/bottomDock";
import { listWriteDrafts, type WriteDraft } from "@/services/draftStorage";
import {
  clearTodayPromptWidgetSnapshot,
  updateTodayPromptWidgetSnapshot,
} from "@/services/widgetSnapshotService";
import { tokens } from "@/theme/tokens";
import { appFontFamily, typography } from "@/theme/typography";
import { keyboardFocusRingStyle } from "@/theme/accessibility";
import { useKeyboardFocus } from "@/hooks/useKeyboardFocus";

export default function TodayScreen() {
  const { token } = useAuth();
  const dock = useBottomDock();
  const [status, setStatus] = React.useState<DailyWritingCampaignStatus | null>(null);
  const [latestDraft, setLatestDraft] = React.useState<WriteDraft | null>(null);
  const [promptLoading, setPromptLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const feed = useFeed({ limit: 3, sort: "recommended" });
  const notificationFocus = useKeyboardFocus();
  const writeFocus = useKeyboardFocus();
  const draftFocus = useKeyboardFocus();
  const readMoreFocus = useKeyboardFocus();
  const todayLabel = React.useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      }).format(new Date()),
    []
  );

  const loadToday = React.useCallback(async () => {
    const [nextStatus, drafts] = await Promise.all([
      fetchWritingEventStatus().catch(() => null),
      token ? listWriteDrafts() : Promise.resolve([]),
    ]);
    setStatus(nextStatus);
    setLatestDraft(drafts[0] ?? null);
    setPromptLoading(false);

    if (nextStatus) {
      void updateTodayPromptWidgetSnapshot(nextStatus);
      void trackNativeUxEvent("today_prompt_view", {
        pagePath: "/today",
        properties: {
          campaign_key: nextStatus.campaignKey,
          prompt_key: nextStatus.prompt.key,
          prompt_day: nextStatus.prompt.day,
        },
      });
    } else {
      void clearTodayPromptWidgetSnapshot();
    }
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      void loadToday();
    }, [loadToday])
  );

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadToday(), feed.refresh()]);
    setRefreshing(false);
  }, [feed, loadToday]);

  const startWriting = React.useCallback(() => {
    haptics.selection();
    void trackNativeUxEvent("today_prompt_start", {
      pagePath: "/today",
      properties: {
        authenticated: Boolean(token),
        campaign_key: status?.campaignKey,
        prompt_key: status?.prompt.key,
      },
    });
    if (!token) {
      router.push(buildAuthRoute("/(auth)/login", "/write"));
      return;
    }
    if (status) {
      router.push(buildDailyWritingPromptWritePath(status) as never);
      return;
    }
    router.push("/write");
  }, [status, token]);

  const resumeDraft = React.useCallback(() => {
    if (!latestDraft) return;
    haptics.selection();
    void trackNativeUxEvent("draft_resume", {
      pagePath: "/today",
      properties: { entry: "today", has_title: Boolean(latestDraft.title.trim()) },
    });
    router.push({ pathname: "/write", params: { draftId: latestDraft.id } });
  }, [latestDraft]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: dock.tab.height + 30 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRail} accessibilityElementsHidden />
          <View>
            <Text style={styles.brand}>글숲</Text>
            <Text style={styles.headerCopy}>{todayLabel}, 오늘의 한 페이지</Text>
          </View>
          <Pressable
            {...notificationFocus.focusProps}
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
              notificationFocus.keyboardFocused && styles.focused,
            ]}
            accessibilityRole="button"
            accessibilityLabel="알림 열기"
          >
            <Ionicons name="notifications-outline" size={22} color={tokens.colors.text} />
          </Pressable>
        </View>

        <View style={styles.promptCard} testID="today-writing-prompt">
          <View style={styles.bookmarkRail} accessibilityElementsHidden />
          <View style={styles.promptMetaRow}>
            <Text style={styles.eyebrow}>{status?.promptLabel ?? "오늘의 글감"}</Text>
            {status ? (
              <Text style={styles.dayLabel}>{status.prompt.day}일차</Text>
            ) : null}
          </View>

          {promptLoading ? (
            <View style={styles.promptLoading}>
              <ActivityIndicator color={tokens.colors.green700} />
            </View>
          ) : (
            <>
              <Text style={styles.promptTitle}>
                {status?.prompt.title ?? "지금 마음에 오래 남아 있는 장면"}
              </Text>
              <Text style={styles.promptBody}>
                {status?.prompt.body ?? "잘 쓰려고 애쓰지 말고, 떠오르는 문장부터 천천히 적어보세요."}
              </Text>
              <Pressable
                {...writeFocus.focusProps}
                onPress={startWriting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  writeFocus.keyboardFocused && styles.focused,
                ]}
                accessibilityRole="button"
                accessibilityLabel="오늘의 글감으로 쓰기"
                testID="today-start-writing"
              >
                <Text style={styles.primaryButtonText}>5분 쓰기 시작</Text>
                <Ionicons name="arrow-forward" size={18} color={tokens.colors.textInverse} />
              </Pressable>
            </>
          )}
        </View>

        {latestDraft ? (
          <Pressable
            {...draftFocus.focusProps}
            onPress={resumeDraft}
            style={({ pressed }) => [
              styles.draftCard,
              pressed && styles.pressed,
              draftFocus.keyboardFocused && styles.focused,
            ]}
            accessibilityRole="button"
            accessibilityLabel="임시저장 글 이어쓰기"
            testID="today-resume-draft"
          >
            <View style={styles.draftIcon}>
              <Ionicons name="leaf-outline" size={20} color={tokens.colors.green700} />
            </View>
            <View style={styles.draftText}>
              <Text style={styles.draftLabel}>이어 쓰기</Text>
              <Text style={styles.draftTitle} numberOfLines={1}>
                {latestDraft.title.trim() || latestDraft.body.trim() || "제목 없는 글"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.colors.textFaint} />
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>오늘의 문장</Text>
            <Text style={styles.sectionTitle}>천천히 읽어볼 글</Text>
          </View>
          <Pressable
            {...readMoreFocus.focusProps}
            onPress={() => router.push("/(tabs)/explore" as never)}
            hitSlop={10}
            style={readMoreFocus.keyboardFocused && styles.focused}
          >
            <Text style={styles.textButton}>더 읽어보기</Text>
          </Pressable>
        </View>

        <View style={styles.feedList}>
          {feed.items.slice(0, 2).map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              onPress={() => router.push(`/posts/${post.id}`)}
            />
          ))}
          {feed.loading && feed.items.length === 0 ? (
            <ActivityIndicator style={styles.feedLoading} color={tokens.colors.green700} />
          ) : null}
          {!feed.loading && feed.items.length === 0 ? (
            <View style={styles.emptyReading}>
              <Text style={styles.emptyReadingText}>새 문장을 고르고 있어요.</Text>
              <Pressable onPress={feed.refresh} hitSlop={10}>
                <Text style={styles.textButton}>다시 불러오기</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 22 },
  header: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    position: "relative",
  },
  headerRail: {
    position: "absolute",
    left: 0,
    top: 23,
    bottom: 21,
    width: 2,
    borderRadius: 1,
    backgroundColor: tokens.colors.green700,
  },
  brand: { ...typography.brand, color: tokens.colors.green900 },
  headerCopy: { ...typography.eyebrow, marginTop: 1, color: tokens.colors.textMuted },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  promptCard: {
    minHeight: 292,
    paddingVertical: 26,
    paddingHorizontal: 28,
    paddingLeft: 34,
    borderRadius: 4,
    backgroundColor: tokens.colors.paper,
    borderWidth: 1,
    borderColor: tokens.colors.paperBorder,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  bookmarkRail: {
    position: "absolute",
    left: 0,
    top: 28,
    width: 5,
    height: 78,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 8,
    backgroundColor: tokens.colors.green700,
  },
  promptMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { ...typography.eyebrow, color: tokens.colors.green700 },
  dayLabel: { ...typography.meta, color: tokens.colors.textMuted },
  promptLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  promptTitle: {
    marginTop: 28,
    fontSize: 24,
    lineHeight: 38,
    fontFamily: appFontFamily.editorialStrong,
    color: tokens.colors.text,
  },
  promptBody: { ...typography.uiBody, marginTop: 14, lineHeight: 25, color: tokens.colors.textMuted },
  primaryButton: {
    marginTop: 26,
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 3,
    backgroundColor: tokens.colors.green700,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryButtonText: { ...typography.action, color: tokens.colors.textInverse },
  draftCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 4,
    backgroundColor: tokens.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
  },
  draftIcon: {
    width: 38,
    height: 38,
    borderRadius: 4,
    backgroundColor: tokens.colors.green050,
    alignItems: "center",
    justifyContent: "center",
  },
  draftText: { flex: 1, marginHorizontal: 12 },
  draftLabel: { ...typography.eyebrow, color: tokens.colors.green700 },
  draftTitle: { ...typography.uiBody, marginTop: 3, color: tokens.colors.text },
  sectionHeader: {
    marginTop: 34,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionEyebrow: { ...typography.eyebrow, color: tokens.colors.green700 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 3, fontSize: 20, lineHeight: 30, color: tokens.colors.text },
  textButton: { ...typography.meta, color: tokens.colors.green700 },
  feedList: { gap: 26 },
  feedLoading: { paddingVertical: 36 },
  emptyReading: { paddingVertical: 32, alignItems: "center", gap: 10 },
  emptyReadingText: { ...typography.uiBody, color: tokens.colors.textMuted },
  pressed: { opacity: 0.72 },
  focused: keyboardFocusRingStyle,
});
