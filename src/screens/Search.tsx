import React, { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useFeed } from "@/features/feed/useFeed";
import { tokens } from "@/theme/tokens";

function normalizeText(value?: string | null) {
  return (value || "").toLowerCase().trim();
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { items, loading, error, refresh } = useFeed({ limit: 40, sort: "latest" });

  const normalizedQuery = normalizeText(query);
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((post) => {
      const title = normalizeText(post.title);
      const excerpt = normalizeText(post.excerpt);
      const author = normalizeText(post.author?.name);
      return (
        title.includes(normalizedQuery) ||
        excerpt.includes(normalizedQuery) ||
        author.includes(normalizedQuery)
      );
    });
  }, [items, normalizedQuery]);

  const showLoading = loading && items.length === 0;
  const showError = Boolean(error && items.length === 0);
  const showEmpty = !showLoading && !showError && filteredItems.length === 0;

  return (
    <SafeAreaView style={styles.safe} testID="search-screen">
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="검색 화면 뒤로가기"
          testID="search-back-btn"
        >
          <Ionicons name="arrow-back" size={22} color={tokens.colors.text} />
        </Pressable>

        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={tokens.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="제목, 내용, 작가로 검색"
            placeholderTextColor={tokens.colors.inputPlaceholder}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="글 검색어"
            testID="search-input"
          />
          {query.trim().length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기"
              testID="search-clear-btn"
            >
              <Ionicons name="close-circle" size={18} color={tokens.colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {showLoading ? <AppLoading message="검색 데이터를 불러오는 중..." /> : null}

        {showError ? (
          <AppError
            error={error!}
            onRetry={error?.canRetry ? refresh : undefined}
          />
        ) : null}

        {!showLoading && !showError ? (
          <Text style={styles.countLabel}>
            {normalizedQuery
              ? `'${query.trim()}' 검색 결과 ${filteredItems.length}개`
              : `전체 ${filteredItems.length}개`}
          </Text>
        ) : null}

        {showEmpty ? (
          <AppEmpty
            title="검색 결과가 없어요"
            description="다른 키워드로 다시 찾아보세요."
          />
        ) : null}

        {!showLoading && !showError && filteredItems.length > 0
          ? filteredItems.map((post) => (
              <View key={post.id} style={styles.itemWrap}>
                <FeedCard
                  post={post}
                  onPress={() => router.push(`/posts/${post.id}`)}
                  testID={`search-post-card-${post.id}`}
                />
              </View>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  topBar: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.xs,
    paddingBottom: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 40,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: tokens.colors.text,
    paddingVertical: 8,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
  },
  countLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
    fontWeight: "700",
    marginBottom: tokens.space.sm,
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  itemWrap: {
    marginBottom: tokens.space.md,
  },
});
