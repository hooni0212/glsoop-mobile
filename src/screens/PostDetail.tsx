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
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import {
  addPostToBookmarkList,
  BookmarkList,
  createBookmarkList,
  listPostBookmarkLists,
  removePostFromBookmarkList,
} from "@/services/bookmarkService";

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
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkLists, setBookmarkLists] = useState<BookmarkList[]>([]);
  const [bookmarkPending, setBookmarkPending] = useState<Record<string, boolean>>({});

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

  const handleAuthError = async () => {
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
        await handleAuthError();
      } else {
        Alert.alert("좋아요 실패", "잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLikePending(false);
    }
  };

  const syncBookmarkSnapshot = (nextLists: BookmarkList[]) => {
    const nextBookmarked = nextLists.some((l) => Boolean(l.contains));
    mutatePost((prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isBookmarked: nextBookmarked },
    }));
  };

  const openBookmarkModal = async () => {
    if (!post) return;
    setBookmarkModalVisible(true);
    setBookmarkLoading(true);
    try {
      const lists = await listPostBookmarkLists(post.id);
      setBookmarkLists(lists);
      syncBookmarkSnapshot(lists);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setBookmarkModalVisible(false);
        await handleAuthError();
        return;
      }
      Alert.alert("북마크 불러오기 실패", err instanceof Error ? err.message : "잠시 후 다시 시도해주세요.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const toggleBookmarkInList = async (listId: string) => {
    if (!post || bookmarkPending[listId]) return;

    const target = bookmarkLists.find((l) => l.id === listId);
    if (!target) return;

    setBookmarkPending((prev) => ({ ...prev, [listId]: true }));
    try {
      if (target.contains) {
        await removePostFromBookmarkList({ listId, postId: post.id });
      } else {
        await addPostToBookmarkList({ listId, postId: post.id });
      }

      const nextLists = bookmarkLists.map((l) =>
        l.id === listId ? { ...l, contains: !target.contains } : l
      );
      setBookmarkLists(nextLists);
      syncBookmarkSnapshot(nextLists);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setBookmarkModalVisible(false);
        await handleAuthError();
        return;
      }
      Alert.alert("북마크 처리 실패", err instanceof Error ? err.message : "잠시 후 다시 시도해주세요.");
    } finally {
      setBookmarkPending((prev) => ({ ...prev, [listId]: false }));
    }
  };

  const createDefaultBookmarkList = async () => {
    if (!post || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const created = await createBookmarkList({ name: "기본" });
      await addPostToBookmarkList({ listId: created.id, postId: post.id });
      const next = [{ ...created, contains: true }, ...bookmarkLists];
      setBookmarkLists(next);
      syncBookmarkSnapshot(next);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setBookmarkModalVisible(false);
        await handleAuthError();
        return;
      }
      Alert.alert(
        "폴더 생성 실패",
        err instanceof Error ? err.message : "잠시 후 다시 시도해주세요."
      );
    } finally {
      setBookmarkLoading(false);
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
            onPressBookmark={() => void openBookmarkModal()}
            onPressShare={() => {}}
            likeDisabled={likePending}
            likeTestID="post-like-btn"
            height={dock.height}
            paddingBottom={dock.paddingBottom}
            styles={styles}
          />
        </>
      )}

      <Modal visible={bookmarkModalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#1F1F1F" }}>북마크 폴더 선택</Text>
            <Text style={{ marginTop: 8, fontSize: 12, color: "#666", fontWeight: "700" }}>
              저장할 폴더를 선택하면 토글됩니다.
            </Text>

            {bookmarkLoading ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, color: "#444", fontWeight: "700" }}>
                  불러오는 중...
                </Text>
              </View>
            ) : bookmarkLists.length === 0 ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={{ fontSize: 13, color: "#444", fontWeight: "700" }}>
                  북마크 폴더가 없어요.
                </Text>
                <Pressable
                  onPress={() => void createDefaultBookmarkList()}
                  style={{
                    borderRadius: 12,
                    backgroundColor: "#2E5A3D",
                    alignItems: "center",
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "900" }}>
                    기본 폴더 만들고 저장
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ marginTop: 14, gap: 8 }}>
                {bookmarkLists.map((list) => {
                  const pending = Boolean(bookmarkPending[list.id]);
                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => void toggleBookmarkInList(list.id)}
                      disabled={pending}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: list.contains ? "#2E5A3D" : "rgba(0,0,0,0.12)",
                        backgroundColor: list.contains ? "rgba(46,90,61,0.1)" : "#fff",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#222", fontSize: 13, fontWeight: "800" }}>
                        {list.name}
                      </Text>
                      <Text style={{ color: "#555", fontSize: 12, fontWeight: "700" }}>
                        {pending ? "처리중..." : list.contains ? "저장됨" : "저장"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={() => setBookmarkModalVisible(false)}
              style={{
                marginTop: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.12)",
                alignItems: "center",
                paddingVertical: 10,
                backgroundColor: "#F7F7F7",
              }}
            >
              <Text style={{ color: "#2B2B2B", fontSize: 13, fontWeight: "900" }}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
