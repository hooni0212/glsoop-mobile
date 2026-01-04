import { usePost } from "@/features/posts/usePost";
import { useBottomDock } from "@/navigation/bottomDock";
import { createPostDetailStyles } from "@/screens/PostDetail.styles";
import { PostActionBar } from "@/components/post/PostActionBar";
import { PostBody } from "@/components/post/PostBody";
import { PostHeader } from "@/components/post/PostHeader";
import { PostMetaBar } from "@/components/post/PostMetaBar";
import { PostStates } from "@/components/post/PostStates";
import { PostTopBar } from "@/components/post/PostTopBar";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { SafeAreaView, ScrollView } from "react-native";

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

  const { post, loading, error, refetch } = usePost(id);

  const title = post?.title || "";
  const authorName = post?.author?.name || "익명";
  const dateText = formatKoreanDate((post as any)?.createdAt);
  const content = (post as any)?.content || "";
  const likeCount = post?.stats?.likeCount ?? 0;
  const isLiked = Boolean((post as any)?.viewer?.isLiked);
  const isBookmarked = Boolean((post as any)?.viewer?.isBookmarked);

  const metaLine = useMemo(() => {
    const a = authorName ? authorName : "익명";
    const b = dateText ? dateText : "";
    return b ? `${a}  ·  ${b}` : a;
  }, [authorName, dateText]);

  const onPressBack = () => router.back();

  return (
    <SafeAreaView style={styles.safe}>
      {/* ✅ 고정 TopBar (기존 UX 유지) */}
      <PostTopBar onPressBack={onPressBack} styles={styles} />

      {loading ? (
        <PostStates kind="loading" styles={styles} />
      ) : error ? (
        <PostStates kind="error" errorText={error} onRetry={refetch} styles={styles} />
      ) : !post ? (
        <PostStates kind="notFound" onBack={onPressBack} styles={styles} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <PostHeader title={title} metaLine={metaLine} styles={styles} />
            <PostMetaBar type={post.type} tags={post.tags} styles={styles} />
            <PostBody content={content} styles={styles} />
          </ScrollView>

          <PostActionBar
            likeCount={likeCount}
            isLiked={isLiked}
            isBookmarked={isBookmarked}
            onPressLike={() => {}}
            onPressBookmark={() => {}}
            onPressShare={() => {}}
            height={dock.height}
            paddingBottom={dock.paddingBottom}
            styles={styles}
          />
        </>
      )}
    </SafeAreaView>
  );
}
