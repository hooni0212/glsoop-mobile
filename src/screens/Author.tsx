import React, { useMemo } from "react";
import { FlatList, SafeAreaView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { FeedCard } from "@/components/FeedCard";
import { PostTopBar } from "@/components/post/PostTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useAuthorPosts } from "@/features/users/useAuthorPosts";
import { useAuthorProfile } from "@/features/users/useAuthorProfile";
import { authorScreenStyles } from "@/screens/Author.styles";
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
  } = useAuthorPosts(userId);

  const name = user?.name || "익명";
  const bio = user?.bio || "소개가 아직 없어요.";
  const postCount = stats?.postCount ?? user?.postCount ?? user?.post_count ?? 0;
  const totalLikes = stats?.totalLikes ?? user?.totalLikes ?? user?.total_likes ?? 0;
  const joinedAtLabel = formatJoinedDate(user?.joinedAt);

  const showInitialLoading = profileLoading && !user;

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
          <FeedCard
            post={item}
            onPress={() => router.push(`/posts/${item.id}`)}
            testID={`author-post-card-${item.id}`}
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
