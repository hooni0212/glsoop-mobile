import { usePost } from "@/features/posts/usePost";
import { useRelatedPosts } from "@/features/posts/useRelatedPosts";
import { useBottomDock } from "@/navigation/bottomDock";
import { createPostDetailStyles } from "@/screens/PostDetail.styles";
import { PostActionBar } from "@/components/post/PostActionBar";
import { PostBody } from "@/components/post/PostBody";
import { PostMetaBar } from "@/components/post/PostMetaBar";
import { SafetyActionSheet } from "@/components/safety/SafetyActionSheet";
import { SafetyReasonModal } from "@/components/safety/SafetyReasonModal";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { PostTopBar } from "@/components/post/PostTopBar";
import { getLegalDocumentUrl, getSupportUrl, releaseConfig } from "@/config/release";
import { useAuth } from "@/auth/AuthContext";
import { setBookmark, useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { useRuntimeLegalConfig } from "@/hooks/useRuntimeLegalConfig";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { useToast } from "@/feedback/ToastProvider";
import { openExternalUrl } from "@/lib/externalLinks";
import { togglePostLike } from "@/services/likeService";
import {
  createPostComment,
  deleteComment,
  listPostComments,
  PostComment,
} from "@/services/commentService";
import { deletePost, getEditablePost } from "@/services/postService";
import { blockUserById, pickSafetyReasons, reportPost } from "@/services/safetyService";
import { logShareEvent } from "@/services/shareService";
import { resolveRuntimeLegalDocumentUrl } from "@/services/runtimeConfigService";
import { buildAuthRoute } from "@/lib/authRedirect";
import { formatKstDateKorean } from "@/lib/dateTime";
import { ApiError } from "@/lib/errors";
import { buildRenderedPostShareImageUrl } from "@/lib/feedImage";
import * as haptics from "@/lib/haptics";
import { logger } from "@/lib/logger";
import { resolvePostLayout } from "@/lib/postLayout";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addPostToBookmarkList,
  BookmarkList,
  createBookmarkList,
  listRecentBookmarkLists,
  listPostBookmarkLists,
  removePostFromBookmarkList,
} from "@/services/bookmarkService";

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

function buildPostPermalink(postId: string) {
  const encodedPostId = encodeURIComponent(postId);
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/html/post.html?postId=${encodedPostId}`;
  }
  return `${releaseConfig.siteUrl}/html/post.html?postId=${encodedPostId}`;
}

function buildShareText({
  mode,
  title,
  content,
  permalink,
}: {
  mode: "title" | "full" | "link";
  title: string;
  content: string;
  permalink: string;
}) {
  if (mode === "link") {
    return `${title}\n${permalink}`;
  }

  if (mode === "full" && content) {
    return `${title}\n\n${content}\n\n${permalink}`;
  }

  return `${title}\n${permalink}`;
}

function createShareFileName(postId: string) {
  const safePostId = postId.replace(/[^a-zA-Z0-9_-]/g, "-") || "card";
  return `glsoop_post_${safePostId}_${Date.now()}.png`;
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
  const { config: runtimeLegalConfig } = useRuntimeLegalConfig();
  const { token, signOut } = useAuth();
  const { showToast } = useToast();
  const [likePending, setLikePending] = useState(false);
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [safetyMenuVisible, setSafetyMenuVisible] = useState(false);
  const [reportReasonVisible, setReportReasonVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkLists, setBookmarkLists] = useState<BookmarkList[]>([]);
  const [bookmarkPending, setBookmarkPending] = useState<Record<string, boolean>>({});
  const [shareSubmitting, setShareSubmitting] = useState<"image" | "link" | "full" | "title" | null>(null);
  const [canManagePost, setCanManagePost] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentComposerVisible, setCommentComposerVisible] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<PostComment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const title = post?.title || "";
  const authorName = post?.author?.name || "익명";
  const authorId = post?.author?.id;
  const dateText = formatKstDateKorean((post as any)?.createdAt);
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
  const loadedPostId = post?.id ?? null;
  const legalGuidelinesUrl = resolveRuntimeLegalDocumentUrl(
    runtimeLegalConfig,
    "guidelines",
    getLegalDocumentUrl("guidelines")
  );
  const postSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "post");
  const userSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "user");
  const reportDetailMaxLength = runtimeLegalConfig?.safety.detailMaxLength;
  const reportDetailRequiredReasonCodes = runtimeLegalConfig?.safety.detailRequiredReasonCodes;
  const topLevelComments = useMemo(
    () => comments.filter((comment) => !comment.parentCommentId),
    [comments]
  );
  const repliesByParentId = useMemo(() => {
    const map = new Map<number, PostComment[]>();
    for (const comment of comments) {
      if (!comment.parentCommentId) continue;
      const current = map.get(comment.parentCommentId) ?? [];
      current.push(comment);
      map.set(comment.parentCommentId, current);
    }
    return map;
  }, [comments]);
  const commentCount = comments.filter((comment) => comment.status === "active").length;

  const onPressBack = () => router.back();
  const showNotFound = error?.kind === "not_found";

  const promptAuthForAction = React.useCallback(
    (message: string, redirectPath = pathname) => {
      Alert.alert("로그인이 필요해요", message, [
        { text: "나중에", style: "cancel" },
        {
          text: "로그인",
          onPress: () => router.push(buildAuthRoute("/(auth)", redirectPath)),
        },
        {
          text: "회원가입",
          onPress: () => router.push(buildAuthRoute("/(auth)/signup", redirectPath)),
        },
      ]);
    },
    [pathname]
  );

  React.useEffect(() => {
    let cancelled = false;

    if (!post?.id) {
      setCanManagePost(false);
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          await getEditablePost(post.id);
          if (!cancelled) setCanManagePost(true);
        } catch {
          if (!cancelled) setCanManagePost(false);
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [post?.id]);

  const handleAuthError = React.useCallback(async () => {
    await signOut();
    promptAuthForAction(
      "로그인 상태가 만료되었어요. 다시 로그인하면 이어서 사용할 수 있어요."
    );
  }, [promptAuthForAction, signOut]);

  const loadComments = React.useCallback(async () => {
    if (!postId) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await listPostComments({ postId, limit: 50, offset: 0 });
      setComments(result.comments);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setComments([]);
        return;
      }
      setCommentsError(
        err instanceof Error ? err.message : "댓글을 불러오지 못했어요."
      );
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  React.useEffect(() => {
    setComments([]);
    setCommentInput("");
    setCommentComposerVisible(false);
    setReplyTarget(null);
    setCommentsError(null);
    if (!postId || loading || error || !loadedPostId) return;
    void loadComments();
  }, [error, loadComments, loadedPostId, loading, postId]);

  const openCommentComposer = React.useCallback(() => {
    if (!token) {
      promptAuthForAction("댓글은 로그인한 회원만 남길 수 있어요.");
      return;
    }
    setCommentComposerVisible(true);
  }, [promptAuthForAction, token]);

  const closeCommentComposer = React.useCallback(() => {
    if (commentSubmitting) return;
    setCommentComposerVisible(false);
    setCommentInput("");
    setReplyTarget(null);
  }, [commentSubmitting]);

  const submitComment = async () => {
    if (!token) {
      promptAuthForAction("댓글은 로그인한 회원만 남길 수 있어요.");
      return;
    }
    if (!postId || commentSubmitting) return;

    const contentToSend = commentInput.trim();
    if (!contentToSend) {
      showToast("댓글 내용을 입력해주세요.", { tone: "error" });
      return;
    }
    if (contentToSend.length > 1000) {
      showToast("댓글은 1000자 이하로 입력해주세요.", { tone: "error" });
      return;
    }

    setCommentSubmitting(true);
    try {
      const created = await createPostComment({
        postId,
        content: contentToSend,
        parentCommentId: replyTarget?.id ?? null,
      });
      setComments((prev) => [...prev, created]);
      setCommentInput("");
      setReplyTarget(null);
      setCommentComposerVisible(false);
      showToast(replyTarget ? "답글을 남겼어요." : "댓글을 남겼어요.", { tone: "success" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await handleAuthError();
        return;
      }
      showToast(
        err instanceof Error ? err.message : "댓글 작성에 실패했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const onPressReply = (comment: PostComment) => {
    if (!token) {
      promptAuthForAction("답글은 로그인한 회원만 남길 수 있어요.");
      return;
    }
    haptics.selection();
    setReplyTarget(comment);
    setCommentComposerVisible(true);
  };

  const onPressDeleteComment = (comment: PostComment) => {
    if (!token || deletingCommentId) return;
    haptics.warning();

    const submit = async () => {
      setDeletingCommentId(comment.id);
      try {
        await deleteComment(comment.id);
        setComments((prev) =>
          prev.map((item) =>
            item.id === comment.id
              ? {
                  ...item,
                  status: "deleted",
                  content: null,
                  author: null,
                  deletedAt: new Date().toISOString(),
                }
              : item
          )
        );
        showToast("댓글을 삭제했어요.", { tone: "success" });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await handleAuthError();
          return;
        }
        showToast("댓글 삭제에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      } finally {
        setDeletingCommentId(null);
      }
    };

    Alert.alert("댓글 삭제", "이 댓글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => void submit() },
    ]);
  };

  const onPressLike = async () => {
    if (!token) {
      promptAuthForAction("공감은 로그인한 회원만 남길 수 있어요.");
      return;
    }
    if (!post || likePending) return;
    haptics.selection();

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
    if (!token) {
      promptAuthForAction("북마크는 로그인한 회원만 사용할 수 있어요.");
      return;
    }
    if (!post) return;
    haptics.selection();
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
      haptics.success();
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
      haptics.success();
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

  const sharePost = async (mode: "image" | "link" | "title" | "full") => {
    if (!post) return;
    if (shareSubmitting) return;

    const shareTitle = title || "글숲";
    const shareContent = content.trim();
    const permalink = buildPostPermalink(post.id);
    const textMode = mode === "image" ? "link" : mode;
    const shareMessage = buildShareText({
      mode: textMode,
      title: shareTitle,
      content: shareContent,
      permalink,
    });
    const requestId = createShareRequestId(post.id);
    const platform = Platform.OS === "web" ? "web" : "mobile";
    const dismissedAction =
      (Share as { dismissedAction?: string }).dismissedAction ?? "dismissedAction";
    const channel =
      mode === "image"
        ? "share_modal_image_png"
        : mode === "link"
          ? "share_modal_link"
          : mode === "full"
            ? "share_modal_full"
            : "share_modal_title_only";

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

    const baseMeta = {
      title_length: shareTitle.length,
      content_length: shareContent.length,
      share_mode: mode,
      permalink,
    };

    try {
      setShareSubmitting(mode);
      setShareModalVisible(false);

      if (mode === "image" && Platform.OS !== "web") {
        const cacheDirectory = FileSystem.cacheDirectory;
        if (!cacheDirectory) {
          throw new Error("File cache directory is unavailable.");
        }

        const canShareFile = await Sharing.isAvailableAsync();
        if (!canShareFile) {
          throw new Error("Native file sharing is unavailable.");
        }

        const imageUrl = buildRenderedPostShareImageUrl(post.id, { format: "png" });
        const downloaded = await FileSystem.downloadAsync(
          imageUrl,
          `${cacheDirectory}${createShareFileName(post.id)}`
        );

        if (downloaded.status < 200 || downloaded.status >= 300) {
          throw new Error(`Image download failed: ${downloaded.status}`);
        }

        await Sharing.shareAsync(downloaded.uri, {
          dialogTitle: shareTitle,
          mimeType: "image/png",
          UTI: "public.png",
        });
        logShareEventSafely("shared", {
          ...baseMeta,
          image_format: "png",
          image_url: imageUrl,
        });
        showToast("이미지 공유가 완료되었어요.", { tone: "success" });
        return;
      }

      const result = await Share.share({
        title: shareTitle,
        message: shareMessage,
        url: permalink,
      });

      if (result.action === Share.sharedAction) {
        logShareEventSafely("shared", {
          ...baseMeta,
          action: result.action,
          activity_type: result.activityType || null,
        });
        showToast("공유가 완료되었어요.", { tone: "success" });
        return;
      }

      if (result.action === dismissedAction) {
        logShareEventSafely("dismissed", {
          ...baseMeta,
          action: result.action,
          activity_type: result.activityType || null,
        });
        return;
      }

      logShareEventSafely("dismissed", {
        ...baseMeta,
        action: result.action || "unknown",
        activity_type: result.activityType || null,
      });
    } catch (shareError) {
      logShareEventSafely("failed", {
        ...baseMeta,
        error: shareError instanceof Error ? shareError.message : "unknown",
      });
      if (__DEV__) {
        logger.warn("[share] post share failed", shareError);
      }
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
    } finally {
      setShareSubmitting(null);
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
    setDeleteConfirmVisible(true);
  };

  const submitDelete = () => {
    if (!post?.id || manageBusy) return;

    void (async () => {
      setManageBusy(true);
      try {
        await deletePost(post.id);
        setDeleteConfirmVisible(false);
        showToast("글을 삭제했어요.", { tone: "success" });
        router.replace("/(tabs)");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setDeleteConfirmVisible(false);
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
  };

  const openGuidelines = React.useCallback(() => {
    void openExternalUrl(legalGuidelinesUrl).catch(() => {
      showToast("가이드라인을 열지 못했어요. 잠시 후 다시 시도해주세요.", {
        tone: "error",
      });
    });
  }, [legalGuidelinesUrl, showToast]);

  const openSupport = React.useCallback(() => {
    void openExternalUrl(getSupportUrl()).catch(() => {
      showToast("지원 페이지를 열지 못했어요. 잠시 후 다시 시도해주세요.", {
        tone: "error",
      });
    });
  }, [showToast]);

  const submitPostReport = React.useCallback(
    async (reasonCode: string, detail?: string) => {
      if (!token) {
        promptAuthForAction("신고는 로그인한 회원만 할 수 있어요.");
        return;
      }
      if (!postId) return;

      setReportSubmitting(true);
      try {
        const result = await reportPost({ postId, reasonCode, detail });
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
    [handleAuthError, postId, promptAuthForAction, showToast, token]
  );

  const submitBlockAuthor = React.useCallback(async () => {
    if (!authorId) return;
    if (!token) {
      promptAuthForAction("차단은 로그인한 회원만 할 수 있어요.");
      return;
    }

    try {
      const result = await blockUserById({
        userId: authorId,
        reasonCode: userSafetyReasons[0]?.code || "harassment",
        contextPostId: postId,
      });
      showToast(result.message, { tone: "success" });
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
        return;
      }
      showToast(
        err instanceof Error
          ? err.message
          : "차단 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    }
  }, [
    authorId,
    handleAuthError,
    postId,
    promptAuthForAction,
    showToast,
    token,
    userSafetyReasons,
  ]);

  const onPressSafetyMenu = React.useCallback(() => {
    setSafetyMenuVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* ✅ 고정 TopBar (기존 UX 유지) */}
      <PostTopBar
        onPressBack={onPressBack}
        styles={styles}
        rightAction={{
          onPress: onPressSafetyMenu,
          iconName: "ellipsis-vertical",
          testID: "post-safety-menu-btn",
          accessibilityLabel: "더보기 메뉴",
        }}
      />

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
              renderImages={post.renderImages ?? null}
            />

            <View style={styles.commentSection} testID="post-comments-section">
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentTitle}>댓글 {commentCount}</Text>
                <View style={styles.commentHeaderActions}>
                  <Pressable
                    onPress={() => void loadComments()}
                    disabled={commentsLoading}
                    accessibilityRole="button"
                    testID="post-comments-refresh-btn"
                  >
                    <Text style={styles.commentRefreshText}>
                      {commentsLoading ? "새로고침 중" : "새로고침"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={openCommentComposer}
                    accessibilityRole="button"
                    style={styles.commentOpenBtn}
                    testID="post-comment-open-btn"
                  >
                    <Text style={styles.commentOpenText}>댓글 쓰기</Text>
                  </Pressable>
                </View>
              </View>

              {commentComposerVisible ? (
                <View style={styles.commentComposer}>
                  {replyTarget ? (
                    <View style={styles.replyTargetRow}>
                      <Text style={styles.replyTargetText} numberOfLines={1}>
                        {replyTarget.author?.displayName || "댓글"}님에게 답글
                      </Text>
                      <Pressable
                        onPress={closeCommentComposer}
                        accessibilityRole="button"
                        testID="post-comment-reply-cancel-btn"
                      >
                        <Text style={styles.replyCancelText}>취소</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.replyTargetRow}>
                      <Text style={styles.replyTargetText}>새 댓글 작성</Text>
                      <Pressable
                        onPress={closeCommentComposer}
                        accessibilityRole="button"
                        testID="post-comment-composer-cancel-btn"
                      >
                        <Text style={styles.replyCancelText}>취소</Text>
                      </Pressable>
                    </View>
                  )}
                  <TextInput
                    value={commentInput}
                    onChangeText={setCommentInput}
                    placeholder={replyTarget ? "답글을 남겨보세요" : "댓글을 남겨보세요"}
                    placeholderTextColor="#8d938f"
                    multiline
                    maxLength={1000}
                    editable={Boolean(token) && !commentSubmitting}
                    style={styles.commentInput}
                    testID="post-comment-input"
                  />
                  <View style={styles.commentComposerFooter}>
                    <Text style={styles.commentInputCount}>{commentInput.length}/1000</Text>
                    <Pressable
                      onPress={() => void submitComment()}
                      disabled={!token || commentSubmitting || commentInput.trim().length === 0}
                      style={[
                        styles.commentSubmitBtn,
                        (!token || commentSubmitting || commentInput.trim().length === 0) &&
                          styles.commentSubmitBtnDisabled,
                      ]}
                      accessibilityRole="button"
                      testID="post-comment-submit-btn"
                    >
                      <Text style={styles.commentSubmitText}>
                        {commentSubmitting ? "등록 중" : replyTarget ? "답글 등록" : "등록"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {commentsLoading && comments.length === 0 ? (
                <View style={styles.commentLoadingRow}>
                  <ActivityIndicator color="#2d5a3d" />
                  <Text style={styles.commentHint}>댓글을 불러오는 중...</Text>
                </View>
              ) : commentsError ? (
                <View style={styles.commentEmptyBox}>
                  <Text style={styles.commentHint}>{commentsError}</Text>
                </View>
              ) : topLevelComments.length === 0 ? (
                <View style={styles.commentEmptyBox}>
                  <Text style={styles.commentHint}>아직 댓글이 없어요.</Text>
                </View>
              ) : (
                <View style={styles.commentList}>
                  {topLevelComments.map((comment) => {
                    const replies = repliesByParentId.get(comment.id) ?? [];
                    return (
                      <View key={comment.id} style={styles.commentThread}>
                        <View style={styles.commentItem}>
                          <View style={styles.commentMetaRow}>
                            <Text style={styles.commentAuthor}>
                              {comment.author?.displayName || "삭제된 댓글"}
                            </Text>
                            <Text style={styles.commentDate}>
                              {formatKstDateKorean(comment.createdAt)}
                            </Text>
                          </View>
                          <Text style={styles.commentBody}>
                            {comment.status === "deleted"
                              ? "삭제된 댓글입니다."
                              : comment.content}
                          </Text>
                          {comment.status === "active" ? (
                            <View style={styles.commentActionRow}>
                              <Pressable
                                onPress={() => onPressReply(comment)}
                                accessibilityRole="button"
                                testID={`post-comment-reply-btn-${comment.id}`}
                              >
                                <Text style={styles.commentActionText}>답글</Text>
                              </Pressable>
                              {canManagePost ? (
                                <Pressable
                                  onPress={() => onPressDeleteComment(comment)}
                                  disabled={deletingCommentId === comment.id}
                                  accessibilityRole="button"
                                  testID={`post-comment-delete-btn-${comment.id}`}
                                >
                                  <Text style={styles.commentDangerText}>
                                    {deletingCommentId === comment.id ? "삭제 중" : "삭제"}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          ) : null}
                        </View>

                        {replies.length > 0 ? (
                          <View style={styles.replyList}>
                            {replies.map((reply) => (
                              <View key={reply.id} style={styles.replyItem}>
                                <View style={styles.commentMetaRow}>
                                  <Text style={styles.commentAuthor}>
                                    {reply.author?.displayName || "삭제된 댓글"}
                                  </Text>
                                  <Text style={styles.commentDate}>
                                    {formatKstDateKorean(reply.createdAt)}
                                  </Text>
                                </View>
                                <Text style={styles.commentBody}>
                                  {reply.status === "deleted"
                                    ? "삭제된 댓글입니다."
                                    : reply.content}
                                </Text>
                                {canManagePost && reply.status === "active" ? (
                                  <View style={styles.commentActionRow}>
                                    <Pressable
                                      onPress={() => onPressDeleteComment(reply)}
                                      disabled={deletingCommentId === reply.id}
                                      accessibilityRole="button"
                                      testID={`post-comment-delete-btn-${reply.id}`}
                                    >
                                      <Text style={styles.commentDangerText}>
                                        {deletingCommentId === reply.id ? "삭제 중" : "삭제"}
                                      </Text>
                                    </Pressable>
                                  </View>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

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
                    testID="post-manage-delete-btn"
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
              이미지, 링크, 본문 중 원하는 방식으로 보낼 수 있어요.
            </Text>

            <View style={styles.bookmarkModalList}>
              {Platform.OS !== "web" ? (
                <>
                  <Pressable
                    onPress={() => void sharePost("image")}
                    disabled={Boolean(shareSubmitting)}
                    style={[
                      styles.bookmarkModalListItem,
                      shareSubmitting && styles.bookmarkModalListItemDisabled,
                    ]}
                  >
                    <Text style={styles.bookmarkModalListItemName}>이미지 저장/공유</Text>
                    <Text style={styles.bookmarkModalListItemStatus}>
                      {shareSubmitting === "image" ? "준비 중" : "PNG"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void sharePost("link")}
                    disabled={Boolean(shareSubmitting)}
                    style={[
                      styles.bookmarkModalListItem,
                      shareSubmitting && styles.bookmarkModalListItemDisabled,
                    ]}
                  >
                    <Text style={styles.bookmarkModalListItemName}>링크 공유</Text>
                    <Text style={styles.bookmarkModalListItemStatus}>
                      {shareSubmitting === "link" ? "공유 중" : "추천"}
                    </Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                onPress={() => void sharePost("full")}
                disabled={Boolean(shareSubmitting)}
                style={[
                  styles.bookmarkModalListItem,
                  shareSubmitting && styles.bookmarkModalListItemDisabled,
                ]}
              >
                <Text style={styles.bookmarkModalListItemName}>본문까지 공유</Text>
                <Text style={styles.bookmarkModalListItemStatus}>
                  {shareSubmitting === "full" ? "공유 중" : Platform.OS === "web" ? "추천" : "텍스트"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void sharePost("title")}
                disabled={Boolean(shareSubmitting)}
                style={[
                  styles.bookmarkModalListItem,
                  shareSubmitting && styles.bookmarkModalListItemDisabled,
                ]}
              >
                <Text style={styles.bookmarkModalListItemName}>제목만 공유</Text>
                <Text style={styles.bookmarkModalListItemStatus}>
                  {shareSubmitting === "title" ? "공유 중" : "간단히"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                if (shareSubmitting) return;
                setShareModalVisible(false);
              }}
              disabled={Boolean(shareSubmitting)}
              style={styles.bookmarkModalCloseBtn}
            >
              <Text style={styles.bookmarkModalCloseBtnText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={safetyMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSafetyMenuVisible(false)}
      >
        <View style={styles.bookmarkModalOverlay}>
          <View style={styles.bookmarkModalCard}>
            <Text style={styles.bookmarkModalTitle}>더보기</Text>
            <Text style={styles.bookmarkModalDescription}>
              {canManagePost
                ? "필요한 메뉴를 선택해 주세요."
                : "공유, 신고, 차단, 가이드라인을 확인할 수 있어요."}
            </Text>

            <View style={styles.modalActionList}>
              <Pressable
                onPress={() => {
                  setSafetyMenuVisible(false);
                  setShareModalVisible(true);
                }}
                style={styles.modalActionBtn}
              >
                <Text style={styles.modalActionText}>공유하기</Text>
              </Pressable>

              {!canManagePost ? (
                <Pressable
                  onPress={() => {
                    setSafetyMenuVisible(false);
                    setReportReasonVisible(true);
                  }}
                  style={styles.modalActionBtn}
                >
                  <Text style={styles.modalActionText}>게시글 신고</Text>
                </Pressable>
              ) : null}

              {!canManagePost && authorId ? (
                <Pressable
                  onPress={() => {
                    setSafetyMenuVisible(false);
                    setBlockConfirmVisible(true);
                  }}
                  style={[styles.modalActionBtn, styles.modalActionBtnDanger]}
                >
                  <Text style={[styles.modalActionText, styles.modalActionTextDanger]}>
                    작성자 차단
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  setSafetyMenuVisible(false);
                  openGuidelines();
                }}
                style={[styles.modalActionBtn, styles.modalActionBtnGhost]}
              >
                <Text style={styles.modalActionText}>커뮤니티 가이드라인</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setSafetyMenuVisible(false);
                  openSupport();
                }}
                style={[styles.modalActionBtn, styles.modalActionBtnGhost]}
              >
                <Text style={styles.modalActionText}>도움말 및 지원</Text>
              </Pressable>

              <Pressable
                onPress={() => setSafetyMenuVisible(false)}
                style={[styles.modalActionBtn, styles.modalActionBtnGhost]}
              >
                <Text style={styles.modalActionText}>닫기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SafetyActionSheet
        visible={deleteConfirmVisible}
        title="글 삭제"
        description="정말 이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없어요."
        onRequestClose={() => {
          if (!manageBusy) setDeleteConfirmVisible(false);
        }}
        actions={[
          {
            label: manageBusy ? "삭제 중..." : "삭제하기",
            variant: "danger",
            disabled: manageBusy,
            onPress: submitDelete,
            testID: "post-delete-confirm-btn",
          },
          {
            label: "취소",
            variant: "ghost",
            disabled: manageBusy,
            onPress: () => setDeleteConfirmVisible(false),
            testID: "post-delete-cancel-btn",
          },
        ]}
      />

      <Modal
        visible={blockConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockConfirmVisible(false)}
      >
        <View style={styles.bookmarkModalOverlay}>
          <View style={styles.bookmarkModalCard}>
            <Text style={styles.bookmarkModalTitle}>작성자 차단</Text>
            <Text style={styles.bookmarkModalDescription}>
              {`${authorName}님의 글과 프로필을 숨길까요? 계정 센터에서 다시 해제할 수 있어요.`}
            </Text>

            <View style={styles.modalActionList}>
              <Pressable
                onPress={() => {
                  setBlockConfirmVisible(false);
                  void submitBlockAuthor();
                }}
                style={[styles.modalActionBtn, styles.modalActionBtnDanger]}
              >
                <Text style={[styles.modalActionText, styles.modalActionTextDanger]}>
                  차단하기
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setBlockConfirmVisible(false)}
                style={[styles.modalActionBtn, styles.modalActionBtnGhost]}
              >
                <Text style={styles.modalActionText}>취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
