import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryChips } from "@/components/home/CategoryChips";
import { FeedSection } from "@/components/home/FeedSection";
import { SafetyActionSheet } from "@/components/safety/SafetyActionSheet";
import { SafetyReasonModal } from "@/components/safety/SafetyReasonModal";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PremiumDiscoveryCard } from "@/components/premium/PremiumDiscoveryCard";
import { blurActiveElementBeforeRouteChange } from "@/lib/webFocus";
import { homeScreenStyles } from "@/screens/Home.styles";
import { useFeed } from "@/features/feed/useFeed";
import { getBookmark, setBookmark } from "@/features/bookmarks/bookmarkStore";
import { getLike, setLike } from "@/features/likes/likeStore";
import {
  clearNotificationUnreadCount,
  refreshNotificationUnreadCount,
  useNotificationUnreadCount,
} from "@/features/notifications/notificationStore";
import { useAuth } from "@/auth/AuthContext";
import { buildAuthRoute } from "@/lib/authRedirect";
import * as haptics from "@/lib/haptics";
import { togglePostLike } from "@/services/likeService";
import { ApiError } from "@/lib/errors";
import { toTimestampMs } from "@/lib/dateTime";
import { router, usePathname } from "expo-router";
import { useToast } from "@/feedback/ToastProvider";
import { useRuntimeLegalConfig } from "@/hooks/useRuntimeLegalConfig";
import { filterBlockedPosts, useBlockedUserIds } from "@/features/safety/blockedUsersStore";
import { type Post } from "@/types/post";
import { blockUserById, pickSafetyReasons, reportPost } from "@/services/safetyService";
import { hasCompletedAppOnboardingTour } from "@/onboarding/appOnboardingTourStorage";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { isPremiumIapEnabled } from "@/lib/premiumFeatureFlags";
import {
  canShowPremiumHomeDiscovery,
  dismissPremiumHomeDiscovery,
} from "@/lib/premiumDiscoveryStorage";
import {
  addPostToBookmarkList,
  createBookmarkList,
  listBookmarkItems,
  listBookmarkLists,
  listPostBookmarkLists,
  removePostFromBookmarkList,
} from "@/services/bookmarkService";

const CATEGORIES = ["추천", "팔로잉", "최신"] as const;
type Category = (typeof CATEGORIES)[number];
export default function Home() {
  const pathname = usePathname();
  const [active, setActive] = useState<Category>("추천");
  const { showToast } = useToast();
  const { token, signOut } = useAuth();
  const unreadNotificationCount = useNotificationUnreadCount();
  const { config: runtimeLegalConfig } = useRuntimeLegalConfig();
  const blockedUserIds = useBlockedUserIds();
  const [selectedSafetyPost, setSelectedSafetyPost] = useState<Post | null>(null);
  const [safetyMenuVisible, setSafetyMenuVisible] = useState(false);
  const [reportReasonVisible, setReportReasonVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [premiumDiscoveryVisible, setPremiumDiscoveryVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const { isPremium, loading: premiumStatusLoading } = usePremiumStatus(
    Boolean(token) && isPremiumIapEnabled()
  );

  const query = useMemo(() => {
    if (active === "최신") return { limit: 10, sort: "latest" as const };
    if (active === "팔로잉") {
      return { limit: 10, sort: "latest" as const, type: "following" as const };
    }
    return { limit: 10, sort: "recommended" as const };
  }, [active]);

  const { items, loading, refreshing, error, hasMore, refresh, loadMore, patchItem } =
    useFeed(query);
  const visibleItems = useMemo(
    () => filterBlockedPosts(items, blockedUserIds),
    [blockedUserIds, items]
  );
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});
  const [bookmarkPending, setBookmarkPending] = useState<Record<string, boolean>>({});
  const postSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "post");
  const userSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "user");
  const reportDetailMaxLength = runtimeLegalConfig?.safety.detailMaxLength;
  const reportDetailRequiredReasonCodes = runtimeLegalConfig?.safety.detailRequiredReasonCodes;
  React.useEffect(() => {
    if (!token) {
      clearNotificationUnreadCount();
      return;
    }

    void refreshNotificationUnreadCount().catch(() => {
      clearNotificationUnreadCount();
    });
  }, [token]);

  React.useEffect(() => {
    if (!token || !isPremiumIapEnabled() || premiumStatusLoading || isPremium) {
      setPremiumDiscoveryVisible(false);
      return;
    }

    let mounted = true;
    void Promise.all([canShowPremiumHomeDiscovery(), hasCompletedAppOnboardingTour()])
      .then(([allowed, onboardingComplete]) => {
        if (mounted) setPremiumDiscoveryVisible(allowed && onboardingComplete);
      })
      .catch(() => {
        if (mounted) setPremiumDiscoveryVisible(false);
      });
    return () => {
      mounted = false;
    };
  }, [isPremium, premiumStatusLoading, token]);

  const dismissPremiumDiscovery = React.useCallback(() => {
    setPremiumDiscoveryVisible(false);
    void dismissPremiumHomeDiscovery();
  }, []);

  const setPending = (postId: string, pending: boolean) => {
    setLikePending((prev) => ({ ...prev, [postId]: pending }));
  };
  const setBookmarkPendingState = (postId: string, pending: boolean) => {
    setBookmarkPending((prev) => ({ ...prev, [postId]: pending }));
  };

  const promptAuthForAction = React.useCallback(
    (message: string, redirectPath = pathname) => {
      showToast(message, { tone: "error" });
      router.push(buildAuthRoute("/(auth)/login", redirectPath));
    },
    [pathname, showToast]
  );

  const changeCategory = React.useCallback(
    (next: Category) => {
      if (next === active) return;
      if (next === "팔로잉" && !token) {
        promptAuthForAction("팔로잉 피드는 로그인 후 볼 수 있어요.");
        return;
      }
      haptics.selection();
      setActive(next);
    },
    [active, promptAuthForAction, token]
  );

  const handleAuthError = React.useCallback(async () => {
    await signOut();
    promptAuthForAction("로그인 상태가 만료되었어요. 다시 로그인하면 이어서 사용할 수 있어요.");
  }, [promptAuthForAction, signOut]);

  const closeSafetyOverlays = React.useCallback(() => {
    setSafetyMenuVisible(false);
    setReportReasonVisible(false);
    setBlockConfirmVisible(false);
  }, []);

  const handleNotificationPress = React.useCallback(() => {
    haptics.selection();

    if (!token) {
      promptAuthForAction("알림은 로그인 후 확인할 수 있어요.", "/notifications");
      return;
    }

    router.push("/notifications");
  }, [promptAuthForAction, token]);

  const handleLike = async (postId: string) => {
    if (!token) {
      promptAuthForAction("좋아요는 로그인한 회원만 남길 수 있어요.");
      return;
    }
    if (likePending[postId]) return;
    haptics.selection();

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
        showToast("좋아요 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setPending(postId, false);
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!token) {
      promptAuthForAction("북마크는 로그인한 회원만 사용할 수 있어요.");
      return;
    }
    if (bookmarkPending[postId]) return;
    haptics.selection();
    const target = items.find((item) => item.id === postId);
    if (!target) return;

    const storedBookmark = getBookmark(postId);
    const prevBookmarked = storedBookmark?.bookmarked ?? Boolean(target.viewer?.isBookmarked);
    const prevCount = target.stats?.bookmarkCount ?? 0;
    const nextCount = prevBookmarked ? Math.max(0, prevCount - 1) : prevCount + 1;

    patchItem(postId, (prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isBookmarked: !prevBookmarked },
      stats: { ...prev.stats, bookmarkCount: nextCount },
    }));
    setBookmark(postId, !prevBookmarked);

    setBookmarkPendingState(postId, true);
    try {
      if (!prevBookmarked) {
        let lists = await listBookmarkLists();
        let targetList = lists[0];

        if (!targetList) {
          targetList = await createBookmarkList({ name: "기본" });
          lists = [targetList, ...lists];
        } else {
          const withRecentAddedAt = await Promise.all(
            lists.map(async (list, index) => {
              if (!list.itemCount || list.itemCount <= 0) {
                return { list, index, recentAddedAt: null as number | null };
              }
              const res = await listBookmarkItems({ listId: list.id, limit: 1, offset: 0 });
              const top = res.items[0];
              const t = toTimestampMs(top?.createdAt);
              return {
                list,
                index,
                recentAddedAt: Number.isNaN(t) ? null : t,
              };
            })
          );

          const recentLists = withRecentAddedAt
            .filter((x) => x.recentAddedAt !== null)
            .sort((a, b) => {
              if ((b.recentAddedAt ?? 0) !== (a.recentAddedAt ?? 0)) {
                return (b.recentAddedAt ?? 0) - (a.recentAddedAt ?? 0);
              }
              // tie-break: API list order(최근 생성 우선) 유지
              return a.index - b.index;
            });

          targetList = recentLists[0]?.list ?? lists[0];
        }

        await addPostToBookmarkList({ listId: targetList.id, postId });
        setBookmark(postId, true);
        showToast(`'${targetList.name}' 폴더에 저장했어요.`, { tone: "success" });
      } else {
        const postLists = await listPostBookmarkLists(postId);
        const contains = postLists.filter((l) => Boolean(l.contains));
        if (contains.length > 0) {
          await Promise.all(
            contains.map((l) => removePostFromBookmarkList({ listId: l.id, postId }))
          );
        }
        setBookmark(postId, false);
        showToast("북마크에서 삭제했어요.", { tone: "success" });
      }
    } catch (err) {
      patchItem(postId, (prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isBookmarked: prevBookmarked },
        stats: { ...prev.stats, bookmarkCount: prevCount },
      }));
      setBookmark(postId, prevBookmarked);

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
      } else {
        showToast(
          err instanceof Error ? err.message : "북마크 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
          { tone: "error" }
        );
      }
    } finally {
      setBookmarkPendingState(postId, false);
    }
  };

  const openSafetyMenu = React.useCallback((post: Post) => {
    haptics.selection();
    setSelectedSafetyPost(post);
    setSafetyMenuVisible(true);
  }, []);

  const submitPostReport = React.useCallback(
    async (reasonCode: string, detail?: string) => {
      if (!token) {
        promptAuthForAction("신고는 로그인한 회원만 할 수 있어요.");
        return;
      }
      if (!selectedSafetyPost?.id) return;

      setReportSubmitting(true);
      try {
        const result = await reportPost({
          postId: selectedSafetyPost.id,
          reasonCode,
          detail,
        });
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
    [handleAuthError, promptAuthForAction, selectedSafetyPost?.id, showToast, token]
  );

  const submitBlockAuthor = React.useCallback(async () => {
    if (!selectedSafetyPost?.author?.id) return;
    if (!token) {
      promptAuthForAction("차단은 로그인한 회원만 할 수 있어요.");
      return;
    }

    setBlockSubmitting(true);
    try {
      const result = await blockUserById({
        userId: selectedSafetyPost.author.id,
        reasonCode: userSafetyReasons[0]?.code || "harassment",
        contextPostId: selectedSafetyPost.id,
      });
      closeSafetyOverlays();
      showToast(result.message, { tone: "success" });
      void refresh();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
        return;
      }
      showToast(
        err instanceof Error ? err.message : "차단 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    } finally {
      setBlockSubmitting(false);
    }
  }, [
    closeSafetyOverlays,
    handleAuthError,
    promptAuthForAction,
    refresh,
    selectedSafetyPost,
    showToast,
    token,
    userSafetyReasons,
  ]);

  return (
    <SafeAreaView style={homeScreenStyles.safe} edges={["top"]}>
      <HomeHeader
        title="발견"
        subtitle="마음에 오래 남을 문장을 찾아보세요"
        onPressSearch={() => {
          haptics.selection();
          blurActiveElementBeforeRouteChange();
          router.push("/search");
        }}
        onPressNotifications={handleNotificationPress}
        hasUnreadNotifications={unreadNotificationCount > 0}
        showNotifications
      />

      <CategoryChips
        categories={CATEGORIES}
        active={active}
        onChange={changeCategory}
      />

      {premiumDiscoveryVisible ? (
        <View style={homeScreenStyles.premiumDiscoveryWrap}>
          <PremiumDiscoveryCard
            source="home_discovery"
            dismissible
            onDismiss={dismissPremiumDiscovery}
          />
        </View>
      ) : null}

      <FeedSection
        items={visibleItems}
        loading={loading}
        refreshing={refreshing}
        error={error}
        hasMore={hasMore}
        scrollToTopKey={active}
        onRefresh={refresh}
        onEndReached={() => {
          if (!loading && hasMore) loadMore();
        }}
        onPressItem={(id) => {
          haptics.selection();
          router.push(`/posts/${String(id)}`);
        }}
        onPressAuthor={(item) => {
          const authorId = (item as Post)?.author?.id;
          if (authorId) {
            haptics.selection();
            router.push(`/users/${authorId}`);
          }
        }}
        onLikePress={(id) => handleLike(String(id))}
        onBookmarkPress={(id) => handleBookmark(String(id))}
        onMorePress={(item) => openSafetyMenu(item as Post)}
        getLikeDisabled={(id) => Boolean(likePending[String(id)])}
      />

      <SafetyActionSheet
        visible={safetyMenuVisible}
        title="게시글 안전 메뉴"
        description="신고, 차단, 가이드라인을 확인할 수 있어요."
        onRequestClose={() => setSafetyMenuVisible(false)}
        actions={[
          {
            label: "게시글 신고",
            onPress: () => {
              setSafetyMenuVisible(false);
              setReportReasonVisible(true);
            },
            testID: "home-post-report-btn",
          },
          {
            label: "작성자 차단",
            variant: "danger",
            onPress: () => {
              setSafetyMenuVisible(false);
              setBlockConfirmVisible(true);
            },
            testID: "home-post-block-btn",
          },
          {
            label: "닫기",
            variant: "ghost",
            onPress: () => setSafetyMenuVisible(false),
          },
        ]}
      />

      <SafetyActionSheet
        visible={blockConfirmVisible}
        title="작성자 차단"
        description={`${selectedSafetyPost?.author?.name || "이 사용자"}님의 글과 프로필을 숨길까요?`}
        onRequestClose={() => {
          if (blockSubmitting) return;
          setBlockConfirmVisible(false);
        }}
        actions={[
          {
            label: blockSubmitting ? "차단 처리 중..." : "차단하기",
            variant: "danger",
            disabled: blockSubmitting,
            onPress: () => {
              if (blockSubmitting) return;
              void submitBlockAuthor();
            },
            testID: "home-post-block-confirm-btn",
          },
          {
            label: "취소",
            variant: "ghost",
            disabled: blockSubmitting,
            onPress: () => setBlockConfirmVisible(false),
          },
        ]}
      />

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
