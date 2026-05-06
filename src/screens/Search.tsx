import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { SafetyActionSheet } from "@/components/safety/SafetyActionSheet";
import { SafetyReasonModal } from "@/components/safety/SafetyReasonModal";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useSearch, type SearchAuthor } from "@/features/search/useSearch";
import { useRuntimeLegalConfig } from "@/hooks/useRuntimeLegalConfig";
import { clearRecentSearches, listRecentSearches, saveRecentSearch } from "@/services/searchHistory";
import { blockUserById, pickSafetyReasons, reportPost } from "@/services/safetyService";
import { tokens } from "@/theme/tokens";
import { formatKstDateDot, toTimestampMs } from "@/lib/dateTime";
import { blurActiveElementBeforeRouteChange } from "@/lib/webFocus";
import { getLegalDocumentUrl, getSupportUrl } from "@/config/release";
import { openExternalUrl } from "@/lib/externalLinks";
import { ApiError } from "@/lib/errors";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/feedback/ToastProvider";
import { softPanelShadowStyle } from "@/theme/shadows";
import {
  filterBlockedAuthors,
  filterBlockedPosts,
  useBlockedUserIds,
} from "@/features/safety/blockedUsersStore";
import { resolveRuntimeLegalDocumentUrl } from "@/services/runtimeConfigService";
import type { Post } from "@/types/post";

type SearchTabKey = "posts" | "authors";
type PostSortKey = "popular" | "latest";
type AuthorSortKey = "activity" | "recent";

export default function SearchScreen() {
  const { token, signOut } = useAuth();
  const { showToast } = useToast();
  const { config: runtimeLegalConfig } = useRuntimeLegalConfig();
  const blockedUserIds = useBlockedUserIds();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTabKey>("posts");
  const [manualTabSelection, setManualTabSelection] = useState(false);
  const [postSort, setPostSort] = useState<PostSortKey>("popular");
  const [authorSort, setAuthorSort] = useState<AuthorSortKey>("activity");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedSafetyPost, setSelectedSafetyPost] = useState<Post | null>(null);
  const [safetyMenuVisible, setSafetyMenuVisible] = useState(false);
  const [reportReasonVisible, setReportReasonVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const loadRecentSearches = useCallback(async () => {
    const history = await listRecentSearches();
    setRecentSearches(history);
  }, []);

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  const commitRecentQuery = useCallback(async (value: string) => {
    const history = await saveRecentSearch(value);
    setRecentSearches(history);
  }, []);

  const handleSubmitQuery = useCallback(() => {
    const normalized = query.trim();
    if (!normalized) return;

    setQuery(normalized);
    setDebouncedQuery(normalized);
    setActiveTab("posts");
    setManualTabSelection(false);
    void commitRecentQuery(normalized);
  }, [commitRecentQuery, query]);

  const handlePressRecent = useCallback((value: string) => {
    setQuery(value);
    setDebouncedQuery(value);
    setActiveTab("posts");
    setManualTabSelection(false);
  }, []);

  const handleClearRecent = useCallback(async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const {
    posts,
    authors,
    loading,
    loadingMore,
    hasMorePosts,
    hasMoreAuthors,
    error,
    refetch,
    loadMore,
  } = useSearch(debouncedQuery);
  const hasQuery = debouncedQuery.length > 0;
  const postSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "post");
  const userSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "user");
  const reportDetailMaxLength = runtimeLegalConfig?.safety.detailMaxLength;
  const reportDetailRequiredReasonCodes = runtimeLegalConfig?.safety.detailRequiredReasonCodes;
  const legalGuidelinesUrl = resolveRuntimeLegalDocumentUrl(
    runtimeLegalConfig,
    "guidelines",
    getLegalDocumentUrl("guidelines")
  );

  const displayPosts = useMemo(() => {
    const next = [...posts];
    if (postSort === "latest") {
      next.sort((a, b) => {
        const at = toTimestampMs(a.createdAt) || 0;
        const bt = toTimestampMs(b.createdAt) || 0;
        return bt - at;
      });
      return next;
    }

    next.sort((a, b) => {
      const likeDiff = (b.stats?.likeCount ?? 0) - (a.stats?.likeCount ?? 0);
      if (likeDiff !== 0) return likeDiff;
      const bookmarkDiff = (b.stats?.bookmarkCount ?? 0) - (a.stats?.bookmarkCount ?? 0);
      if (bookmarkDiff !== 0) return bookmarkDiff;
      const at = toTimestampMs(a.createdAt) || 0;
      const bt = toTimestampMs(b.createdAt) || 0;
      return bt - at;
    });
    return next;
  }, [posts, postSort]);
  const visiblePosts = useMemo(
    () => filterBlockedPosts(displayPosts, blockedUserIds),
    [blockedUserIds, displayPosts]
  );

  const displayAuthors = useMemo(() => {
    const next = [...authors];
    if (authorSort === "recent") {
      next.sort((a, b) => {
        const at = toTimestampMs(a.latestPostAt) || 0;
        const bt = toTimestampMs(b.latestPostAt) || 0;
        return bt - at;
      });
      return next;
    }

    next.sort((a, b) => {
      const postDiff = b.postCount - a.postCount;
      if (postDiff !== 0) return postDiff;
      const followerDiff = b.followerCount - a.followerCount;
      if (followerDiff !== 0) return followerDiff;
      const at = toTimestampMs(a.latestPostAt) || 0;
      const bt = toTimestampMs(b.latestPostAt) || 0;
      return bt - at;
    });
    return next;
  }, [authors, authorSort]);
  const visibleAuthors = useMemo(
    () => filterBlockedAuthors(displayAuthors, blockedUserIds),
    [blockedUserIds, displayAuthors]
  );

  const activeCount = activeTab === "posts" ? visiblePosts.length : visibleAuthors.length;
  const activeHasMore = activeTab === "posts" ? hasMorePosts : hasMoreAuthors;

  useEffect(() => {
    if (!hasQuery || loading || error || manualTabSelection) return;

    if (activeTab === "posts" && visiblePosts.length === 0 && visibleAuthors.length > 0) {
      setActiveTab("authors");
      return;
    }

    if (activeTab === "authors" && visibleAuthors.length === 0 && visiblePosts.length > 0) {
      setActiveTab("posts");
    }
  }, [activeTab, error, hasQuery, loading, manualTabSelection, visibleAuthors.length, visiblePosts.length]);

  useEffect(() => {
    setManualTabSelection(false);
  }, [debouncedQuery]);

  const promptAuthForAction = useCallback(
    (message: string) => {
      showToast(message, { tone: "error" });
      router.push(buildAuthRoute("/(auth)/login", "/search"));
    },
    [showToast]
  );

  const handleAuthError = useCallback(async () => {
    await signOut();
    promptAuthForAction("로그인 상태가 만료되었어요. 다시 로그인하면 이어서 사용할 수 있어요.");
  }, [promptAuthForAction, signOut]);

  const handleOpenGuidelines = useCallback(() => {
    void openExternalUrl(legalGuidelinesUrl).catch(() => {
      showToast("커뮤니티 가이드라인을 열지 못했어요. 잠시 후 다시 시도해주세요.", {
        tone: "error",
      });
    });
  }, [legalGuidelinesUrl, showToast]);

  const handleOpenSupport = useCallback(() => {
    void openExternalUrl(getSupportUrl()).catch(() => {
      showToast("지원 페이지를 열지 못했어요. 잠시 후 다시 시도해주세요.", {
        tone: "error",
      });
    });
  }, [showToast]);

  const submitPostReport = useCallback(
    async (reasonCode: string, detail?: string) => {
      if (!token) {
        promptAuthForAction("신고는 로그인한 회원만 할 수 있어요.");
        return;
      }
      if (!selectedSafetyPost?.id) return;

      setReportSubmitting(true);
      try {
        const result = await reportPost({
          postId: selectedSafetyPost.id,
          reasonCode,
          detail,
        });
        setReportReasonVisible(false);
        showToast(result.message, { tone: "success" });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await handleAuthError();
          return;
        }
        showToast(
          err instanceof Error ? err.message : "신고를 접수하지 못했어요. 잠시 후 다시 시도해주세요.",
          { tone: "error" }
        );
      } finally {
        setReportSubmitting(false);
      }
    },
    [handleAuthError, promptAuthForAction, selectedSafetyPost?.id, showToast, token]
  );

  const submitBlockAuthor = useCallback(async () => {
    if (!selectedSafetyPost?.author?.id) return;
    if (!token) {
      promptAuthForAction("차단은 로그인한 회원만 할 수 있어요.");
      return;
    }

    setBlockSubmitting(true);
    try {
      const result = await blockUserById({
        userId: selectedSafetyPost.author.id,
        reasonCode: userSafetyReasons[0]?.code || "harassment",
        contextPostId: selectedSafetyPost.id,
      });
      setBlockConfirmVisible(false);
      setSafetyMenuVisible(false);
      showToast(result.message, { tone: "success" });
      await refetch();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
        return;
      }
      showToast(
        err instanceof Error ? err.message : "차단 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    } finally {
      setBlockSubmitting(false);
    }
  }, [
    handleAuthError,
    promptAuthForAction,
    refetch,
    selectedSafetyPost,
    showToast,
    token,
    userSafetyReasons,
  ]);

  const showRecent = !hasQuery && !loading && recentSearches.length > 0;
  const showPrompt = !hasQuery && !loading && recentSearches.length === 0;
  const showLoading = hasQuery && loading;
  const showError = hasQuery && Boolean(error) && posts.length === 0 && authors.length === 0;
  const showEmpty = hasQuery && !loading && !error && activeCount === 0;

  return (
    <SafeAreaView style={styles.safe} testID="search-screen">
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            blurActiveElementBeforeRouteChange();
            router.back();
          }}
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
            onSubmitEditing={handleSubmitQuery}
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
          onPress={() => {
            setManualTabSelection(true);
            setActiveTab("posts");
          }}
          testID="search-tab-posts"
        />
        <SearchTabButton
          label={`작가 ${authors.length}`}
          active={activeTab === "authors"}
          onPress={() => {
            setManualTabSelection(true);
            setActiveTab("authors");
          }}
          testID="search-tab-authors"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {showRecent ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>최근 검색어</Text>
              <Pressable onPress={handleClearRecent} hitSlop={10} testID="search-clear-history-btn">
                <Text style={styles.recentClearText}>전체 삭제</Text>
              </Pressable>
            </View>

            <View style={styles.recentChipWrap}>
              {recentSearches.map((keyword) => (
                <Pressable
                  key={keyword}
                  style={styles.recentChip}
                  onPress={() => handlePressRecent(keyword)}
                  testID={`search-recent-chip-${keyword}`}
                >
                  <Ionicons name="time-outline" size={14} color={tokens.colors.textMuted} />
                  <Text style={styles.recentChipText} numberOfLines={1}>
                    {keyword}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

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

        {hasQuery && !showLoading && !showError ? (
          <View style={styles.sortRow}>
            {activeTab === "posts" ? (
              <>
                <SortChip
                  label="추천순"
                  active={postSort === "popular"}
                  onPress={() => setPostSort("popular")}
                  testID="search-sort-posts-popular"
                />
                <SortChip
                  label="최신순"
                  active={postSort === "latest"}
                  onPress={() => setPostSort("latest")}
                  testID="search-sort-posts-latest"
                />
              </>
            ) : (
              <>
                <SortChip
                  label="활동순"
                  active={authorSort === "activity"}
                  onPress={() => setAuthorSort("activity")}
                  testID="search-sort-authors-activity"
                />
                <SortChip
                  label="최근순"
                  active={authorSort === "recent"}
                  onPress={() => setAuthorSort("recent")}
                  testID="search-sort-authors-recent"
                />
              </>
            )}
          </View>
        ) : null}

        {showEmpty ? (
          <AppEmpty
            title="검색 결과가 없어요"
            description="다른 키워드로 다시 찾아보세요."
          />
        ) : null}

        {hasQuery && !showLoading && !showError && activeTab === "posts" && visiblePosts.length > 0
          ? visiblePosts.map((post) => (
              <View key={post.id} style={styles.itemWrap}>
                <FeedCard
                  post={post}
                  onPress={() => {
                    blurActiveElementBeforeRouteChange();
                    void commitRecentQuery(debouncedQuery);
                    router.push(`/posts/${post.id}`);
                  }}
                  testID={`search-post-card-${post.id}`}
                  onMorePress={() => {
                    setSelectedSafetyPost(post);
                    setSafetyMenuVisible(true);
                  }}
                  moreTestID={`search-post-more-btn-${post.id}`}
                />
              </View>
            ))
          : null}

        {hasQuery && !showLoading && !showError && activeTab === "authors" && visibleAuthors.length > 0
          ? visibleAuthors.map((author) => (
              <AuthorResultCard
                key={author.id}
                author={author}
                onPress={() => {
                  blurActiveElementBeforeRouteChange();
                  void commitRecentQuery(debouncedQuery);
                  router.push(`/users/${author.id}`);
                }}
              />
            ))
          : null}

        {hasQuery && !showLoading && !showError && activeCount > 0 && activeHasMore ? (
          <Pressable
            onPress={() => void loadMore(activeTab)}
            disabled={loadingMore}
            style={[styles.loadMoreButton, loadingMore && styles.loadMoreButtonDisabled]}
            testID="search-load-more-btn"
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={tokens.colors.textMuted} />
            ) : (
              <Text style={styles.loadMoreText}>더 보기</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      <SafetyActionSheet
        visible={safetyMenuVisible}
        title="게시글 안전 메뉴"
        description="신고, 차단, 가이드라인을 확인할 수 있어요."
        onRequestClose={() => setSafetyMenuVisible(false)}
        actions={[
          {
            label: "게시글 신고",
            onPress: () => {
              setSafetyMenuVisible(false);
              setReportReasonVisible(true);
            },
            testID: "search-post-report-btn",
          },
          {
            label: "작성자 차단",
            variant: "danger",
            onPress: () => {
              setSafetyMenuVisible(false);
              setBlockConfirmVisible(true);
            },
            testID: "search-post-block-btn",
          },
          {
            label: "커뮤니티 가이드라인",
            variant: "ghost",
            onPress: () => {
              setSafetyMenuVisible(false);
              handleOpenGuidelines();
            },
          },
          {
            label: "도움말 및 지원",
            variant: "ghost",
            onPress: () => {
              setSafetyMenuVisible(false);
              handleOpenSupport();
            },
          },
          {
            label: "닫기",
            variant: "ghost",
            onPress: () => setSafetyMenuVisible(false),
          },
        ]}
      />

      <SafetyActionSheet
        visible={blockConfirmVisible}
        title="작성자 차단"
        description={`${selectedSafetyPost?.author?.name || "이 사용자"}님의 글과 프로필을 숨길까요?`}
        onRequestClose={() => {
          if (blockSubmitting) return;
          setBlockConfirmVisible(false);
        }}
        actions={[
          {
            label: blockSubmitting ? "차단 처리 중..." : "차단하기",
            variant: "danger",
            disabled: blockSubmitting,
            onPress: () => {
              if (blockSubmitting) return;
              void submitBlockAuthor();
            },
            testID: "search-post-block-confirm-btn",
          },
          {
            label: "취소",
            variant: "ghost",
            disabled: blockSubmitting,
            onPress: () => setBlockConfirmVisible(false),
          },
        ]}
      />

      <SafetyReasonModal
        visible={reportReasonVisible}
        title="게시글 신고"
        description="접수된 신고는 운영 기준에 따라 검토돼요."
        reasons={postSafetyReasons}
        detailMaxLength={reportDetailMaxLength}
        detailRequiredReasonCodes={reportDetailRequiredReasonCodes}
        submitLabel="신고하기"
        submitting={reportSubmitting}
        onClose={() => {
          if (reportSubmitting) return;
          setReportReasonVisible(false);
        }}
        onSubmit={({ reasonCode, detail }) => submitPostReport(reasonCode, detail)}
      />
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
      style={({ pressed }) => [
        styles.tabButton,
        active && styles.tabButtonActive,
        pressed && styles.controlPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      testID={testID}
    >
      <Text style={[styles.tabButtonLabel, active && styles.tabButtonLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SortChip({
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
      style={({ pressed }) => [
        styles.sortChip,
        active && styles.sortChipActive,
        pressed && styles.controlPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={testID}
    >
      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AuthorResultCard({
  author,
  onPress,
}: {
  author: SearchAuthor;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.authorCard, pressed && styles.authorCardPressed]}
      onPress={onPress}
      testID={`search-author-card-${author.id}`}
      accessibilityRole="button"
      accessibilityLabel={`작가 프로필 열기: ${author.name}`}
    >
      <View style={styles.authorAvatar}>
        <Ionicons name="person-outline" size={18} color={tokens.colors.green700} />
      </View>
      <View style={styles.authorCopy}>
        <Text style={styles.authorName} numberOfLines={1}>
          {author.name}
        </Text>
        {author.nickname ? <Text style={styles.authorNickname}>@{author.nickname}</Text> : null}
        <View style={styles.authorMetaRow}>
          <Text style={styles.authorMetaText}>글 {author.postCount}</Text>
          <Text style={styles.authorMetaDot}>·</Text>
          <Text style={styles.authorMetaText}>팔로워 {author.followerCount}</Text>
        </View>
        <Text style={styles.authorLatestLabel}>
          최근 글 {formatKstDateDot(author.latestPostAt) || "최근 글 없음"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tokens.colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  topBar: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: tokens.space.xs,
    paddingBottom: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 46,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    ...softPanelShadowStyle,
  },
  tabRow: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    flexDirection: "row",
    gap: tokens.space.sm,
    paddingHorizontal: 24,
    paddingBottom: tokens.space.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
  },
  controlPressed: {
    opacity: 0.82,
  },
  tabButtonActive: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
  },
  tabButtonLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: tokens.colors.textMuted,
  },
  tabButtonLabelActive: {
    color: tokens.colors.green700,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: tokens.colors.text,
    paddingVertical: 8,
  },
  content: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: tokens.space.xs,
    paddingBottom: tokens.space.lg,
  },
  recentSection: {
    marginBottom: tokens.space.md,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.md,
    ...softPanelShadowStyle,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.space.sm,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  recentClearText: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  recentChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  recentChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.white,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  recentChipText: {
    maxWidth: 180,
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  countLabel: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "700",
    marginBottom: tokens.space.sm,
    marginLeft: 4,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: tokens.space.sm,
    marginLeft: 2,
  },
  sortChip: {
    minHeight: 36,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  sortChipActive: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
  },
  sortChipText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
  sortChipTextActive: {
    color: tokens.colors.green700,
  },
  itemWrap: {
    marginBottom: tokens.space.md,
  },
  authorCard: {
    marginBottom: tokens.space.md,
    minHeight: 92,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    ...softPanelShadowStyle,
  },
  authorCardPressed: {
    opacity: 0.92,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  authorCopy: {
    flex: 1,
    gap: 5,
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
  loadMoreButton: {
    minHeight: 44,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.md,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonDisabled: {
    opacity: 0.7,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
});
