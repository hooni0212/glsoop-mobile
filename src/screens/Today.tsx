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
import { typography } from "@/theme/typography";
import { keyboardFocusRingStyle } from "@/theme/accessibility";
import { useKeyboardFocus } from "@/hooks/useKeyboardFocus";
import { FolioHeader } from "@/components/editorial/FolioHeader";

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
        <FolioHeader
          title="글숲"
          titleVariant="brand"
          actions={
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
          }
        />

        <View style={styles.promptSection} testID="today-writing-prompt">
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
              <View style={styles.promptMainRow}>
                <Text style={styles.promptTitle}>
                  {status?.prompt.title ?? "지금 마음에 오래 남아 있는 장면"}
                </Text>
                <Pressable
                  {...writeFocus.focusProps}
                  onPress={startWriting}
                  style={({ pressed }) => [
                    styles.writeLink,
                    pressed && styles.pressed,
                    writeFocus.keyboardFocused && styles.focused,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="오늘의 글감으로 쓰기"
                  testID="today-start-writing"
                >
                  <Text style={styles.writeLinkText}>써보기&nbsp; →</Text>
                </Pressable>
              </View>
              <Text style={styles.promptBody}>
                {status?.prompt.body ?? "잘 쓰려고 애쓰지 말고, 떠오르는 문장부터 천천히 적어보세요."}
              </Text>
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
          <Text style={styles.sectionLabel}>오늘의 한 문장</Text>
          <Pressable
            {...readMoreFocus.focusProps}
            onPress={() => router.push("/(tabs)/explore" as never)}
            hitSlop={10}
            style={readMoreFocus.keyboardFocused && styles.focused}
          >
            <Text style={styles.textButton}>더 읽기</Text>
          </Pressable>
        </View>

        <View style={styles.feedList}>
          {feed.items.slice(0, 1).map((post) => (
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
  content: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 20 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  promptSection: {
    minHeight: 204,
    paddingTop: 26,
    paddingBottom: 24,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderStrong,
  },
  promptMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { ...typography.eyebrow, color: tokens.colors.green700 },
  dayLabel: { ...typography.meta, color: tokens.colors.textMuted },
  promptLoading: { minHeight: 128, alignItems: "center", justifyContent: "center" },
  promptMainRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
  },
  promptTitle: {
    flex: 1,
    maxWidth: 270,
    ...typography.heroQuote,
    color: tokens.colors.text,
  },
  promptBody: {
    ...typography.meta,
    marginTop: 12,
    maxWidth: 300,
    color: tokens.colors.textMuted,
  },
  writeLink: {
    minWidth: 72,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.green700,
  },
  writeLinkText: { ...typography.meta, color: tokens.colors.green700 },
  draftCard: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
    flexDirection: "row",
    alignItems: "center",
  },
  draftIcon: {
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  draftText: { flex: 1, marginHorizontal: 12 },
  draftLabel: { ...typography.eyebrow, color: tokens.colors.green700 },
  draftTitle: { ...typography.uiBody, marginTop: 3, color: tokens.colors.text },
  sectionHeader: {
    minHeight: 46,
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { ...typography.meta, color: tokens.colors.textMuted },
  textButton: { ...typography.meta, color: tokens.colors.green700 },
  feedList: { marginHorizontal: -20 },
  feedLoading: { paddingVertical: 36 },
  emptyReading: { paddingVertical: 32, alignItems: "center", gap: 10 },
  emptyReadingText: { ...typography.uiBody, color: tokens.colors.textMuted },
  pressed: { opacity: 0.72 },
  focused: keyboardFocusRingStyle,
});
