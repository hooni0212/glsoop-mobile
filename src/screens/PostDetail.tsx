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
import { PremiumFeaturePrompt } from "@/components/premium/PremiumFeaturePrompt";
import { PostTopBar } from "@/components/post/PostTopBar";
import { releaseConfig } from "@/config/release";
import { useAuth } from "@/auth/AuthContext";
import { setBookmark, useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { useRuntimeLegalConfig } from "@/hooks/useRuntimeLegalConfig";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { useToast } from "@/feedback/ToastProvider";
import { togglePostLike } from "@/services/likeService";
import {
  createPostComment,
  deleteComment,
  listPostComments,
  PostComment,
  toggleCommentLike,
} from "@/services/commentService";
import { deletePost, getEditablePost } from "@/services/postService";
import { blockUserById, pickSafetyReasons, reportPost } from "@/services/safetyService";
import { logShareEvent } from "@/services/shareService";
import {
  consumePhotoSave,
  PhotoSaveAccessMethod,
  PhotoSavePlatform,
  getPhotoSavePlatform,
  getPhotoSavePolicy,
  PhotoSavePolicy,
  recordPhotoSaveRewardedGrant,
} from "@/services/photoSaveService";
import { hasActiveEntitlement, listMyEntitlements } from "@/services/entitlementService";
import { buildAuthRoute } from "@/lib/authRedirect";
import { formatKstDateKorean } from "@/lib/dateTime";
import { ApiError } from "@/lib/errors";
import { buildRenderedPostShareImageUrl } from "@/lib/feedImage";
import * as haptics from "@/lib/haptics";
import { logger } from "@/lib/logger";
import { resetToAppRoot } from "@/navigation/rootNavigation";
import { normalizePostBackgroundTemplateId } from "@/lib/postBackgroundTemplates";
import { resolvePostLayout } from "@/lib/postLayout";
import { resolvePostRenderImages } from "@/lib/postRenderImages";
import { showRewardedPhotoSaveAd } from "@/lib/rewardedPhotoSaveAd";
import { buildPremiumPath, trackPremiumFunnelEvent } from "@/lib/premiumDiscovery";
import { tokens } from "@/theme/tokens";
import type { Post } from "@/types/post";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  addPostToBookmarkList,
  BookmarkList,
  createBookmarkList,
  listRecentBookmarkLists,
  listPostBookmarkLists,
  removePostFromBookmarkList,
} from "@/services/bookmarkService";
import { saveSentenceFrameWidgetSnapshot } from "@/services/widgetSnapshotService";

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

function createShareFileName(postId: string, pageNumber = 1) {
  const safePostId = postId.replace(/[^a-zA-Z0-9_-]/g, "-") || "card";
  const pageSuffix = pageNumber > 1 ? `_p${pageNumber}` : "";
  return `glsoop_post_${safePostId}${pageSuffix}_${Date.now()}.png`;
}

async function downloadPostShareImage(
  postId: string,
  imageUrl: string,
  pageNumber = 1
) {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error("공유 이미지를 임시 저장할 공간을 찾지 못했어요.");
  }

  const downloaded = await FileSystem.downloadAsync(
    imageUrl,
    `${cacheDirectory}${createShareFileName(postId, pageNumber)}`
  );

  if (downloaded.status < 200 || downloaded.status >= 300) {
    throw new Error("공유 이미지를 내려받지 못했어요.");
  }

  return downloaded.uri;
}

function getPostShareImagePageCount(post: Post) {
  const renderImages = resolvePostRenderImages(post);
  const pageCount = Math.max(1, renderImages?.pageCount || renderImages?.images.length || 1);
  const pageCap = Math.max(1, renderImages?.pageCap || pageCount);
  return Math.min(pageCount, pageCap);
}

function buildPostShareImageUrls({
  post,
  template,
}: {
  post: Post;
  template: ReturnType<typeof normalizePostBackgroundTemplateId>;
}) {
  const pageCount = getPostShareImagePageCount(post);
  return Array.from({ length: pageCount }, (_item, index) =>
    buildRenderedPostShareImageUrl(post.id, {
      format: "png",
      template,
      page: index + 1,
    })
  );
}

type MediaLibrarySavePermissionResult =
  | { status: "granted" }
  | { status: "unavailable"; message: string }
  | {
      status: "denied";
      source: "existing" | "request";
      message: string;
    };

async function requestMediaLibrarySavePermission(): Promise<MediaLibrarySavePermissionResult> {
  const isAvailable = await MediaLibrary.isAvailableAsync();
  if (!isAvailable) {
    return {
      status: "unavailable",
      message: "이 기기에서는 사진 앱 저장을 지원하지 않아요.",
    };
  }

  const currentPermission = await MediaLibrary.getPermissionsAsync(true);
  if (currentPermission.granted) {
    return { status: "granted" };
  }

  if (!currentPermission.canAskAgain) {
    return {
      status: "denied",
      source: "existing",
      message: "사진 앱 저장 권한이 꺼져 있어요. 기기 설정에서 글숲의 사진 권한을 허용해주세요.",
    };
  }

  const nextPermission = await MediaLibrary.requestPermissionsAsync(true);
  if (!nextPermission.granted) {
    return {
      status: "denied",
      source: "request",
      message: "사진 앱에 저장하려면 사진 추가 권한이 필요해요.",
    };
  }

  return { status: "granted" };
}

async function shareImageFile({
  imageUri,
  shareTitle,
}: {
  imageUri: string;
  shareTitle: string;
}) {
  const canShareFile = await Sharing.isAvailableAsync();
  if (!canShareFile) {
    throw new Error("이 기기에서는 이미지 공유를 지원하지 않아요.");
  }

  await Sharing.shareAsync(imageUri, {
    dialogTitle: shareTitle,
    mimeType: "image/png",
    UTI: "public.png",
  });
}

function getShareFailureMessage(mode: ShareMode, error: unknown) {
  if (mode === "imageSave") {
    return error instanceof Error && error.message
      ? error.message
      : "이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요.";
  }
  return "공유에 실패했어요. 잠시 후 다시 시도해주세요.";
}

function getShareProgressMessage(mode: ShareMode) {
  if (mode === "imageSave") return "이미지를 사진 앱에 저장하고 있어요.";
  if (mode === "imageShare") return "이미지를 준비하고 있어요.";
  return "공유 화면을 여는 중이에요.";
}

type ShareMode = "imageShare" | "imageSave" | "link";
const PHOTO_SAVE_AD_CANCELLED = "PHOTO_SAVE_AD_CANCELLED";

type PreparedPhotoSaveAccess = {
  method: PhotoSaveAccessMethod;
  platform: PhotoSavePlatform | null;
  policy: PhotoSavePolicy | null;
  rewardedGrantId: number | null;
};

function createPhotoSaveAdCancelledError() {
  const error = new Error("사진 저장 광고 시청을 취소했어요.");
  (error as Error & { code?: string }).code = PHOTO_SAVE_AD_CANCELLED;
  return error;
}

function isPhotoSaveAdCancelled(error: unknown) {
  return (
    error instanceof Error &&
    (error as Error & { code?: string }).code === PHOTO_SAVE_AD_CANCELLED
  );
}

type RewardedPhotoSaveChoice = "cancel" | "ad" | "premium";

function confirmRewardedPhotoSave(policy: PhotoSavePolicy) {
  const freeLimit =
    typeof policy.free_daily_limit === "number"
      ? `하루 ${policy.free_daily_limit}회 무료 저장을 모두 사용했어요.`
      : "무료 저장 횟수를 모두 사용했어요.";

  void trackPremiumFunnelEvent("premium_entry_impression", "photo_save", {
    placement: "rewarded_ad_prompt",
  });

  return new Promise<RewardedPhotoSaveChoice>((resolve) => {
    let settled = false;
    const settle = (value: RewardedPhotoSaveChoice) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      "광고 보고 사진 저장",
      `${freeLimit}\n광고를 끝까지 보면 이 글 이미지를 사진 앱에 저장할 수 있어요.`,
      [
        { text: "나중에", style: "cancel", onPress: () => settle("cancel") },
        { text: "프리미엄 보기", onPress: () => settle("premium") },
        { text: "광고 보기", onPress: () => settle("ad") },
      ],
      { cancelable: true, onDismiss: () => settle("cancel") }
    );
  });
}

export default function PostDetail() {
  // 상세 화면은 Tab 도크가 아닌 Action 도크 규격을 사용
  const dock = useBottomDock();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createPostDetailStyles(dock.action.height, insets.top),
    [dock.action.height, insets.top]
  );

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
  const [shareSubmitting, setShareSubmitting] = useState<ShareMode | null>(null);
  const [photoSavePermissionDeniedOnce, setPhotoSavePermissionDeniedOnce] = useState(false);
  const [canManagePost, setCanManagePost] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [sentenceFramePending, setSentenceFramePending] = useState(false);
  const [premiumPromptVisible, setPremiumPromptVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentKeyboardVisible, setCommentKeyboardVisible] = useState(false);
  const [replyTarget, setReplyTarget] = useState<PostComment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [commentLikePending, setCommentLikePending] = useState<Record<number, boolean>>({});

  const title = post?.title || "";
  const authorName = post?.author?.name || "익명";
  const authorId = post?.author?.id;
  const authorProfilePhoto =
    post?.author?.profilePhotoThumbnailUrl || post?.author?.profilePhotoUrl || "";
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
  const canCommentOnPost = Boolean((post as any)?.viewer?.canComment);
  const commentPolicy = (post as any)?.commentPolicy || "logged_in";
  const commentDisabledReason = !token
    ? "로그인 후 댓글을 남길 수 있어요."
    : !canCommentOnPost
      ? commentPolicy === "closed"
        ? "댓글이 닫힌 글이에요."
        : commentPolicy === "followers"
          ? "팔로워만 댓글을 남길 수 있어요."
          : commentPolicy === "author_only"
            ? "글쓴이만 댓글을 남길 수 있어요."
            : "댓글을 작성할 권한이 없어요."
      : null;
  const canWriteComment = Boolean(token) && canCommentOnPost;
  const likeSnapshot = useLikeSnapshot(postId, fallbackIsLiked, fallbackLikeCount);
  const likeCount = likeSnapshot.likeCount;
  const isLiked = likeSnapshot.liked;
  const fallbackBookmarked = Boolean((post as any)?.viewer?.isBookmarked);
  const bookmarkSnapshot = useBookmarkSnapshot(postId, fallbackBookmarked);
  const isBookmarked = bookmarkSnapshot.bookmarked;
  const loadedPostId = post?.id ?? null;
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

  const onPressBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    void resetToAppRoot();
  };
  const showNotFound = error?.kind === "not_found";

  const promptAuthForAction = React.useCallback(
    (message: string, redirectPath = pathname) => {
      showToast(message, { tone: "error" });
      router.push(buildAuthRoute("/(auth)/login", redirectPath));
    },
    [pathname, showToast]
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
    setReplyTarget(null);
    setCommentsError(null);
    if (!postId || loading || error || !loadedPostId) return;
    void loadComments();
  }, [error, loadComments, loadedPostId, loading, postId]);

  React.useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setCommentKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setCommentKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openCommentsSheet = React.useCallback(() => {
    setCommentsExpanded(true);
  }, []);

  const closeCommentsSheet = React.useCallback(() => {
    Keyboard.dismiss();
    setCommentsExpanded(false);
    setReplyTarget(null);
    setCommentKeyboardVisible(false);
  }, []);

  const dismissCommentKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const clearCommentDraft = React.useCallback(() => {
    if (commentSubmitting) return;
    setCommentInput("");
    setReplyTarget(null);
  }, [commentSubmitting]);

  const submitComment = async () => {
    if (!token) {
      promptAuthForAction("댓글은 로그인한 회원만 남길 수 있어요.");
      return;
    }
    if (!canCommentOnPost) {
      showToast(commentDisabledReason || "댓글을 작성할 수 없어요.", { tone: "error" });
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
      Keyboard.dismiss();
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
    if (!canCommentOnPost) {
      showToast(commentDisabledReason || "답글을 작성할 수 없어요.", { tone: "error" });
      return;
    }
    haptics.selection();
    setCommentsExpanded(true);
    setReplyTarget(comment);
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

  const onPressCommentLike = async (comment: PostComment) => {
    if (!token) {
      promptAuthForAction("댓글 공감는 로그인한 회원만 남길 수 있어요.");
      return;
    }
    if (comment.status !== "active" || commentLikePending[comment.id]) return;
    haptics.selection();

    const prevLiked = comment.likedByMe;
    const prevCount = comment.likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? { ...item, likedByMe: nextLiked, likeCount: nextCount }
          : item
      )
    );
    setCommentLikePending((prev) => ({ ...prev, [comment.id]: true }));

    try {
      const result = await toggleCommentLike(comment.id);
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? { ...item, likedByMe: result.liked, likeCount: result.likeCount }
            : item
        )
      );
    } catch (err) {
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? { ...item, likedByMe: prevLiked, likeCount: prevCount }
            : item
        )
      );
      if (err instanceof ApiError && err.status === 401) {
        await handleAuthError();
        return;
      }
      showToast("댓글 공감 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
    } finally {
      setCommentLikePending((prev) => ({ ...prev, [comment.id]: false }));
    }
  };

  const onPressLike = async () => {
    if (!token) {
      promptAuthForAction("공감는 로그인한 회원만 남길 수 있어요.");
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
        showToast("공감 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
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
      promptAuthForAction("책갈피는 로그인한 회원만 사용할 수 있어요.");
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
        err instanceof Error ? err.message : "책갈피 폴더를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
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
        err instanceof Error ? err.message : "책갈피 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
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

  const preparePhotoSaveAccess = async ({
    currentPostId,
    meta,
  }: {
    currentPostId: string;
    meta: Record<string, unknown>;
  }): Promise<PreparedPhotoSaveAccess> => {
    const platform = getPhotoSavePlatform();
    if (!platform) {
      return { method: "free", platform: null, policy: null, rewardedGrantId: null };
    }

    if (!token) {
      promptAuthForAction("사진 저장은 로그인한 회원만 사용할 수 있어요.");
      throw createPhotoSaveAdCancelledError();
    }

    const policy = await getPhotoSavePolicy(platform);
    if (policy.can_save_without_ad) {
      const method = policy.is_premium ? "premium" : "free";
      return { method, platform, policy, rewardedGrantId: null };
    }

    if (!policy.requires_ad || !policy.rewarded_ad_unit_id) {
      throw new Error("사진 저장 광고를 준비하지 못했어요. 잠시 후 다시 시도해주세요.");
    }

    const photoSaveChoice = await confirmRewardedPhotoSave(policy);
    if (photoSaveChoice === "premium") {
      void trackPremiumFunnelEvent("premium_entry_click", "photo_save", {
        placement: "rewarded_ad_prompt",
      });
      router.push(buildPremiumPath("photo_save") as never);
      throw createPhotoSaveAdCancelledError();
    }
    if (photoSaveChoice !== "ad") {
      throw createPhotoSaveAdCancelledError();
    }

    const reward = await showRewardedPhotoSaveAd(policy.rewarded_ad_unit_id);
    const grant = await recordPhotoSaveRewardedGrant({
      postId: currentPostId,
      platform,
      adUnitId: policy.rewarded_ad_unit_id,
      rewardType: reward.type,
      rewardAmount: reward.amount,
      meta: {
        ...meta,
        photo_save_phase: "reward_earned",
        requested_ad_unit_id: reward.requestedAdUnitId,
        shown_ad_unit_id: reward.adUnitId,
        used_test_ad_unit: reward.usedTestAdUnit,
      },
    });

    return { method: "rewarded_ad", platform, policy, rewardedGrantId: grant.id };
  };

  const sharePost = async (mode: ShareMode) => {
    if (!post) return;
    if (shareSubmitting) return;

    const shareTitle = title || "글숲";
    const shareContent = content.trim();
    const permalink = buildPostPermalink(post.id);
    const isImageMode = mode === "imageShare" || mode === "imageSave";
    const shareMessage = permalink;
    const requestId = createShareRequestId(post.id);
    const shouldCloseShareModal = shareModalVisible;
    const platform = Platform.OS === "web" ? "web" : "mobile";
    const dismissedAction =
      (Share as { dismissedAction?: string }).dismissedAction ?? "dismissedAction";
    const channel =
      mode === "imageShare"
        ? "share_modal_image_png"
        : mode === "imageSave"
          ? "share_modal_image_save"
          : "share_modal_link";

    const logShareEventSafely = (
      result: "shared" | "dismissed" | "failed",
      meta?: Record<string, unknown>
    ) => {
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

      if (isImageMode && Platform.OS !== "web") {
        const shareTemplate = normalizePostBackgroundTemplateId(
          post.renderImages?.template ?? postLayout.presetId
        );
        const imageUrls = buildPostShareImageUrls({
          post,
          template: shareTemplate,
        });
        const imageUrl = imageUrls[0] ?? buildRenderedPostShareImageUrl(post.id, {
          format: "png",
          template: shareTemplate,
        });
        const imageMeta = {
          ...baseMeta,
          image_format: "png",
          image_template: shareTemplate,
          image_url: imageUrl,
          image_urls: imageUrls,
          image_count: imageUrls.length,
          author_signature_policy: "post_author_auto",
        };

        if (mode === "imageSave") {
          const permission = await requestMediaLibrarySavePermission();
          if (permission.status === "unavailable") {
            throw new Error(permission.message);
          }

          if (permission.status === "denied") {
            const shouldOpenSettingsPrompt =
              photoSavePermissionDeniedOnce || permission.source === "existing";
            setPhotoSavePermissionDeniedOnce(true);

            if (shouldOpenSettingsPrompt) {
              Alert.alert(
                "사진 저장 권한이 꺼져 있어요",
                "설정에서 글숲의 사진 추가 권한을 허용하면 글 이미지를 사진 앱에 저장할 수 있어요.",
                [
                  { text: "나중에", style: "cancel" },
                  {
                    text: "설정 열기",
                    onPress: () => {
                      Linking.openSettings().catch((settingsError) => {
                        if (__DEV__) {
                          logger.warn("[share] failed to open app settings", settingsError);
                        }
                        showToast("설정을 열지 못했어요. 기기 설정에서 글숲 권한을 확인해주세요.", {
                          tone: "error",
                        });
                      });
                    },
                  },
                ]
              );
              logShareEventSafely("failed", {
                ...imageMeta,
                action: "photo_permission_settings_prompt",
                permission_source: permission.source,
              });
              return;
            }

            const imageUri = await downloadPostShareImage(
              post.id,
              imageUrl,
              1
            );
            await shareImageFile({ imageUri, shareTitle });
            logShareEventSafely("shared", {
              ...imageMeta,
              action: "photo_permission_share_fallback",
              permission_source: permission.source,
            });
            showToast("사진 앱 권한이 없어 공유 화면으로 대신 열었어요.");
            return;
          }

          const photoSaveAccess = await preparePhotoSaveAccess({
            currentPostId: post.id,
            meta: {
              ...imageMeta,
            },
          });

          const imageUris: string[] = [];
          for (const [index, nextImageUrl] of imageUrls.entries()) {
            imageUris.push(
              await downloadPostShareImage(
                post.id,
                nextImageUrl,
                index + 1
              )
            );
          }

          for (const imageUri of imageUris) {
            await MediaLibrary.saveToLibraryAsync(imageUri);
          }
          setPhotoSavePermissionDeniedOnce(false);

          let photoSavePolicy = photoSaveAccess.policy;
          if (photoSaveAccess.platform) {
            try {
              const consumed = await consumePhotoSave({
                postId: post.id,
                platform: photoSaveAccess.platform,
                method: photoSaveAccess.method,
                rewardedGrantId: photoSaveAccess.rewardedGrantId,
                requestId,
                meta: {
                  ...imageMeta,
                  photo_save_phase: "media_library_saved",
                },
              });
              photoSavePolicy = consumed.policy;
            } catch (consumeError) {
              logShareEventSafely("shared", {
                ...imageMeta,
                action: "saved_to_library_consume_failed",
                photo_save_access_type: photoSaveAccess.method,
                photo_save_free_remaining: photoSavePolicy?.free_remaining ?? null,
                error: consumeError instanceof Error ? consumeError.message : "unknown",
              });
              if (__DEV__) {
                logger.warn("[share] photo save consume failed after library save", consumeError);
              }
              showToast("이미지를 사진 앱에 저장했어요. 저장 기록 동기화는 잠시 후 다시 확인해주세요.", {
                tone: "success",
              });
              return;
            }
          }

          logShareEventSafely("shared", {
            ...imageMeta,
            action: "saved_to_library",
            photo_save_access_type: photoSaveAccess.method,
            photo_save_free_remaining: photoSavePolicy?.free_remaining ?? null,
          });
          showToast(
            imageUris.length > 1
              ? `${imageUris.length}장의 이미지를 사진 앱에 저장했어요.`
              : "이미지를 사진 앱에 저장했어요.",
            { tone: "success" }
          );
          return;
        }

        const imageUri = await downloadPostShareImage(
          post.id,
          imageUrl,
          1
        );
        await shareImageFile({ imageUri, shareTitle });
        logShareEventSafely("shared", imageMeta);
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
      if (mode === "imageSave" && isPhotoSaveAdCancelled(shareError)) {
        logShareEventSafely("dismissed", {
          ...baseMeta,
          action: "photo_save_ad_cancelled",
        });
        return;
      }

      if (
        shareError instanceof ApiError &&
        (shareError.status === 401 || shareError.status === 403)
      ) {
        await handleAuthError();
        return;
      }

      logShareEventSafely("failed", {
        ...baseMeta,
        error: shareError instanceof Error ? shareError.message : "unknown",
      });
      if (__DEV__) {
        logger.warn("[share] post share failed", shareError);
      }
      showToast(getShareFailureMessage(mode, shareError), { tone: "error" });
    } finally {
      setShareSubmitting(null);
      if (shouldCloseShareModal) {
        setShareModalVisible(false);
      }
    }
  };

  const onPressShare = () => {
    if (!post) return;
    setShareModalVisible(true);
  };

  const onPressSentenceFrame = () => {
    if (!post || sentenceFramePending) return;
    if (!token) {
      setSafetyMenuVisible(false);
      promptAuthForAction("문장 액자는 로그인 후 사용할 수 있어요.");
      return;
    }
    if (!isBookmarked) {
      setSafetyMenuVisible(false);
      showToast("책갈피에 저장한 글만 문장 액자에 담을 수 있어요.", { tone: "error" });
      return;
    }

    void (async () => {
      setSentenceFramePending(true);
      try {
        const entitlements = await listMyEntitlements();
        if (!hasActiveEntitlement(entitlements)) {
          setSafetyMenuVisible(false);
          setPremiumPromptVisible(true);
          return;
        }

        const result = await saveSentenceFrameWidgetSnapshot(post);
        setSafetyMenuVisible(false);
        if (result.ok) {
          showToast("문장 액자 위젯에 담았어요.", { tone: "success" });
        } else if (result.reason === "unavailable") {
          showToast("정식 앱 빌드에서 문장 액자 위젯을 사용할 수 있어요.", {
            tone: "error",
          });
        } else {
          showToast("문장 액자 저장에 실패했어요. 잠시 후 다시 시도해주세요.", {
            tone: "error",
          });
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setSafetyMenuVisible(false);
          await handleAuthError();
          return;
        }
        showToast("문장 액자 저장에 실패했어요. 잠시 후 다시 시도해주세요.", {
          tone: "error",
        });
      } finally {
        setSentenceFramePending(false);
      }
    })();
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
        await resetToAppRoot();
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
      await resetToAppRoot();
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

  const refreshDetail = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  const showBlockingShareProgress = Boolean(shareSubmitting && !shareModalVisible);
  const blockingShareProgressMessage = shareSubmitting
    ? getShareProgressMessage(shareSubmitting)
    : "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
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

      {loading && !post ? (
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={loading && Boolean(post)}
                onRefresh={() => void refreshDetail()}
              />
            }
          >
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
            <View style={styles.detailMetaBlock}>
              <View style={styles.metaRow}>
                {authorId ? (
                  <Pressable
                    onPress={() => router.push(`/users/${authorId}`)}
                    accessibilityRole="button"
                    testID="post-author-btn"
                    style={styles.metaAuthorPress}
                  >
                    {authorProfilePhoto ? (
                      <Image
                        source={{ uri: authorProfilePhoto }}
                        style={styles.metaAuthorPhoto}
                        contentFit="cover"
                        transition={120}
                      />
                    ) : null}
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
              <PostMetaBar type={post.type} tags={post.tags} styles={styles} />
            </View>

            <View style={styles.commentSection} testID="post-comments-section">
              <View style={styles.commentHeaderRow}>
                <View>
                  <Text style={styles.commentKicker}>댓글</Text>
                  <Text style={styles.commentTitle}>댓글 {commentCount}</Text>
                </View>
                <View style={styles.commentHeaderActions}>
                  <Pressable
                    onPress={openCommentsSheet}
                    accessibilityRole="button"
                    accessibilityLabel="댓글 열기"
                    style={styles.commentIconBtn}
                    testID="post-comments-toggle-btn"
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={18}
                      color="#2d5a3d"
                    />
                  </Pressable>
                </View>
              </View>

            </View>

            <View style={styles.relatedSection}>
              <Text style={styles.relatedEyebrow}>함께 읽기</Text>
              <Text style={styles.relatedTitle}>함께 읽기</Text>
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
                    <RelatedPostCard
                      key={item.id}
                      post={item}
                      onPress={() => router.push(`/posts/${item.id}`)}
                      styles={styles}
                    />
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
            onPressSaveImage={
              Platform.OS !== "web" ? () => void sharePost("imageSave") : undefined
            }
            likeDisabled={likePending}
            shareDisabled={Boolean(shareSubmitting)}
            saveImageDisabled={Boolean(shareSubmitting)}
            likeTestID="post-like-btn"
            bookmarkTestID="post-bookmark-btn"
            saveImageTestID="post-save-image-btn"
            shareTestID="post-share-btn"
            height={dock.action.height}
            paddingBottom={dock.action.paddingBottom}
            styles={styles}
          />
        </>
      )}

      <Modal
        visible={commentsExpanded}
        transparent
        animationType="slide"
        onRequestClose={closeCommentsSheet}
      >
        <KeyboardAvoidingView
          style={styles.commentKeyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.commentSheetOverlay}>
            <Pressable
              style={styles.commentDismissLayer}
              onPress={closeCommentsSheet}
              accessibilityRole="button"
              accessibilityLabel="댓글창 닫기"
            />
            <View style={styles.commentSheet}>
              {commentKeyboardVisible ? (
                <View pointerEvents="none" style={styles.commentKeyboardCornerFill} />
              ) : null}
              <View style={styles.commentSheetHandle} />
              <View style={styles.commentHeaderRow}>
                <View>
                  <Text style={styles.commentKicker}>댓글</Text>
                  <Text style={styles.commentTitle}>댓글 {commentCount}</Text>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={styles.commentSheetContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                onScrollBeginDrag={dismissCommentKeyboard}
                refreshControl={
                  <RefreshControl
                    refreshing={commentsLoading}
                    onRefresh={() => void loadComments()}
                  />
                }
              >
              {canWriteComment ? (
                <View style={styles.commentComposer}>
                  {replyTarget ? (
                    <View style={styles.replyTargetRow}>
                      <Text style={styles.replyTargetText} numberOfLines={1}>
                        {replyTarget.author?.displayName || "댓글"}님에게 답글
                      </Text>
                      <Pressable
                        onPress={clearCommentDraft}
                        accessibilityRole="button"
                        testID="post-comment-reply-cancel-btn"
                      >
                        <Text style={styles.replyCancelText}>취소</Text>
                      </Pressable>
                    </View>
                  ) : (
                    null
                  )}
                  <TextInput
                    value={commentInput}
                    onChangeText={setCommentInput}
                    placeholder={replyTarget ? "답글을 남겨보세요" : "댓글을 남겨보세요"}
                    placeholderTextColor="#8d938f"
                    multiline
                    maxLength={1000}
                    editable={!commentSubmitting}
                    style={styles.commentInput}
                    testID="post-comment-input"
                  />
                  <View style={styles.commentComposerFooter}>
                    <Text style={styles.commentInputCount}>{commentInput.length}/1000</Text>
                    <Pressable
                      onPress={() => void submitComment()}
                      disabled={commentSubmitting || commentInput.trim().length === 0}
                      style={[
                        styles.commentSubmitBtn,
                        (commentSubmitting || commentInput.trim().length === 0) &&
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

              {commentsExpanded && commentsLoading && comments.length === 0 ? (
                <View style={styles.commentLoadingRow}>
                  <ActivityIndicator color="#2d5a3d" />
                  <Text style={styles.commentHint}>댓글을 불러오는 중...</Text>
                </View>
              ) : commentsExpanded && commentsError ? (
                <View style={styles.commentEmptyBox}>
                  <Text style={styles.commentHint}>{commentsError}</Text>
                </View>
              ) : commentsExpanded && topLevelComments.length === 0 ? (
                <View style={styles.commentEmptyBox}>
                  <Text style={styles.commentHint}>아직 댓글이 없어요.</Text>
                </View>
              ) : commentsExpanded ? (
                <View style={styles.commentList}>
                  {topLevelComments.map((comment) => {
                    const replies = repliesByParentId.get(comment.id) ?? [];
                    return (
                      <View key={comment.id} style={styles.commentThread}>
                        <View style={styles.commentItem}>
                          <View style={styles.commentMetaRow}>
                            <View style={styles.commentAuthorWrap}>
                              <View style={styles.commentMarker}>
                                <Text style={styles.commentMarkerText}>
                                  {comment.status === "deleted"
                                    ? ""
                                    : (comment.author?.displayName || "?").slice(0, 1)}
                                </Text>
                              </View>
                              <Text style={styles.commentAuthor}>
                                {comment.author?.displayName || "삭제된 댓글"}
                              </Text>
                            </View>
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
                                onPress={() => void onPressCommentLike(comment)}
                                disabled={commentLikePending[comment.id]}
                                accessibilityRole="button"
                                accessibilityLabel={comment.likedByMe ? "댓글 공감 취소" : "댓글 공감"}
                                accessibilityState={{ selected: comment.likedByMe }}
                                style={styles.commentIconAction}
                                testID={`post-comment-like-btn-${comment.id}`}
                              >
                                <Ionicons
                                  name={comment.likedByMe ? "heart" : "heart-outline"}
                                  size={16}
                                  color={comment.likedByMe ? "#49805a" : "#6d7771"}
                                />
                                <Text
                                  style={[
                                    styles.commentActionText,
                                    comment.likedByMe && styles.commentActionTextActive,
                                  ]}
                                >
                                  {comment.likeCount}
                                </Text>
                              </Pressable>
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
                                  <View style={styles.commentAuthorWrap}>
                                    <View style={[styles.commentMarker, styles.replyMarker]}>
                                      <Text style={styles.commentMarkerText}>
                                        {reply.status === "deleted"
                                          ? ""
                                          : (reply.author?.displayName || "?").slice(0, 1)}
                                      </Text>
                                    </View>
                                    <Text style={styles.commentAuthor}>
                                      {reply.author?.displayName || "삭제된 댓글"}
                                    </Text>
                                  </View>
                                  <Text style={styles.commentDate}>
                                    {formatKstDateKorean(reply.createdAt)}
                                  </Text>
                                </View>
                                <Text style={styles.commentBody}>
                                  {reply.status === "deleted"
                                    ? "삭제된 댓글입니다."
                                    : reply.content}
                                </Text>
                                {reply.status === "active" ? (
                                  <View style={styles.commentActionRow}>
                                    <Pressable
                                      onPress={() => void onPressCommentLike(reply)}
                                      disabled={commentLikePending[reply.id]}
                                      accessibilityRole="button"
                                      accessibilityLabel={reply.likedByMe ? "댓글 공감 취소" : "댓글 공감"}
                                      accessibilityState={{ selected: reply.likedByMe }}
                                      style={styles.commentIconAction}
                                      testID={`post-comment-like-btn-${reply.id}`}
                                    >
                                      <Ionicons
                                        name={reply.likedByMe ? "heart" : "heart-outline"}
                                        size={16}
                                        color={reply.likedByMe ? "#49805a" : "#6d7771"}
                                      />
                                      <Text
                                        style={[
                                          styles.commentActionText,
                                          reply.likedByMe && styles.commentActionTextActive,
                                        ]}
                                      >
                                        {reply.likeCount}
                                      </Text>
                                    </Pressable>
                                    {canManagePost ? (
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
                                    ) : null}
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
              ) : null}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={bookmarkModalVisible} transparent animationType="fade">
        <View style={styles.bookmarkModalOverlay}>
          <View style={styles.bookmarkModalCard}>
            <Text style={styles.bookmarkModalTitle}>책갈피 폴더 선택</Text>
            <Text style={styles.bookmarkModalDescription}>
              저장할 폴더를 선택하면 토글됩니다.
            </Text>

            {bookmarkLoading ? (
              <View style={styles.bookmarkModalLoadingWrap}>
                <Text style={styles.bookmarkModalLoadingText}>불러오는 중...</Text>
              </View>
            ) : bookmarkLists.length === 0 ? (
              <View style={styles.bookmarkModalEmptyWrap}>
                <Text style={styles.bookmarkModalEmptyText}>책갈피 폴더가 없어요.</Text>
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

      <Modal
        visible={showBlockingShareProgress}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.shareBlockingOverlay}>
          <View style={styles.shareBlockingCard}>
            <ActivityIndicator size="large" color={tokens.colors.green700} />
            <Text style={styles.shareBlockingTitle}>처리 중이에요</Text>
            <Text style={styles.shareBlockingText}>{blockingShareProgressMessage}</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={shareModalVisible} transparent animationType="fade">
        <View style={styles.bookmarkModalOverlay}>
          <View style={styles.bookmarkModalCard}>
            <Text style={styles.bookmarkModalTitle}>공유 방식 선택</Text>
            <Text style={styles.bookmarkModalDescription}>
              이미지나 링크로 글을 보낼 수 있어요.
            </Text>
            {shareSubmitting ? (
              <View style={styles.shareModalProgressRow}>
                <ActivityIndicator size="small" color={tokens.colors.green700} />
                <Text style={styles.shareModalProgressText}>
                  {getShareProgressMessage(shareSubmitting)}
                </Text>
              </View>
            ) : null}

            <View style={styles.bookmarkModalList}>
              {Platform.OS !== "web" ? (
                <Pressable
                  onPress={() => void sharePost("imageShare")}
                  disabled={Boolean(shareSubmitting)}
                  style={[
                    styles.bookmarkModalListItem,
                    shareSubmitting && styles.bookmarkModalListItemDisabled,
                  ]}
                  testID="post-share-option-image"
                >
                  <Text style={styles.bookmarkModalListItemName}>이미지 공유</Text>
                  <Text style={styles.bookmarkModalListItemStatus}>
                    {shareSubmitting === "imageShare" ? "준비 중" : "PNG"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => void sharePost("link")}
                disabled={Boolean(shareSubmitting)}
                style={[
                  styles.bookmarkModalListItem,
                  shareSubmitting && styles.bookmarkModalListItemDisabled,
                ]}
                testID="post-share-option-link"
              >
                <Text style={styles.bookmarkModalListItemName}>링크 공유</Text>
                <Text style={styles.bookmarkModalListItemStatus}>
                  {shareSubmitting === "link" ? "공유 중" : "추천"}
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
              {canManagePost ? "글 관리 메뉴를 선택해 주세요." : "게시글 메뉴를 선택해 주세요."}
            </Text>

            <View style={styles.modalActionList}>
              {canManagePost ? (
                <>
                  <Pressable
                    onPress={() => {
                      setSafetyMenuVisible(false);
                      onPressEdit();
                    }}
                    style={styles.modalActionBtn}
                  >
                    <Text style={styles.modalActionText}>수정하기</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSafetyMenuVisible(false);
                      onPressDelete();
                    }}
                    disabled={manageBusy}
                    style={[styles.modalActionBtn, styles.modalActionBtnDanger]}
                    testID="post-manage-delete-btn"
                  >
                    <Text style={[styles.modalActionText, styles.modalActionTextDanger]}>
                      {manageBusy ? "삭제 중..." : "삭제하기"}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              <Pressable
                onPress={() => {
                  setSafetyMenuVisible(false);
                  setShareModalVisible(true);
                }}
                style={styles.modalActionBtn}
              >
                <Text style={styles.modalActionText}>공유하기</Text>
              </Pressable>

              <Pressable
                onPress={onPressSentenceFrame}
                disabled={sentenceFramePending}
                style={[
                  styles.modalActionBtn,
                  sentenceFramePending ? { opacity: 0.55 } : null,
                ]}
                testID="post-sentence-frame-widget-btn"
              >
                <Text style={styles.modalActionText}>
                  {sentenceFramePending ? "담는 중..." : "문장 액자에 담기"}
                </Text>
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
      <PremiumFeaturePrompt
        visible={premiumPromptVisible}
        source="sentence_frame"
        title="좋아하는 문장을 홈 화면에 두세요"
        description="문장 액자는 저장한 글을 조용한 위젯으로 간직하는 프리미엄 기능이에요."
        benefit="직접 고른 문장을 홈 화면 위젯에 담을 수 있어요."
        onClose={() => setPremiumPromptVisible(false)}
      />
    </SafeAreaView>
  );
}

function RelatedPostCard({
  post,
  onPress,
  styles,
}: {
  post: Post;
  onPress: () => void;
  styles: ReturnType<typeof createPostDetailStyles>;
}) {
  const renderImages = resolvePostRenderImages(post);
  const thumbnail = renderImages?.primaryImage || "";
  const authorName = post.author?.name || "익명";
  const likeCount = post.stats?.likeCount ?? 0;
  const title = post.title || post.excerpt || "제목 없는 글";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.relatedFeedCard, pressed && styles.relatedFeedCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`관련 글 열기: ${title}`}
    >
      <View style={styles.relatedThumbWrap}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.relatedThumb}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={styles.relatedThumbFallback}>
            <Ionicons name="document-text-outline" size={22} color={tokens.colors.green700} />
          </View>
        )}
      </View>
      <View style={styles.relatedFeedCopy}>
        <Text style={styles.relatedFeedAuthor} numberOfLines={1}>
          {authorName}
        </Text>
        <Text style={styles.relatedFeedTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.relatedFeedMetaRow} accessibilityLabel={`공감 ${likeCount}개`}>
          <Ionicons name="heart" size={13} color={tokens.colors.green700} />
          <Text style={styles.relatedFeedMeta} numberOfLines={1}>
            {likeCount}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tokens.colors.textFaint} />
    </Pressable>
  );
}
