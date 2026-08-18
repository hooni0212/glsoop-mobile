import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { MeResponse } from "@/features/me/accountCenter";
import { useAuthorPosts } from "@/features/users/useAuthorPosts";
import { apiGet } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { trackNativeUxEvent } from "@/lib/nativeAnalytics";
import { useBottomDock } from "@/navigation/bottomDock";
import { listWriteDrafts, type WriteDraft } from "@/services/draftStorage";
import { tokens } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { keyboardFocusRingStyle } from "@/theme/accessibility";
import { useKeyboardFocus } from "@/hooks/useKeyboardFocus";

export default function BookScreen() {
  const dock = useBottomDock();
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [drafts, setDrafts] = React.useState<WriteDraft[]>([]);
  const [loadingMe, setLoadingMe] = React.useState(true);
  const [meError, setMeError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const posts = useAuthorPosts(me?.id ? String(me.id) : undefined, "newest");

  const loadBook = React.useCallback(async () => {
    setLoadingMe(true);
    setMeError(null);
    try {
      const [nextMe, nextDrafts] = await Promise.all([
        apiGet<MeResponse>("/api/me"),
        listWriteDrafts(),
      ]);
      setMe(nextMe);
      setDrafts(nextDrafts);
    } catch (error) {
      setMeError(normalizeApiError(error));
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadBook();
      void trackNativeUxEvent("book_view", { pagePath: "/book" });
    }, [loadBook])
  );

  if (loadingMe && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><AppLoading message="나의 문집을 펼치는 중..." /></View>
      </SafeAreaView>
    );
  }

  if (meError && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppError error={meError} onRetry={meError.canRetry ? loadBook : undefined} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: dock.tab.height + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRail} accessibilityElementsHidden />
          <Text style={styles.eyebrow}>나의 글이 머무는 곳</Text>
          <Text style={styles.title}>문집</Text>
          <Text style={styles.description}>
            쓰다 만 문장부터 완성한 글까지, 시간이 쌓인 모습을 한곳에서 봅니다.
          </Text>
        </View>

        <View style={styles.summary}>
          <SummaryCell value={posts.items.length} label="쓴 글" />
          <View style={styles.summaryDivider} />
          <SummaryCell value={drafts.length} label="쓰는 중" />
          <View style={styles.summaryDivider} />
          <SummaryCell value={me?.streak_days ?? 0} label="이어 쓴 날" />
        </View>

        <View style={styles.actionGrid}>
          <BookAction
            icon="document-text-outline"
            title="임시저장"
            description={drafts.length > 0 ? `${drafts.length}편을 이어 쓸 수 있어요` : "새 글을 시작해 보세요"}
            onPress={() => router.push(drafts.length > 0 ? "/write-drafts" : "/write")}
          />
          <BookAction
            icon="bookmark-outline"
            title="모아둔 문장"
            description="다시 읽고 싶은 글과 문장"
            onPress={() => router.push("/(tabs)/bookmarks")}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근에 쓴 글</Text>
          <Pressable onPress={() => router.push("/(tabs)/me")} hitSlop={10}>
            <Text style={styles.textButton}>전체 보기</Text>
          </Pressable>
        </View>

        {posts.loading && posts.items.length === 0 ? <AppLoading message="글을 정리하는 중..." /> : null}
        {posts.error && posts.items.length === 0 ? (
          <AppError error={posts.error} onRetry={posts.error.canRetry ? posts.refresh : undefined} />
        ) : null}
        {!posts.loading && !posts.error && posts.items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={28} color={tokens.colors.green700} />
            <Text style={styles.emptyTitle}>첫 페이지가 비어 있어요</Text>
            <Text style={styles.emptyCopy}>오늘의 글감으로 한 문장을 남기면 문집이 시작돼요.</Text>
            <Pressable onPress={() => router.push("/write")} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>첫 글 쓰기</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.postList}>
          {posts.items.slice(0, 6).map((post, index) => (
            <Pressable
              key={post.id}
              onPress={() => router.push(`/posts/${post.id}`)}
              style={({ pressed }) => [styles.postRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`글 열기: ${post.title || "제목 없는 글"}`}
            >
              <Text style={styles.postNumber}>{String(index + 1).padStart(2, "0")}</Text>
              <View style={styles.postText}>
                <Text style={styles.postTitle} numberOfLines={1}>{post.title || "제목 없는 글"}</Text>
                <Text style={styles.postExcerpt} numberOfLines={2}>{post.excerpt || "작성한 문장을 다시 읽어보세요."}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={tokens.colors.textFaint} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/growth")}
          style={({ pressed }) => [styles.growthLink, pressed && styles.pressed]}
        >
          <Ionicons name="calendar-outline" size={20} color={tokens.colors.green700} />
          <View style={styles.growthText}>
            <Text style={styles.growthTitle}>나의 글쓰기 기록</Text>
            <Text style={styles.growthCopy}>달력과 이어 쓴 날을 확인해요</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={tokens.colors.textFaint} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function BookAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  onPress: () => void;
}) {
  const focus = useKeyboardFocus();

  return (
    <Pressable
      {...focus.focusProps}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.pressed,
        focus.keyboardFocused && styles.focused,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
    >
      <Ionicons name={icon} size={22} color={tokens.colors.green700} />
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 22 },
  header: { paddingTop: 28, paddingBottom: 26, paddingLeft: 16, position: "relative" },
  headerRail: {
    position: "absolute",
    left: 0,
    top: 31,
    bottom: 29,
    width: 2,
    borderRadius: 1,
    backgroundColor: tokens.colors.green700,
  },
  eyebrow: { ...typography.eyebrow, color: tokens.colors.green700 },
  title: { ...typography.pageTitle, marginTop: 5, fontSize: 30, lineHeight: 41, color: tokens.colors.green900 },
  description: { ...typography.uiBody, marginTop: 8, maxWidth: 340, color: tokens.colors.textMuted },
  summary: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.colors.divider,
  },
  summaryCell: { flex: 1, alignItems: "center" },
  summaryValue: { ...typography.sectionTitle, fontSize: 21, lineHeight: 29, color: tokens.colors.text },
  summaryLabel: { ...typography.eyebrow, marginTop: 2, color: tokens.colors.textMuted },
  summaryDivider: { width: 1, height: 32, backgroundColor: tokens.colors.divider },
  actionGrid: { flexDirection: "row", gap: 10, marginTop: 22 },
  actionCard: {
    flex: 1,
    minHeight: 136,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  actionTitle: { ...typography.sectionTitle, marginTop: 16, color: tokens.colors.text },
  actionDescription: { ...typography.meta, marginTop: 5, color: tokens.colors.textMuted },
  sectionHeader: {
    marginTop: 34,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { ...typography.sectionTitle, fontSize: 19, lineHeight: 28, color: tokens.colors.text },
  textButton: { ...typography.meta, color: tokens.colors.green700 },
  empty: { alignItems: "center", paddingVertical: 34, paddingHorizontal: 20 },
  emptyTitle: { ...typography.sectionTitle, marginTop: 12, fontSize: 17, color: tokens.colors.text },
  emptyCopy: { ...typography.meta, marginTop: 6, lineHeight: 20, textAlign: "center", color: tokens.colors.textMuted },
  emptyButton: { marginTop: 18, paddingVertical: 11, paddingHorizontal: 20, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.green700 },
  emptyButtonText: { ...typography.action, color: tokens.colors.textInverse },
  postList: { borderTopWidth: 1, borderColor: tokens.colors.divider },
  postRow: { minHeight: 92, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: tokens.colors.divider },
  postNumber: { ...typography.meta, width: 34, color: tokens.colors.textFaint },
  postText: { flex: 1, paddingVertical: 14, paddingRight: 10 },
  postTitle: { ...typography.sectionTitle, color: tokens.colors.text },
  postExcerpt: { ...typography.meta, marginTop: 5, color: tokens.colors.textMuted },
  growthLink: { marginTop: 24, padding: 17, flexDirection: "row", alignItems: "center", borderRadius: 4, backgroundColor: tokens.colors.green050 },
  growthText: { flex: 1, marginHorizontal: 12 },
  growthTitle: { ...typography.action, color: tokens.colors.text },
  growthCopy: { ...typography.meta, marginTop: 3, color: tokens.colors.textMuted },
  pressed: { opacity: 0.7 },
  focused: keyboardFocusRingStyle,
});
