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
import { setBookmark, useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { useToast } from "@/feedback/ToastProvider";
import { togglePostLike } from "@/services/likeService";
import { ApiError } from "@/lib/errors";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Share, Text, View } from "react-native";
import {
  addPostToBookmarkList,
  BookmarkList,
  createBookmarkList,
  listRecentBookmarkLists,
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

function mergeRecentAndAllLists(recentLists: BookmarkList[], allLists: BookmarkList[]) {
  if (recentLists.length === 0) return allLists;

  const allById = new Map(allLists.map((item) => [item.id, item]));
  const ordered: BookmarkList[] = [];

  for (const recent of recentLists) {
    const matched = allById.get(recent.id);
    if (matched) {
      ordered.push(matched);
      allById.delete(recent.id);
      continue;
    }
    ordered.push(recent);
  }

  for (const item of allLists) {
    if (!allById.has(item.id)) continue;
    ordered.push(item);
    allById.delete(item.id);
  }

  return ordered;
}

export default function PostDetail() {
  // ✅ safe-area 계산은 navigation layer(BottomDockProvider)에서만 수행
  // 상세 화면은 Tab 도크가 아닌 Action 도크 규격을 사용
  const dock = useBottomDock();
  const styles = useMemo(() => createPostDetailStyles(dock.action.height), [dock.action.height]);

  const params = useLocalSearchParams<{ id: string }>();
  const id = params?.id ? String(params.id) : undefined;

  const { post, loading, error, refetch, mutatePost } = usePost(id);
  const { signOut } = useAuth();
  const { showToast } = useToast();
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
  const fallbackBookmarked = Boolean((post as any)?.viewer?.isBookmarked);
  const bookmarkSnapshot = useBookmarkSnapshot(postId, fallbackBookmarked);
  const isBookmarked = bookmarkSnapshot.bookmarked;

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
        showToast("좋아요 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setLikePending(false);
    }
  };

  const syncBookmarkSnapshot = (nextLists: BookmarkList[]) => {
    const nextBookmarked = nextLists.some((l) => Boolean(l.contains));
    if (post?.id) setBookmark(post.id, nextBookmarked);
    mutatePost((prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isBookmarked: nextBookmarked },
    }));
  };

  const openBookmarkModal = async () => {
    if (!post) return;
    setBookmarkModalVisible(true);
    setBookmarkLoading(true);

    let recentLists: BookmarkList[] = [];
    let recentFailed = false;

    try {
      try {
        recentLists = await listRecentBookmarkLists({ postId: post.id, limit: 6 });
      } catch (recentErr) {
        if (recentErr instanceof ApiError && (recentErr.status === 401 || recentErr.status === 403)) {
          setBookmarkModalVisible(false);
          await handleAuthError();
          return;
        }
        recentFailed = true;
      }

      const lists = await listPostBookmarkLists(post.id);
      const merged = mergeRecentAndAllLists(recentLists, lists);
      setBookmarkLists(merged);
      syncBookmarkSnapshot(merged);

      if (recentFailed) {
        showToast("최근 사용 폴더 정렬을 불러오지 못해 기본 목록으로 표시했어요.");
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setBookmarkModalVisible(false);
        await handleAuthError();
        return;
      }
      showToast(
        err instanceof Error ? err.message : "북마크 폴더를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
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
      showToast(
        err instanceof Error ? err.message : "북마크 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
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
      showToast(
        err instanceof Error ? err.message : "폴더 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    } finally {
      setBookmarkLoading(false);
    }
  };

  const onPressShare = async () => {
    if (!post) return;

    const shareTitle = title || "글숲";
    const shareContent = content.trim();
    const shareMessage = shareContent ? `${shareTitle}\n\n${shareContent}` : shareTitle;

    try {
      await Share.share({
        title: shareTitle,
        message: shareMessage,
      });
    } catch {
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
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
            onPressShare={() => void onPressShare()}
            likeDisabled={likePending}
            likeTestID="post-like-btn"
            height={dock.action.height}
            paddingBottom={dock.action.paddingBottom}
            styles={styles}
          />
        </>
      )}

      <Modal visible={bookmarkModalVisible} transparent animationType="fade">
        <View style={styles.bookmarkModalOverlay}>
          <View style={styles.bookmarkModalCard}>
            <Text style={styles.bookmarkModalTitle}>북마크 폴더 선택</Text>
            <Text style={styles.bookmarkModalDescription}>
              저장할 폴더를 선택하면 토글됩니다.
            </Text>

            {bookmarkLoading ? (
              <View style={styles.bookmarkModalLoadingWrap}>
                <Text style={styles.bookmarkModalLoadingText}>불러오는 중...</Text>
              </View>
            ) : bookmarkLists.length === 0 ? (
              <View style={styles.bookmarkModalEmptyWrap}>
                <Text style={styles.bookmarkModalEmptyText}>북마크 폴더가 없어요.</Text>
                <Pressable
                  onPress={() => void createDefaultBookmarkList()}
                  style={styles.bookmarkModalCreateBtn}
                >
                  <Text style={styles.bookmarkModalCreateBtnText}>기본 폴더 만들고 저장</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.bookmarkModalList}>
                {bookmarkLists.map((list) => {
                  const pending = Boolean(bookmarkPending[list.id]);
                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => void toggleBookmarkInList(list.id)}
                      disabled={pending}
                      style={[
                        styles.bookmarkModalListItem,
                        list.contains && styles.bookmarkModalListItemActive,
                      ]}
                    >
                      <Text style={styles.bookmarkModalListItemName}>{list.name}</Text>
                      <Text style={styles.bookmarkModalListItemStatus}>
                        {pending ? "처리중..." : list.contains ? "저장됨" : "저장"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={() => setBookmarkModalVisible(false)}
              style={styles.bookmarkModalCloseBtn}
            >
              <Text style={styles.bookmarkModalCloseBtnText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
