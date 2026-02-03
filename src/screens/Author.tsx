import React, { useMemo, useState } from "react";
import { Alert, FlatList, SafeAreaView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { FeedCard } from "@/components/FeedCard";
import { PostTopBar } from "@/components/post/PostTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useAuthorPosts } from "@/features/users/useAuthorPosts";
import { useAuthorProfile } from "@/features/users/useAuthorProfile";
import { authorScreenStyles } from "@/screens/Author.styles";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { useAuth } from "@/auth/AuthContext";
import { togglePostLike } from "@/services/likeService";
import { ApiError } from "@/lib/errors";
import type { Post } from "@/types/post";

function formatJoinedDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 가입`;
}

export default function Author() {
  const params = useLocalSearchParams<{ id: string }>();
  const userId = params?.id ? String(params.id) : undefined;

  const {
    user,
    stats,
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
  } = useAuthorPosts(userId);
  const { signOut } = useAuth();
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});

  const name = user?.name || "익명";
  const bio = user?.bio || "소개가 아직 없어요.";
  const postCount = stats?.postCount ?? user?.postCount ?? user?.post_count ?? 0;
  const totalLikes = stats?.totalLikes ?? user?.totalLikes ?? user?.total_likes ?? 0;
  const joinedAtLabel = formatJoinedDate(user?.joinedAt);

  const showInitialLoading = profileLoading && !user;

  const setPending = (postId: string, pending: boolean) => {
    setLikePending((prev) => ({ ...prev, [postId]: pending }));
  };

  const handleAuthError = async () => {
    await signOut();
    router.replace("/(auth)");
    Alert.alert("로그인이 필요해요", "다시 로그인해주세요.");
  };

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
        Alert.alert("좋아요 실패", "잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPending(postId, false);
    }
  };

  const listHeader = useMemo(
    () => (
      <View>
        <View style={authorScreenStyles.profileCard}>
          <Text style={authorScreenStyles.name}>{name}</Text>
          <Text style={authorScreenStyles.bio}>{bio}</Text>
          <View style={authorScreenStyles.statsRow}>
            <Text style={authorScreenStyles.statText}>글 {postCount}</Text>
            <Text style={authorScreenStyles.statText}>좋아요 {totalLikes}</Text>
          </View>
          {joinedAtLabel ? (
            <Text style={authorScreenStyles.joinedAt}>{joinedAtLabel}</Text>
          ) : null}
        </View>

        <Text style={authorScreenStyles.sectionLabel}>작성한 글</Text>
      </View>
    ),
    [bio, joinedAtLabel, name, postCount, totalLikes]
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
      bookmarked={Boolean(item.viewer?.isBookmarked)}
    />
  );
}
