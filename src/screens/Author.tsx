import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { FeedCard } from "@/components/FeedCard";
import { useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { PostTopBar } from "@/components/post/PostTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useAuthorPosts, type AuthorPostSort } from "@/features/users/useAuthorPosts";
import { useAuthorProfile } from "@/features/users/useAuthorProfile";
import { authorScreenStyles } from "@/screens/Author.styles";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { useToast } from "@/feedback/ToastProvider";
import { useAuth } from "@/auth/AuthContext";
import { togglePostLike } from "@/services/likeService";
import { toggleFollowUser } from "@/services/userService";
import { ApiError } from "@/lib/errors";
import {
  normalizeProfileCosmeticsExpanded,
  type CosmeticStickerSlot,
} from "@/types/cosmetics";
import type { Post } from "@/types/post";

function formatJoinedDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 가입`;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function toIdText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function isOwnProfile(viewer: unknown, user: unknown): boolean {
  const viewerRow = toRecord(viewer);
  const explicit = toBooleanFlag(
    viewerRow.is_own_profile ??
      viewerRow.isOwnProfile ??
      viewerRow.is_me ??
      viewerRow.isMe
  );
  if (explicit !== null) return explicit;

  const viewerId = toIdText(viewerRow.id);
  const userId = toIdText(toRecord(user).id);
  return Boolean(viewerId && userId && viewerId === userId);
}

function emojiOrFallback(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getStickerAnchorStyle(slot: CosmeticStickerSlot) {
  if (slot === "tl") return authorScreenStyles.stickerTL;
  if (slot === "tr") return authorScreenStyles.stickerTR;
  return authorScreenStyles.stickerBR;
}

export default function Author() {
  const params = useLocalSearchParams<{ id: string }>();
  const userId = params?.id ? String(params.id) : undefined;

  const [sort, setSort] = useState<AuthorPostSort>("newest");
  const {
    user,
    stats,
    viewer,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useAuthorProfile(userId);

  const {
    items,
    loading: postsLoading,
    refreshing,
    error: postsError,
    hasMore,
    refresh,
    loadMore,
    patchItem,
  } = useAuthorPosts(userId, sort);
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});
  const [bioExpanded, setBioExpanded] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const name = user?.name || "익명";
  const bio = user?.bio || "소개가 아직 없어요.";
  const postCount = stats?.postCount ?? user?.postCount ?? user?.post_count ?? 0;
  const totalLikes = stats?.totalLikes ?? user?.totalLikes ?? user?.total_likes ?? 0;
  const about = user?.about || user?.bio || "";
  const collapsedAbout =
    about.length > 96 && !bioExpanded ? `${about.slice(0, 96).trim()}...` : about;
  const joinedAtLabel = formatJoinedDate(user?.joinedAt);
  const showProfileCustomize = isOwnProfile(viewer, user);
  const showFollowButton = Boolean(userId && !showProfileCustomize);
  const profileCosmetics = useMemo(
    () => normalizeProfileCosmeticsExpanded(user?.profile_cosmetics ?? null),
    [user?.profile_cosmetics]
  );

  const showInitialLoading = profileLoading && !user;

  const setPending = (postId: string, pending: boolean) => {
    setLikePending((prev) => ({ ...prev, [postId]: pending }));
  };

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void refetchProfile();
    }, [refetchProfile, userId])
  );

  React.useEffect(() => {
    setIsFollowing(Boolean(viewer?.is_following ?? viewer?.isFollowing));
  }, [viewer?.isFollowing, viewer?.is_following]);

  React.useEffect(() => {
    setFollowerCount(Number(user?.follower_count ?? user?.followerCount ?? 0));
  }, [user?.followerCount, user?.follower_count]);

  const handleAuthError = useCallback(async () => {
    await signOut();
    router.replace("/(auth)");
    Alert.alert("로그인이 필요해요", "다시 로그인해주세요.");
  }, [signOut]);

  const handleLike = async (postId: string) => {
    if (likePending[postId]) return;

    const target = items.find((item) => item.id === postId);
    if (!target) return;

    const stored = getLike(postId);
    const prevLiked = stored?.liked ?? Boolean(target.viewer?.isLiked);
    const prevCount = stored?.likeCount ?? (target.stats?.likeCount ?? 0);
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLike(postId, nextLiked, nextCount);
    patchItem(postId, (prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isLiked: nextLiked },
      stats: { ...prev.stats, likeCount: nextCount },
    }));

    setPending(postId, true);
    try {
      const res = await togglePostLike(postId);
      setLike(postId, res.liked, res.likeCount);
      patchItem(postId, (prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isLiked: res.liked },
        stats: { ...prev.stats, likeCount: res.likeCount },
      }));
    } catch (err) {
      setLike(postId, prevLiked, prevCount);
      patchItem(postId, (prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isLiked: prevLiked },
        stats: { ...prev.stats, likeCount: prevCount },
      }));

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
      } else {
        showToast("좋아요 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setPending(postId, false);
    }
  };

  const handleFollowToggle = useCallback(async () => {
    if (!userId || followBusy || showProfileCustomize) return;

    setFollowBusy(true);
    const prevFollowing = isFollowing;
    const prevFollowerCount = followerCount;
    const nextFollowing = !prevFollowing;
    const nextFollowerCount = Math.max(0, prevFollowerCount + (nextFollowing ? 1 : -1));

    setIsFollowing(nextFollowing);
    setFollowerCount(nextFollowerCount);

    try {
      const res = await toggleFollowUser(userId);
      setIsFollowing(res.following);
      setFollowerCount(res.followerCount);
      showToast(res.following ? "팔로우했어요." : "팔로우를 취소했어요.", { tone: "success" });
    } catch (err) {
      setIsFollowing(prevFollowing);
      setFollowerCount(prevFollowerCount);

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
      } else {
        showToast("팔로우 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setFollowBusy(false);
    }
  }, [
    followerCount,
    followBusy,
    handleAuthError,
    isFollowing,
    showProfileCustomize,
    showToast,
    userId,
  ]);

  const handleShareAuthor = useCallback(async () => {
    if (!userId) return;

    const shareTitle = `${name} 작가 페이지`;
    const shareMessage = `${name}님의 글을 같이 읽어보세요.`;
    const shareUrl = `glsoop://users/${userId}`;

    try {
      await Share.share({
        title: shareTitle,
        message: `${shareMessage}\n${shareUrl}`,
        url: shareUrl,
      });
      showToast("작가 페이지를 공유했어요.");
    } catch {
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
    }
  }, [name, showToast, userId]);

  const listHeader = useMemo(
    () => {
      const primaryBadge = profileCosmetics.primary_badge;
      const showcaseBadges = profileCosmetics.showcase_badges.slice(0, 6);
      const headerStickers = profileCosmetics.header_stickers;

      return (
        <View>
          <View style={authorScreenStyles.profileCard}>
            {headerStickers.map(({ slot, sticker }) => (
              <View
                key={`${slot}-${sticker.key}`}
                pointerEvents="none"
                style={[
                  authorScreenStyles.stickerOverlay,
                  getStickerAnchorStyle(slot),
                ]}
              >
                <Text style={authorScreenStyles.stickerText}>
                  {emojiOrFallback(sticker.icon_emoji, "✨")}
                </Text>
              </View>
            ))}

            <View style={authorScreenStyles.nameRow}>
              <Text style={authorScreenStyles.name}>{name}</Text>
              {primaryBadge ? (
                <Text
                  style={authorScreenStyles.badgeEmoji}
                  accessibilityLabel={`대표 뱃지 ${primaryBadge.name}`}
                >
                  {emojiOrFallback(primaryBadge.icon_emoji, "🏅")}
                </Text>
              ) : null}
            </View>

            <Text style={authorScreenStyles.bio}>{collapsedAbout || bio}</Text>
            {about.length > 96 ? (
              <Pressable
                onPress={() => setBioExpanded((current) => !current)}
                style={authorScreenStyles.inlineActionBtn}
              >
                <Text style={authorScreenStyles.inlineActionText}>
                  {bioExpanded ? "소개 접기" : "소개 더보기"}
                </Text>
              </Pressable>
            ) : null}

            {showcaseBadges.length > 0 ? (
              <View style={authorScreenStyles.showcaseRow}>
                {showcaseBadges.map((badge) => (
                  <View
                    key={badge.key}
                    style={authorScreenStyles.showcaseChip}
                  >
                    <Text style={authorScreenStyles.showcaseEmoji}>
                      {emojiOrFallback(badge.icon_emoji, "🏅")}
                    </Text>
                    <Text
                      style={authorScreenStyles.showcaseText}
                      numberOfLines={1}
                    >
                      {badge.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={authorScreenStyles.statsRow}>
              <Text style={authorScreenStyles.statText}>글 {postCount}</Text>
              <Text style={authorScreenStyles.statText}>좋아요 {totalLikes}</Text>
              <Text style={authorScreenStyles.statText}>팔로워 {followerCount}</Text>
            </View>

            {joinedAtLabel ? (
              <Text style={authorScreenStyles.joinedAt}>{joinedAtLabel}</Text>
            ) : null}

            {items.length > 0 ? (
              <Pressable
                onPress={() => router.push(`/posts/${items[0].id}`)}
                style={authorScreenStyles.latestPostBtn}
              >
                <Text style={authorScreenStyles.latestPostBtnText}>최신 글 읽기</Text>
              </Pressable>
            ) : null}

            {showFollowButton ? (
              <View style={authorScreenStyles.actionRow}>
                <Pressable
                  onPress={() => void handleFollowToggle()}
                  disabled={followBusy}
                  style={[
                    authorScreenStyles.followBtn,
                    isFollowing && authorScreenStyles.followBtnActive,
                    followBusy && authorScreenStyles.followBtnDisabled,
                  ]}
                  testID="author-follow-btn"
                >
                  <Text
                    style={[
                      authorScreenStyles.followBtnText,
                      isFollowing && authorScreenStyles.followBtnTextActive,
                    ]}
                  >
                    {followBusy ? "처리 중..." : isFollowing ? "팔로잉" : "팔로우"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleShareAuthor()}
                  style={authorScreenStyles.shareBtn}
                  testID="author-share-btn"
                >
                  <Text style={authorScreenStyles.shareBtnText}>공유</Text>
                </Pressable>
              </View>
            ) : null}

            {showProfileCustomize ? (
              <Pressable
                onPress={() => router.push("/profile-customize")}
                style={authorScreenStyles.profileCustomizeBtn}
                testID="author-profile-customize-btn"
              >
                <Text style={authorScreenStyles.profileCustomizeBtnText}>
                  프로필 꾸미기
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={authorScreenStyles.sectionRow}>
            <Text style={authorScreenStyles.sectionLabel}>작성한 글</Text>
            <View style={authorScreenStyles.sortRow}>
              {([
                ["newest", "최신순"],
                ["likes", "좋아요순"],
                ["oldest", "오래된순"],
              ] as const).map(([value, label]) => {
                const active = sort === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setSort(value)}
                    style={[
                      authorScreenStyles.sortChip,
                      active && authorScreenStyles.sortChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        authorScreenStyles.sortChipText,
                        active && authorScreenStyles.sortChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      );
    },
    [
      about.length,
      bio,
      bioExpanded,
      collapsedAbout,
      followerCount,
      followBusy,
      handleFollowToggle,
      isFollowing,
      items,
      joinedAtLabel,
      name,
      postCount,
      profileCosmetics,
      showProfileCustomize,
      showFollowButton,
      handleShareAuthor,
      sort,
      totalLikes,
    ]
  );

  if (showInitialLoading) {
    return (
      <SafeAreaView style={authorScreenStyles.safe} testID="author-screen">
        <PostTopBar
          onPressBack={() => router.back()}
          styles={authorScreenStyles}
          backButtonTestID="author-back-btn"
        />
        <View style={authorScreenStyles.center}>
          <AppLoading />
        </View>
      </SafeAreaView>
    );
  }

  if (profileError && !user) {
    return (
      <SafeAreaView style={authorScreenStyles.safe} testID="author-screen">
        <PostTopBar
          onPressBack={() => router.back()}
          styles={authorScreenStyles}
          backButtonTestID="author-back-btn"
        />
        <View style={authorScreenStyles.center}>
          <AppError error={profileError} onRetry={refetchProfile} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={authorScreenStyles.safe} testID="author-screen">
      <PostTopBar
        onPressBack={() => router.back()}
        styles={authorScreenStyles}
        backButtonTestID="author-back-btn"
      />

      <FlatList<Post>
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={authorScreenStyles.listContent}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => (
          <View style={authorScreenStyles.listItemSpacer} />
        )}
        renderItem={({ item }) => (
          <AuthorFeedItem
            item={item}
            likePending={likePending}
            onLikePress={handleLike}
          />
        )}
        onEndReached={() => {
          if (!postsLoading && hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={refresh}
        testID="author-post-list"
        ListEmptyComponent={
          !postsLoading ? (
            <View style={authorScreenStyles.listFooter}>
              <AppEmpty title="작성한 글이 없어요" />
            </View>
          ) : null
        }
        ListFooterComponent={() => {
          if (postsError) {
            return (
              <View style={authorScreenStyles.listFooter}>
                <AppError error={postsError} onRetry={refresh} />
              </View>
            );
          }

          if (postsLoading && items.length > 0) {
            return (
              <View style={authorScreenStyles.listFooter}>
                <AppLoading />
              </View>
            );
          }

          return null;
        }}
      />
    </SafeAreaView>
  );
}

function AuthorFeedItem({
  item,
  likePending,
  onLikePress,
}: {
  item: Post;
  likePending: Record<string, boolean>;
  onLikePress: (postId: string) => void;
}) {
  const fallbackLiked = Boolean(item.viewer?.isLiked);
  const fallbackCount = item.stats?.likeCount ?? 0;
  const { liked, likeCount } = useLikeSnapshot(item.id, fallbackLiked, fallbackCount);
  const fallbackBookmarked = Boolean(item.viewer?.isBookmarked);
  const { bookmarked } = useBookmarkSnapshot(item.id, fallbackBookmarked);
  const postSnapshot = {
    ...item,
    stats: { ...item.stats, likeCount },
  };

  return (
    <FeedCard
      post={postSnapshot}
      onPress={() => router.push(`/posts/${item.id}`)}
      testID={`author-post-card-${item.id}`}
      onLikePress={() => onLikePress(item.id)}
      likeDisabled={Boolean(likePending[item.id])}
      likeTestID={`feed-like-btn-${item.id}`}
      liked={liked}
      bookmarked={bookmarked}
    />
  );
}
