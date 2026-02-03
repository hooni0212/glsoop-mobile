import { usePost } from "@/features/posts/usePost";
import { useBottomDock } from "@/navigation/bottomDock";
import { createPostDetailStyles } from "@/screens/PostDetail.styles";
import { PostActionBar } from "@/components/post/PostActionBar";
import { PostBody } from "@/components/post/PostBody";
import { PostHeader } from "@/components/post/PostHeader";
import { PostMetaBar } from "@/components/post/PostMetaBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { PostTopBar } from "@/components/post/PostTopBar";
import { useAuth } from "@/auth/AuthContext";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { togglePostLike } from "@/services/likeService";
import { ApiError } from "@/lib/errors";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, View } from "react-native";

function formatKoreanDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

export default function PostDetail() {
  // ✅ safe-area 계산은 navigation layer(BottomDockProvider)에서만 수행
  const dock = useBottomDock();
  const styles = useMemo(() => createPostDetailStyles(dock.height), [dock.height]);

  const params = useLocalSearchParams<{ id: string }>();
  const id = params?.id ? String(params.id) : undefined;

  const { post, loading, error, refetch, mutatePost } = usePost(id);
  const { signOut } = useAuth();
  const [likePending, setLikePending] = useState(false);

  const title = post?.title || "";
  const authorName = post?.author?.name || "익명";
  const authorId = post?.author?.id;
  const dateText = formatKoreanDate((post as any)?.createdAt);
  const content = (post as any)?.content || "";
  const fallbackLikeCount = post?.stats?.likeCount ?? 0;
  const fallbackIsLiked = Boolean((post as any)?.viewer?.isLiked);
  const postId = post?.id ?? id ?? "";
  const likeSnapshot = useLikeSnapshot(postId, fallbackIsLiked, fallbackLikeCount);
  const likeCount = likeSnapshot.likeCount;
  const isLiked = likeSnapshot.liked;
  const isBookmarked = Boolean((post as any)?.viewer?.isBookmarked);

  const onPressBack = () => router.back();
  const showNotFound = error?.kind === "not_found";

  const handleLikeAuthError = async () => {
    await signOut();
    router.replace("/(auth)");
    Alert.alert("로그인이 필요해요", "다시 로그인해주세요.");
  };

  const onPressLike = async () => {
    if (!post || likePending) return;

    const stored = getLike(post.id);
    const prevLiked = stored?.liked ?? Boolean(post.viewer?.isLiked);
    const prevCount = stored?.likeCount ?? (post.stats?.likeCount ?? 0);
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLike(post.id, nextLiked, nextCount);
    mutatePost((prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isLiked: nextLiked },
      stats: { ...prev.stats, likeCount: nextCount },
    }));

    setLikePending(true);
    try {
      const res = await togglePostLike(post.id);
      setLike(post.id, res.liked, res.likeCount);
      mutatePost((prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isLiked: res.liked },
        stats: { ...prev.stats, likeCount: res.likeCount },
      }));
    } catch (err) {
      setLike(post.id, prevLiked, prevCount);
      mutatePost((prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isLiked: prevLiked },
        stats: { ...prev.stats, likeCount: prevCount },
      }));

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleLikeAuthError();
      } else {
        Alert.alert("좋아요 실패", "잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLikePending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ✅ 고정 TopBar (기존 UX 유지) */}
      <PostTopBar onPressBack={onPressBack} styles={styles} />

      {loading ? (
        <View style={styles.center}>
          <AppLoading />
        </View>
      ) : error ? (
        <View style={styles.center}>
          {showNotFound ? (
            <AppEmpty
              title="글을 찾을 수 없어요"
              description="삭제되었거나 주소가 잘못됐을 수 있어요."
              primaryAction={{ label: "뒤로가기", onPress: onPressBack }}
            />
          ) : (
            <AppError error={error} onRetry={error.canRetry ? refetch : undefined} />
          )}
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <AppEmpty
            title="글을 찾을 수 없어요"
            description="삭제되었거나 주소가 잘못됐을 수 있어요."
            primaryAction={{ label: "뒤로가기", onPress: onPressBack }}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <PostHeader
              title={title}
              authorName={authorName}
              dateText={dateText}
              onPressAuthor={authorId ? () => router.push(`/users/${authorId}`) : undefined}
              styles={styles}
            />
            <PostMetaBar type={post.type} tags={post.tags} styles={styles} />
            <PostBody content={content} styles={styles} />
          </ScrollView>

          <PostActionBar
            likeCount={likeCount}
            isLiked={isLiked}
            isBookmarked={isBookmarked}
            onPressLike={onPressLike}
            onPressBookmark={() => {}}
            onPressShare={() => {}}
            likeDisabled={likePending}
            likeTestID="post-like-btn"
            height={dock.height}
            paddingBottom={dock.paddingBottom}
            styles={styles}
          />
        </>
      )}
    </SafeAreaView>
  );
}
