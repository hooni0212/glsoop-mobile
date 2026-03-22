import { usePost } from "@/features/posts/usePost";
import { useRelatedPosts } from "@/features/posts/useRelatedPosts";
import { useBottomDock } from "@/navigation/bottomDock";
import { createPostDetailStyles } from "@/screens/PostDetail.styles";
import { PostActionBar } from "@/components/post/PostActionBar";
import { PostBody } from "@/components/post/PostBody";
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
import { deletePost, getEditablePost } from "@/services/postService";
import { logShareEvent } from "@/services/shareService";
import { buildAuthRoute } from "@/lib/authRedirect";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resolvePostLayout } from "@/lib/postLayout";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
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

function createShareRequestId(postId: string) {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `share_${postId}_${Date.now()}_${randomPart}`.slice(0, 120);
}

export default function PostDetail() {
  // ✅ safe-area 계산은 navigation layer(BottomDockProvider)에서만 수행
  // 상세 화면은 Tab 도크가 아닌 Action 도크 규격을 사용
  const dock = useBottomDock();
  const styles = useMemo(() => createPostDetailStyles(dock.action.height), [dock.action.height]);

  const params = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const id = params?.id ? String(params.id) : undefined;

  const { post, loading, error, refetch, mutatePost } = usePost(id);
  const {
    items: relatedPosts,
    loading: relatedLoading,
    error: relatedError,
  } = useRelatedPosts(id, 6);
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [likePending, setLikePending] = useState(false);
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkLists, setBookmarkLists] = useState<BookmarkList[]>([]);
  const [bookmarkPending, setBookmarkPending] = useState<Record<string, boolean>>({});
  const [canManagePost, setCanManagePost] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);

  const title = post?.title || "";
  const authorName = post?.author?.name || "익명";
  const authorId = post?.author?.id;
  const dateText = formatKoreanDate((post as any)?.createdAt);
  const content = (post as any)?.content || "";
  const paragraphs = Array.isArray((post as any)?.paragraphs) ? (post as any).paragraphs : [];
  const postLayout = useMemo(
    () => resolvePostLayout((post as any)?.layoutJson, post?.type),
    [post]
  );
  const footerText = useMemo(() => {
    const safeTags = Array.isArray(post?.tags) ? post.tags.filter(Boolean) : [];
    if (safeTags.length > 0) return safeTags.map((item) => `#${item}`).join(" ");
    if (post?.type === "poem") return "시";
    if (post?.type === "essay") return "에세이";
    if (dateText) return dateText;
    return "짧은 글";
  }, [dateText, post?.tags, post?.type]);
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

  React.useEffect(() => {
    let cancelled = false;

    if (!post?.id) {
      setCanManagePost(false);
      return;
    }

    void (async () => {
      try {
        await getEditablePost(post.id);
        if (!cancelled) setCanManagePost(true);
      } catch {
        if (!cancelled) setCanManagePost(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post?.id]);

  const handleAuthError = async () => {
    await signOut();
    router.replace(buildAuthRoute("/(auth)", pathname));
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

  const sharePost = async (mode: "title" | "full") => {
    if (!post) return;

    const shareTitle = title || "글숲";
    const shareContent = content.trim();
    const shareMessage =
      mode === "full" && shareContent ? `${shareTitle}\n\n${shareContent}` : shareTitle;
    const requestId = createShareRequestId(post.id);
    const platform = Platform.OS === "web" ? "web" : "mobile";
    const dismissedAction =
      (Share as { dismissedAction?: string }).dismissedAction ?? "dismissedAction";
    const channel = mode === "full" ? "share_modal_full" : "share_modal_title_only";

    const logShareEventSafely = (result: "shared" | "dismissed" | "failed", meta?: Record<string, unknown>) => {
      void logShareEvent({
        postId: post.id,
        platform,
        surface: "post_detail",
        channel,
        result,
        requestId,
        meta,
      }).catch((eventError) => {
        if (__DEV__) {
          logger.warn("[share] event log failed", eventError);
        }
      });
    };

    try {
      setShareModalVisible(false);
      const result = await Share.share({
        title: shareTitle,
        message: shareMessage,
      });

      if (result.action === Share.sharedAction) {
        logShareEventSafely("shared", {
          action: result.action,
          activity_type: result.activityType || null,
          title_length: shareTitle.length,
          content_length: shareContent.length,
          share_mode: mode,
        });
        showToast("공유가 완료되었어요.", { tone: "success" });
        return;
      }

      if (result.action === dismissedAction) {
        logShareEventSafely("dismissed", {
          action: result.action,
          activity_type: result.activityType || null,
          title_length: shareTitle.length,
          content_length: shareContent.length,
          share_mode: mode,
        });
        return;
      }

      logShareEventSafely("dismissed", {
        action: result.action || "unknown",
        activity_type: result.activityType || null,
        title_length: shareTitle.length,
        content_length: shareContent.length,
        share_mode: mode,
      });
    } catch {
      logShareEventSafely("failed", {
        title_length: shareTitle.length,
        content_length: shareContent.length,
        share_mode: mode,
      });
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
    }
  };

  const onPressShare = () => {
    if (!post) return;
    setShareModalVisible(true);
  };

  const onPressEdit = () => {
    if (!post?.id) return;
    router.push({ pathname: "/write", params: { postId: post.id } });
  };

  const onPressDelete = () => {
    if (!post?.id || manageBusy) return;

    Alert.alert("글 삭제", "정말 이 글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setManageBusy(true);
            try {
              await deletePost(post.id);
              showToast("글을 삭제했어요.", { tone: "success" });
              router.replace("/(tabs)");
            } catch (err) {
              if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                await handleAuthError();
              } else {
                showToast("글 삭제에 실패했어요. 잠시 후 다시 시도해주세요.", {
                  tone: "error",
                });
              }
            } finally {
              setManageBusy(false);
            }
          })();
        },
      },
    ]);
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
            <View style={styles.introWrap}>
              <Text style={styles.introEyebrow}>TODAY&apos;S PAGE</Text>
              <View style={styles.metaRow}>
                {authorId ? (
                  <Pressable
                    onPress={() => router.push(`/users/${authorId}`)}
                    accessibilityRole="button"
                    testID="post-author-btn"
                  >
                    <Text style={styles.metaAuthor}>{authorName}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.metaAuthor}>{authorName}</Text>
                )}
                {dateText ? (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaDate}>{dateText}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <PostMetaBar type={post.type} tags={post.tags} styles={styles} />
            <PostBody
              postId={postId}
              title={title}
              content={content}
              paragraphs={paragraphs}
              footerText={footerText}
              type={post.type}
              layout={postLayout}
              versionSeed={`${title}|${content}|${JSON.stringify((post as any)?.layoutJson ?? null)}`}
            />

            {canManagePost ? (
              <View style={styles.relatedSection}>
                <Text style={styles.relatedTitle}>내 글 관리</Text>
                <View style={styles.manageActionRow}>
                  <Pressable onPress={onPressEdit} style={styles.manageEditBtn}>
                    <Text style={styles.manageEditBtnText}>수정하기</Text>
                  </Pressable>
                  <Pressable
                    onPress={onPressDelete}
                    style={styles.manageDeleteBtn}
                    disabled={manageBusy}
                  >
                    <Text style={styles.manageDeleteBtnText}>
                      {manageBusy ? "삭제 중..." : "삭제하기"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>관련 글</Text>
              {relatedLoading ? (
                <Text style={styles.relatedHint}>불러오는 중...</Text>
              ) : relatedError ? (
                <Text style={styles.relatedHint}>
                  관련 글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
                </Text>
              ) : relatedPosts.length === 0 ? (
                <Text style={styles.relatedHint}>아직 함께 읽을 관련 글이 없어요.</Text>
              ) : (
                <View style={styles.relatedList}>
                  {relatedPosts.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/posts/${item.id}`)}
                      style={styles.relatedCard}
                    >
                      <Text style={styles.relatedCardTitle}>
                        {item.title || "제목 없는 글"}
                      </Text>
                      {item.excerpt ? (
                        <Text style={styles.relatedCardExcerpt}>{item.excerpt}</Text>
                      ) : null}
                      <Text style={styles.relatedCardMeta}>
                        {item.author?.name || "익명"} · 좋아요 {item.stats?.likeCount ?? 0}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
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
            bookmarkTestID="post-bookmark-btn"
            shareTestID="post-share-btn"
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

      <Modal visible={shareModalVisible} transparent animationType="fade">
        <View style={styles.bookmarkModalOverlay}>
          <View style={styles.bookmarkModalCard}>
            <Text style={styles.bookmarkModalTitle}>공유 방식 선택</Text>
            <Text style={styles.bookmarkModalDescription}>
              제목만 보낼지, 본문까지 함께 보낼지 선택할 수 있어요.
            </Text>

            <View style={styles.bookmarkModalList}>
              <Pressable
                onPress={() => void sharePost("full")}
                style={styles.bookmarkModalListItem}
              >
                <Text style={styles.bookmarkModalListItemName}>본문까지 공유</Text>
                <Text style={styles.bookmarkModalListItemStatus}>추천</Text>
              </Pressable>
              <Pressable
                onPress={() => void sharePost("title")}
                style={styles.bookmarkModalListItem}
              >
                <Text style={styles.bookmarkModalListItemName}>제목만 공유</Text>
                <Text style={styles.bookmarkModalListItemStatus}>간단히</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShareModalVisible(false)}
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
