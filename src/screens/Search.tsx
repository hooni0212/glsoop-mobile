import React, { useEffect, useState } from "react";
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
import { useSearch, type SearchAuthor } from "@/features/search/useSearch";
import { tokens } from "@/theme/tokens";

type SearchTabKey = "posts" | "authors";

function formatDateLabel(iso?: string | null) {
  if (!iso) return "최근 글 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "최근 글 없음";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTabKey>("posts");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const { posts, authors, loading, error, refetch } = useSearch(debouncedQuery);
  const hasQuery = debouncedQuery.length > 0;
  const activeCount = activeTab === "posts" ? posts.length : authors.length;

  const showPrompt = !hasQuery && !loading;
  const showLoading = hasQuery && loading;
  const showError = hasQuery && Boolean(error);
  const showEmpty = hasQuery && !loading && !error && activeCount === 0;

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
              onPress={() => {
                setQuery("");
                setDebouncedQuery("");
              }}
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

      <View style={styles.tabRow}>
        <SearchTabButton
          label={`글 ${posts.length}`}
          active={activeTab === "posts"}
          onPress={() => setActiveTab("posts")}
          testID="search-tab-posts"
        />
        <SearchTabButton
          label={`작가 ${authors.length}`}
          active={activeTab === "authors"}
          onPress={() => setActiveTab("authors")}
          testID="search-tab-authors"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {showPrompt ? (
          <AppEmpty
            title="검색어를 입력해보세요"
            description="글과 작가를 분리해서 찾아볼 수 있어요."
          />
        ) : null}

        {showLoading ? <AppLoading message="검색 결과를 불러오는 중..." /> : null}

        {showError ? (
          <AppError
            error={error!}
            onRetry={error?.canRetry ? refetch : undefined}
          />
        ) : null}

        {hasQuery && !showLoading && !showError ? (
          <Text style={styles.countLabel}>
            {`'${debouncedQuery}' 검색 결과 ${activeCount}개`}
          </Text>
        ) : null}

        {showEmpty ? (
          <AppEmpty
            title="검색 결과가 없어요"
            description="다른 키워드로 다시 찾아보세요."
          />
        ) : null}

        {hasQuery && !showLoading && !showError && activeTab === "posts" && posts.length > 0
          ? posts.map((post) => (
              <View key={post.id} style={styles.itemWrap}>
                <FeedCard
                  post={post}
                  onPress={() => router.push(`/posts/${post.id}`)}
                  testID={`search-post-card-${post.id}`}
                />
              </View>
            ))
          : null}

        {hasQuery && !showLoading && !showError && activeTab === "authors" && authors.length > 0
          ? authors.map((author) => (
              <AuthorResultCard key={author.id} author={author} />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SearchTabButton({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Text style={[styles.tabButtonLabel, active && styles.tabButtonLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AuthorResultCard({ author }: { author: SearchAuthor }) {
  return (
    <Pressable
      style={styles.authorCard}
      onPress={() => router.push(`/users/${author.id}`)}
      testID={`search-author-card-${author.id}`}
    >
      <Text style={styles.authorName}>{author.name}</Text>
      {author.nickname ? <Text style={styles.authorNickname}>@{author.nickname}</Text> : null}
      <View style={styles.authorMetaRow}>
        <Text style={styles.authorMetaText}>글 {author.postCount}</Text>
        <Text style={styles.authorMetaDot}>·</Text>
        <Text style={styles.authorMetaText}>팔로워 {author.followerCount}</Text>
      </View>
      <Text style={styles.authorLatestLabel}>
        최근 글 {formatDateLabel(author.latestPostAt)}
      </Text>
    </Pressable>
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
  tabRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
  },
  tabButtonActive: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
  },
  tabButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  tabButtonLabelActive: {
    color: tokens.colors.green900,
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
  authorCard: {
    marginBottom: tokens.space.md,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: 8,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  authorNickname: {
    marginTop: -4,
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.textMuted,
  },
  authorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authorMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  authorMetaDot: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textFaint,
  },
  authorLatestLabel: {
    fontSize: 12,
    color: tokens.colors.textFaint,
    fontWeight: "600",
  },
});
