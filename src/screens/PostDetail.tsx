import { usePost } from "@/features/posts/usePost";
import { useBottomDock } from "@/navigation/bottomDock";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PostActionBar } from "@/components/post/PostActionBar";
import { PostBody } from "@/components/post/PostBody";
import { PostHeader } from "@/components/post/PostHeader";
import { PostMetaBar } from "@/components/post/PostMetaBar";
import { createPostDetailStyles } from "@/screens/PostDetail.styles";
import { tokens } from "@/theme/tokens";

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
      <View style={styles.topBar}>
        <Pressable onPress={onPressBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
        </Pressable>
        <View style={{ width: 40, height: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>불러오기에 실패했어요</Text>
          <Text style={styles.errSub}>{error}</Text>
          <Pressable onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>글을 찾을 수 없어요</Text>
          <Pressable onPress={onPressBack} style={styles.retryBtn}>
            <Text style={styles.retryText}>뒤로가기</Text>
          </Pressable>
        </View>
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
