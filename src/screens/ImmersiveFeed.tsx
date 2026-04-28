import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { useFeed, type FeedQuery } from "@/features/feed/useFeed";
import { tokens } from "@/theme/tokens";
import type { Post } from "@/types/post";

const GENRE_META: Record<string, { label: string; query: Partial<FeedQuery> }> = {
  all: { label: "전체", query: {} },
  poem: { label: "시", query: { category: "poem" } },
  essay: { label: "에세이", query: { category: "essay" } },
  short: { label: "짧은글", query: { category: "short" } },
  comfort: { label: "위로", query: { tag: "위로" } },
  dawn: { label: "새벽", query: { tag: "새벽" } },
  relay: { label: "릴레이", query: { tag: "릴레이" } },
};

export default function ImmersiveFeed() {
  const params = useLocalSearchParams<{ genre?: string }>();
  const { height } = useWindowDimensions();
  const genreKey = typeof params.genre === "string" ? params.genre : "all";
  const genre = GENRE_META[genreKey] ?? GENRE_META.all;

  const query = useMemo<FeedQuery>(
    () => ({
      limit: 10,
      sort: "latest",
      ...genre.query,
    }),
    [genre.query]
  );

  const { items, loading, refreshing, error, hasMore, refresh, loadMore } = useFeed(query);
  const pageHeight = Math.max(520, height);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <Ionicons name="close" size={22} color={tokens.colors.text} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.kicker}>IMMERSIVE FEED</Text>
          <Text style={styles.title}>{genre.label} 넘겨보기</Text>
        </View>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      {error && items.length === 0 ? (
        <View style={styles.center}>
          <AppError error={error} onRetry={error.canRetry ? refresh : undefined} />
        </View>
      ) : loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.green700} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <AppEmpty
            title="넘겨볼 글이 없어요"
            description="다른 장르를 선택하거나 새로고침해 보세요."
            primaryAction={{ label: "새로고침", onPress: refresh }}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          refreshing={refreshing}
          onRefresh={refresh}
          onEndReached={() => {
            if (!loading && hasMore) loadMore();
          }}
          onEndReachedThreshold={0.8}
          renderItem={({ item }) => (
            <ImmersiveItem
              post={item}
              height={pageHeight}
              genreLabel={genre.label}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ImmersiveItem({
  post,
  height,
  genreLabel,
}: {
  post: Post;
  height: number;
  genreLabel: string;
}) {
  return (
    <View style={[styles.page, { minHeight: height - 88 }]}>
      <View style={styles.genrePill}>
        <Text style={styles.genrePillText}>{genreLabel}</Text>
      </View>
      <FeedCard
        post={post}
        onPress={() => router.push(`/posts/${post.id}`)}
      />
      <View style={styles.actionRail}>
        <Pressable
          onPress={() => router.push(`/posts/${post.id}`)}
          style={styles.primaryBtn}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>전체 읽기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  topBar: {
    minHeight: 64,
    paddingHorizontal: tokens.space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  titleBlock: {
    alignItems: "center",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.textFaint,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  page: {
    width: "100%",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.md,
  },
  genrePill: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 7,
  },
  genrePillText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  actionRail: {
    width: "100%",
    maxWidth: 357,
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green900,
  },
  primaryBtnText: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
});
