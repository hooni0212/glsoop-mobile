import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  findNodeHandle,
  InteractionManager,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { FeedCard } from "@/components/FeedCard";
import { SafetyReasonModal } from "@/components/safety/SafetyReasonModal";
import { useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { PostTopBar } from "@/components/post/PostTopBar";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useAuthorPosts, type AuthorPostSort } from "@/features/users/useAuthorPosts";
import { useAuthorProfile } from "@/features/users/useAuthorProfile";
import { authorScreenStyles } from "@/screens/Author.styles";
import { getLegalDocumentUrl, getSupportUrl } from "@/config/release";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { useToast } from "@/feedback/ToastProvider";
import { useAuth } from "@/auth/AuthContext";
import { buildAuthRoute } from "@/lib/authRedirect";
import { formatKstDateKorean } from "@/lib/dateTime";
import { openExternalUrl } from "@/lib/externalLinks";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";
import { togglePostLike } from "@/services/likeService";
import { toProfilePhotoDisplayUrl } from "@/services/profilePhotoService";
import {
  blockUserById,
  pickSafetyReasons,
  reportUser,
} from "@/services/safetyService";
import { resolveRuntimeLegalDocumentUrl } from "@/services/runtimeConfigService";
import { toggleFollowUser } from "@/services/userService";
import { ApiError } from "@/lib/errors";
import { useRuntimeLegalConfig } from "@/hooks/useRuntimeLegalConfig";
import { useBottomDock } from "@/navigation/bottomDock";
import { resetToAppRoot } from "@/navigation/rootNavigation";
import {
  useGuidedHelpTarget,
  type GuidedHelpScrollIntoView,
} from "@/onboarding/GuidedHelpProvider";
import {
  normalizeProfileCosmeticsExpanded,
  type CosmeticStickerSlot,
} from "@/types/cosmetics";
import type { Post } from "@/types/post";
import { filterBlockedPosts, useBlockedUserIds } from "@/features/safety/blockedUsersStore";
import { tokens } from "@/theme/tokens";

type AuthorProps = {
  userIdOverride?: string;
  hideTopBar?: boolean;
  reserveBottomDock?: boolean;
  forceOwnProfile?: boolean;
};

const GUIDED_SCROLL_VISIBLE_TOP = 140;
const GUIDED_SCROLL_VISIBLE_BOTTOM_GAP = 260;
const GUIDED_SCROLL_TARGET_TOP = 260;

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function toIdText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOwnProfile(viewer: unknown, user: unknown): boolean {
  const viewerRow = toRecord(viewer);
  const explicit = toBooleanFlag(
    viewerRow.is_own_profile ??
      viewerRow.isOwnProfile ??
      viewerRow.is_me ??
      viewerRow.isMe
  );
  if (explicit !== null) return explicit;

  const viewerId = toIdText(viewerRow.id);
  const userId = toIdText(toRecord(user).id);
  return Boolean(viewerId && userId && viewerId === userId);
}

function emojiOrFallback(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getProfileBackgroundTone(key: string | null | undefined) {
  if (key === "background_writer_grove") {
    return {
      backgroundColor: "#EAF5EE",
      borderColor: "#9EC9AD",
      accentColor: tokens.colors.green700,
      surfaceColor: "#DCEFE4",
      lineColor: "#A7CDB4",
    };
  }
  if (key === "background_deep_forest") {
    return {
      backgroundColor: "#DCEFE5",
      borderColor: "#7DAE91",
      accentColor: tokens.colors.green900,
      surfaceColor: "#C7E1D2",
      lineColor: "#7DAE91",
    };
  }
  if (key === "background_prompt_letters") {
    return {
      backgroundColor: "#FFF1E8",
      borderColor: "#E6BDA6",
      accentColor: "#8A4B2A",
      surfaceColor: "#FFE3D1",
      lineColor: "#D49A7C",
    };
  }
  return {
    backgroundColor: "#FAF8F1",
    borderColor: "#E6E0D5",
    accentColor: tokens.colors.green700,
    surfaceColor: "#F2ECDF",
    lineColor: "#D9CEBE",
  };
}

function getStickerAnchorStyle(slot: CosmeticStickerSlot) {
  if (slot === "tl") return authorScreenStyles.stickerTL;
  if (slot === "tr") return authorScreenStyles.stickerTR;
  return authorScreenStyles.stickerBR;
}

export default function Author({
  userIdOverride,
  hideTopBar = false,
  reserveBottomDock = false,
  forceOwnProfile = false,
}: AuthorProps = {}) {
  const listRef = React.useRef<FlatList<Post> | null>(null);
  const params = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const routeUserId = params?.id ? String(params.id) : undefined;
  const userId = userIdOverride || routeUserId;
  const { config: runtimeLegalConfig } = useRuntimeLegalConfig();
  const blockedUserIds = useBlockedUserIds();
  const dock = useBottomDock();

  const [sort, setSort] = useState<AuthorPostSort>("newest");
  const {
    user,
    stats,
    viewer,
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
    patchItem,
  } = useAuthorPosts(userId, sort);
  const visibleItems = useMemo(
    () => filterBlockedPosts(items, blockedUserIds),
    [blockedUserIds, items]
  );
  const { token, signOut } = useAuth();
  const { showToast } = useToast();
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});
  const [bioExpanded, setBioExpanded] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [reportReasonVisible, setReportReasonVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const scrollGuidedTargetIntoView = useCallback<GuidedHelpScrollIntoView>((targetRef) => {
    const list = listRef.current;
    const target = targetRef.current;
    if (!list || !target || typeof target.measureLayout !== "function") return;

    const listHandle =
      Platform.OS === "web"
        ? ((list as { getScrollableNode?: () => unknown }).getScrollableNode?.() ?? list)
        : findNodeHandle(list);
    if (!listHandle) return;

    const scrollToTarget = () => {
      target.measureLayout(
        listHandle as Parameters<typeof target.measureLayout>[0],
        (_x, y) => {
          list.scrollToOffset({ offset: Math.max(0, y - GUIDED_SCROLL_TARGET_TOP), animated: true });
        },
        () => undefined
      );
    };

    if (typeof target.measureInWindow !== "function") {
      scrollToTarget();
      return;
    }

    target.measureInWindow((_x, windowY, _width, targetHeight) => {
      const viewportHeight = Dimensions.get("window").height;
      const comfortableBottom = viewportHeight - GUIDED_SCROLL_VISIBLE_BOTTOM_GAP;
      const targetBottom = windowY + targetHeight;
      if (windowY >= GUIDED_SCROLL_VISIBLE_TOP && targetBottom <= comfortableBottom) return;
      scrollToTarget();
    });
  }, []);
  const followersTarget = useGuidedHelpTarget("me", "followers", {
    scrollIntoView: scrollGuidedTargetIntoView,
  });
  const followingsTarget = useGuidedHelpTarget("me", "followings", {
    scrollIntoView: scrollGuidedTargetIntoView,
  });
  const settingsTarget = useGuidedHelpTarget("me", "settings", {
    scrollIntoView: scrollGuidedTargetIntoView,
  });
  const postTarget = useGuidedHelpTarget("me", "post", {
    scrollIntoView: scrollGuidedTargetIntoView,
  });

  const name = normalizePublicDisplayName(user?.display_name, user?.nickname);
  const bio = user?.bio || "소개가 아직 없어요.";
  const postCount = stats?.postCount ?? user?.postCount ?? user?.post_count ?? 0;
  const totalLikes = stats?.totalLikes ?? user?.totalLikes ?? user?.total_likes ?? 0;
  const followingCount = toNumber(
    stats?.followingCount ?? user?.followingCount ?? user?.following_count
  );
  const about = user?.about || user?.bio || "";
  const collapsedAbout =
    about.length > 96 && !bioExpanded ? `${about.slice(0, 96).trim()}...` : about;
  const joinedAtValue = user?.joinedAt ?? user?.joined_at;
  const joinedAtLabel = joinedAtValue ? `${formatKstDateKorean(joinedAtValue)} 가입` : "";
  const showProfileCustomize = forceOwnProfile || isOwnProfile(viewer, user);
  const showFollowButton = Boolean(userId && !showProfileCustomize);
  const profilePhotoUrl = toProfilePhotoDisplayUrl(
    user?.profile_photo_thumbnail_url ??
      user?.profilePhotoThumbnailUrl ??
      user?.profile_photo_url ??
      user?.profilePhotoUrl
  );
  const profileCosmetics = useMemo(
    () =>
      normalizeProfileCosmeticsExpanded(
        user?.profile_cosmetics ?? user?.profileCosmetics ?? null
      ),
    [user?.profileCosmetics, user?.profile_cosmetics]
  );
  const legalGuidelinesUrl = resolveRuntimeLegalDocumentUrl(
    runtimeLegalConfig,
    "guidelines",
    getLegalDocumentUrl("guidelines")
  );
  const userSafetyReasons = pickSafetyReasons(runtimeLegalConfig?.safety.reportReasons, "user");
  const reportDetailMaxLength = runtimeLegalConfig?.safety.detailMaxLength;
  const reportDetailRequiredReasonCodes = runtimeLegalConfig?.safety.detailRequiredReasonCodes;

  const showInitialLoading = profileLoading && !user;

  const setPending = (postId: string, pending: boolean) => {
    setLikePending((prev) => ({ ...prev, [postId]: pending }));
  };

  const promptAuthForAction = useCallback(
    (message: string, redirectPath = pathname) => {
      showToast(message, { tone: "error" });
      router.push(buildAuthRoute("/(auth)/login", redirectPath));
    },
    [pathname, showToast]
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const task = InteractionManager.runAfterInteractions(() => {
        void refetchProfile();
      });

      return () => {
        task.cancel();
      };
    }, [refetchProfile, userId])
  );

  React.useEffect(() => {
    setIsFollowing(Boolean(viewer?.is_following ?? viewer?.isFollowing));
  }, [viewer?.isFollowing, viewer?.is_following]);

  React.useEffect(() => {
    setFollowerCount(Number(user?.follower_count ?? user?.followerCount ?? 0));
  }, [user?.followerCount, user?.follower_count]);

  const handleAuthError = useCallback(async () => {
    await signOut();
    promptAuthForAction(
      "로그인 상태가 만료되었어요. 다시 로그인하면 이어서 사용할 수 있어요."
    );
  }, [promptAuthForAction, signOut]);

  const handleLike = async (postId: string) => {
    if (!token) {
      promptAuthForAction("공감은 로그인한 회원만 남길 수 있어요.");
      return;
    }
    if (likePending[postId]) return;

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
        showToast("공감 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setPending(postId, false);
    }
  };

  const handleFollowToggle = useCallback(async () => {
    if (!token) {
      promptAuthForAction("팔로우는 로그인한 회원만 사용할 수 있어요.");
      return;
    }
    if (!userId || followBusy || showProfileCustomize) return;

    setFollowBusy(true);
    const prevFollowing = isFollowing;
    const prevFollowerCount = followerCount;
    const nextFollowing = !prevFollowing;
    const nextFollowerCount = Math.max(0, prevFollowerCount + (nextFollowing ? 1 : -1));

    setIsFollowing(nextFollowing);
    setFollowerCount(nextFollowerCount);

    try {
      const res = await toggleFollowUser(userId);
      setIsFollowing(res.following);
      setFollowerCount(res.followerCount);
      showToast(res.following ? "팔로우했어요." : "팔로우를 취소했어요.", { tone: "success" });
    } catch (err) {
      setIsFollowing(prevFollowing);
      setFollowerCount(prevFollowerCount);

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
      } else {
        showToast("팔로우 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setFollowBusy(false);
    }
  }, [
    followerCount,
    followBusy,
    handleAuthError,
    isFollowing,
    promptAuthForAction,
    showProfileCustomize,
    showToast,
    token,
    userId,
  ]);

  const handleShareAuthor = useCallback(async () => {
    if (!userId) return;

    const shareTitle = `${name} 작가 페이지`;
    const shareMessage = `${name}님의 글을 같이 읽어보세요.`;
    const shareUrl = `glsoop://users/${userId}`;

    try {
      await Share.share({
        title: shareTitle,
        message: `${shareMessage}\n${shareUrl}`,
        url: shareUrl,
      });
      showToast("작가 페이지를 공유했어요.");
    } catch {
      showToast("공유에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
    }
  }, [name, showToast, userId]);

  const openGuidelines = useCallback(() => {
    void openExternalUrl(legalGuidelinesUrl).catch(() => {
      showToast("가이드라인을 열지 못했어요. 잠시 후 다시 시도해주세요.", {
        tone: "error",
      });
    });
  }, [legalGuidelinesUrl, showToast]);

  const openSupport = useCallback(() => {
    void openExternalUrl(getSupportUrl()).catch(() => {
      showToast("지원 페이지를 열지 못했어요. 잠시 후 다시 시도해주세요.", {
        tone: "error",
      });
    });
  }, [showToast]);

  const handleReportAuthor = useCallback(
    async (reasonCode: string, detail?: string) => {
      if (!token) {
        promptAuthForAction("신고는 로그인한 회원만 할 수 있어요.");
        return;
      }
      if (!userId) return;

      setReportSubmitting(true);
      try {
        const result = await reportUser({ userId, reasonCode, detail });
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
    [handleAuthError, promptAuthForAction, showToast, token, userId]
  );

  const promptReportAuthor = useCallback(() => {
    setOverflowOpen(false);
    setReportReasonVisible(true);
  }, []);

  const promptBlockAuthor = useCallback(() => {
    if (!userId) return;
    if (!token) {
      promptAuthForAction("차단은 로그인한 회원만 할 수 있어요.");
      return;
    }

    Alert.alert(
      "작가 차단",
      `${name}님의 글과 프로필을 내 화면에서 즉시 숨기고, 운영팀이 검토 후 필요한 경우 콘텐츠 삭제 또는 계정 제재를 진행할 수 있어요. 나중에 계정 센터에서 차단을 해제할 수 있어요.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "차단",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const result = await blockUserById({
                  userId,
                  reasonCode: userSafetyReasons[0]?.code || "harassment",
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
            })();
          },
        },
      ]
    );
  }, [
    handleAuthError,
    name,
    promptAuthForAction,
    showToast,
    token,
    userId,
    userSafetyReasons,
  ]);

  const listHeader = useMemo(
    () => {
      const primaryBadge = profileCosmetics.primary_badge;
      const profileBackground = profileCosmetics.profile_background;
      const backgroundTone = getProfileBackgroundTone(profileBackground?.key);
      const showcaseBadges = profileCosmetics.showcase_badges.slice(0, 6);
      const headerStickers = profileCosmetics.header_stickers;
      const hasTopLeftSticker = headerStickers.some(({ slot }) => slot === "tl");
      const avatarInitial = name.trim().slice(0, 1) || "글";

      return (
        <View>
          <View
            style={
              showProfileCustomize
                ? authorScreenStyles.ownProfileSection
                : [
                    authorScreenStyles.profileCard,
                    {
                      backgroundColor: backgroundTone.backgroundColor,
                      borderColor: backgroundTone.borderColor,
                    },
                  ]
            }
          >
            {showProfileCustomize ? null : (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    authorScreenStyles.profilePaperWash,
                    { backgroundColor: backgroundTone.surfaceColor },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    authorScreenStyles.profilePaperLine,
                    authorScreenStyles.profilePaperLineTop,
                    { backgroundColor: backgroundTone.lineColor },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    authorScreenStyles.profilePaperLine,
                    authorScreenStyles.profilePaperLineBottom,
                    { backgroundColor: backgroundTone.lineColor },
                  ]}
                />
                {headerStickers.map(({ slot, sticker }) => (
                  <View
                    key={`${slot}-${sticker.key}`}
                    pointerEvents="none"
                    style={[
                      authorScreenStyles.stickerOverlay,
                      getStickerAnchorStyle(slot),
                    ]}
                  >
                    <Text style={authorScreenStyles.stickerText}>
                      {emojiOrFallback(sticker.icon_emoji, "✨")}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {showProfileCustomize ? (
              <View style={authorScreenStyles.ownIdentityHeader}>
                <View style={authorScreenStyles.identityBlock}>
                  <Text style={authorScreenStyles.ownScreenLabel}>나</Text>
                  <Text style={authorScreenStyles.ownName}>{name}</Text>
                </View>
                <Pressable
                  {...settingsTarget}
                  onPress={() => router.push("/account-center")}
                  style={authorScreenStyles.ownSettingsButton}
                  testID="author-account-center-btn"
                  accessibilityRole="button"
                  accessibilityLabel="설정 열기"
                >
                  <Ionicons
                    name="settings-outline"
                    size={20}
                    color={tokens.colors.textMuted}
                  />
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  authorScreenStyles.profileHeader,
                  hasTopLeftSticker && authorScreenStyles.profileHeaderWithLeftSticker,
                ]}
              >
                <View
                  style={[
                    authorScreenStyles.avatar,
                    {
                      borderColor: backgroundTone.borderColor,
                      backgroundColor: "rgba(255,255,255,0.72)",
                    },
                  ]}
                >
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={authorScreenStyles.avatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={authorScreenStyles.avatarText}>{avatarInitial}</Text>
                  )}
                </View>
                <View style={authorScreenStyles.identityBlock}>
                  <Text style={authorScreenStyles.profileKicker}>작가의 글숲</Text>
                  <View style={authorScreenStyles.nameRow}>
                    <Text style={authorScreenStyles.name}>{name}</Text>
                    {primaryBadge ? (
                      <Text
                        style={authorScreenStyles.badgeEmoji}
                        accessibilityLabel={`대표 뱃지 ${primaryBadge.name}`}
                      >
                        {emojiOrFallback(primaryBadge.icon_emoji, "🏅")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            <Text
              style={[
                authorScreenStyles.bio,
                showProfileCustomize && authorScreenStyles.ownBio,
              ]}
            >
              {collapsedAbout || bio}
            </Text>
            {about.length > 96 ? (
              <Pressable
                onPress={() => setBioExpanded((current) => !current)}
                style={authorScreenStyles.inlineActionBtn}
              >
                <Text style={authorScreenStyles.inlineActionText}>
                  {bioExpanded ? "소개 접기" : "소개 더보기"}
                </Text>
              </Pressable>
            ) : null}

            {!showProfileCustomize && showcaseBadges.length > 0 ? (
              <View style={authorScreenStyles.showcaseRow}>
                {showcaseBadges.map((badge) => (
                  <View
                    key={badge.key}
                    style={authorScreenStyles.showcaseChip}
                    accessibilityLabel={`배지 ${badge.name}`}
                  >
                    <Text style={authorScreenStyles.showcaseEmoji}>
                      {emojiOrFallback(badge.icon_emoji, "🏅")}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {showProfileCustomize ? (
              <View style={authorScreenStyles.ownStatsRow}>
                <View style={authorScreenStyles.ownStatItem}>
                  <Text style={authorScreenStyles.ownStatLabel}>글</Text>
                  <Text style={authorScreenStyles.ownStatValue}>{postCount}</Text>
                </View>
                <View
                  style={[authorScreenStyles.ownStatItem, authorScreenStyles.ownStatItemDivider]}
                  accessibilityLabel={`공감 ${totalLikes}개`}
                >
                  <Text style={authorScreenStyles.ownStatLabel}>공감</Text>
                  <Text style={authorScreenStyles.ownStatValue}>{totalLikes}</Text>
                </View>
                <Pressable
                  {...followersTarget}
                  onPress={() => router.push("/me/followers" as never)}
                  style={[authorScreenStyles.ownStatItem, authorScreenStyles.ownStatItemDivider]}
                  testID="author-own-followers-toggle"
                  accessibilityRole="button"
                  accessibilityLabel={`팔로워 ${followerCount}명 목록 보기`}
                >
                  <Text style={authorScreenStyles.ownStatLabel}>팔로워</Text>
                  <Text style={authorScreenStyles.ownStatValue}>{followerCount}</Text>
                </Pressable>
                <Pressable
                  {...followingsTarget}
                  onPress={() => router.push("/me/followings")}
                  style={[authorScreenStyles.ownStatItem, authorScreenStyles.ownStatItemDivider]}
                  testID="author-own-followings-toggle"
                  accessibilityRole="button"
                  accessibilityLabel={`팔로잉 ${followingCount}명 목록 보기`}
                >
                  <Text style={authorScreenStyles.ownStatLabel}>팔로잉</Text>
                  <Text style={authorScreenStyles.ownStatValue}>{followingCount}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={authorScreenStyles.statsRow}>
                <Text style={authorScreenStyles.statText}>글 {postCount}</Text>
                <View
                  style={authorScreenStyles.statMetric}
                  accessibilityLabel={`공감 ${totalLikes}개`}
                >
                  <Ionicons name="heart" size={13} color={tokens.colors.textMuted} />
                  <Text style={authorScreenStyles.statText}>{totalLikes}</Text>
                </View>
                <Text style={authorScreenStyles.statText}>팔로워 {followerCount}</Text>
              </View>
            )}

            {!showProfileCustomize && joinedAtLabel ? (
              <Text style={authorScreenStyles.joinedAt}>{joinedAtLabel}</Text>
            ) : null}

            {!showProfileCustomize && visibleItems.length > 0 ? (
              <View style={authorScreenStyles.primaryActionRow}>
                <Pressable
                  {...postTarget}
                  onPress={() => router.push(`/posts/${visibleItems[0].id}`)}
                  style={authorScreenStyles.latestPostBtn}
                >
                  <Text style={authorScreenStyles.latestPostBtnText}>최신 글 읽기</Text>
                </Pressable>
              </View>
            ) : null}

            {showFollowButton ? (
              <View style={authorScreenStyles.actionRow}>
                <Pressable
                  onPress={() => void handleFollowToggle()}
                  disabled={followBusy}
                  style={[
                    authorScreenStyles.followBtn,
                    isFollowing && authorScreenStyles.followBtnActive,
                    followBusy && authorScreenStyles.followBtnDisabled,
                  ]}
                  testID="author-follow-btn"
                >
                  <Text
                    style={[
                      authorScreenStyles.followBtnText,
                      isFollowing && authorScreenStyles.followBtnTextActive,
                    ]}
                  >
                    {followBusy ? "처리 중..." : isFollowing ? "팔로잉" : "팔로우"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleShareAuthor()}
                  style={authorScreenStyles.shareBtn}
                  testID="author-share-btn"
                >
                  <Text style={authorScreenStyles.shareBtnText}>공유</Text>
                </Pressable>
                <Pressable
                  onPress={() => setOverflowOpen((current) => !current)}
                  style={authorScreenStyles.shareBtn}
                  testID="author-overflow-btn"
                >
                  <Text style={authorScreenStyles.shareBtnText}>더보기</Text>
                </Pressable>
              </View>
            ) : null}

            {overflowOpen && showFollowButton ? (
              <View style={authorScreenStyles.overflowCard}>
                <Pressable
                  onPress={() => {
                    setOverflowOpen(false);
                    promptReportAuthor();
                  }}
                  style={authorScreenStyles.overflowItem}
                >
                  <Text style={authorScreenStyles.overflowItemText}>작가 신고</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOverflowOpen(false);
                    promptBlockAuthor();
                  }}
                  style={authorScreenStyles.overflowItem}
                >
                  <Text style={authorScreenStyles.overflowItemText}>작가 차단</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOverflowOpen(false);
                    openSupport();
                  }}
                  style={authorScreenStyles.overflowItem}
                >
                  <Text style={authorScreenStyles.overflowItemText}>도움말 및 지원</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOverflowOpen(false);
                    openGuidelines();
                  }}
                  style={authorScreenStyles.overflowItem}
                >
                  <Text style={authorScreenStyles.overflowItemText}>커뮤니티 가이드라인</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View
            style={[
              authorScreenStyles.sectionRow,
              showProfileCustomize && authorScreenStyles.ownSectionRow,
            ]}
          >
            <Text
              style={[
                authorScreenStyles.sectionLabel,
                showProfileCustomize && authorScreenStyles.ownSectionLabel,
              ]}
            >
              작성한 글
            </Text>
            <View
              style={[
                authorScreenStyles.sortRow,
                showProfileCustomize && authorScreenStyles.ownSortRow,
              ]}
            >
              {([
                { value: "newest", label: "최신순" },
                { value: "likes", label: "공감순", icon: "heart" },
                { value: "oldest", label: "오래된순" },
              ] as const).map((item) => {
                const value = item.value;
                const active = sort === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setSort(value)}
                    testID={`author-sort-${value}`}
                    accessibilityRole="button"
                    accessibilityLabel={"label" in item ? item.label : "공감 많은 순"}
                    accessibilityState={{ selected: active }}
                    style={[
                      authorScreenStyles.sortChip,
                      showProfileCustomize && authorScreenStyles.ownSortTab,
                      active && authorScreenStyles.sortChipActive,
                      showProfileCustomize && active && authorScreenStyles.ownSortTabActive,
                    ]}
                  >
                    {!showProfileCustomize && "icon" in item ? (
                      <Ionicons
                        name={item.icon}
                        size={14}
                        color={active ? tokens.colors.green900 : tokens.colors.textMuted}
                      />
                    ) : (
                      <Text
                        style={[
                          authorScreenStyles.sortChipText,
                          showProfileCustomize && authorScreenStyles.ownSortTabText,
                          active && authorScreenStyles.sortChipTextActive,
                          showProfileCustomize && active && authorScreenStyles.ownSortTabTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      );
    },
    [
      about.length,
      bio,
      bioExpanded,
      collapsedAbout,
      followingCount,
      followingsTarget,
      followerCount,
      followersTarget,
      followBusy,
      handleFollowToggle,
      handleShareAuthor,
      isFollowing,
      joinedAtLabel,
      name,
      openGuidelines,
      openSupport,
      postCount,
      postTarget,
      profilePhotoUrl,
      profileCosmetics,
      promptBlockAuthor,
      promptReportAuthor,
      showProfileCustomize,
      showFollowButton,
      settingsTarget,
      overflowOpen,
      sort,
      totalLikes,
      visibleItems,
    ]
  );

  if (showInitialLoading) {
    return (
      <SafeAreaView style={authorScreenStyles.safe} testID="author-screen">
        {hideTopBar ? null : (
          <PostTopBar
            onPressBack={() => router.back()}
            styles={authorScreenStyles}
            backButtonTestID="author-back-btn"
          />
        )}
        <View style={authorScreenStyles.center}>
          <AppLoading />
        </View>
      </SafeAreaView>
    );
  }

  if (profileError && !user) {
    return (
      <SafeAreaView style={authorScreenStyles.safe} testID="author-screen">
        {hideTopBar ? null : (
          <PostTopBar
            onPressBack={() => router.back()}
            styles={authorScreenStyles}
            backButtonTestID="author-back-btn"
          />
        )}
        <View style={authorScreenStyles.center}>
          <AppError error={profileError} onRetry={refetchProfile} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={authorScreenStyles.safe} testID="author-screen">
      {hideTopBar ? null : (
        <PostTopBar
          onPressBack={() => router.back()}
          styles={authorScreenStyles}
          backButtonTestID="author-back-btn"
        />
      )}

      <FlatList<Post>
        ref={listRef}
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          authorScreenStyles.listContent,
          showProfileCustomize && authorScreenStyles.ownListContent,
          reserveBottomDock && { paddingBottom: dock.tab.height + tokens.space.xl },
        ]}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => (
          <View style={authorScreenStyles.listItemSpacer} />
        )}
        renderItem={({ item }) => (
          <AuthorFeedItem
            item={item}
            likePending={likePending}
            onLikePress={handleLike}
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
              {showProfileCustomize ? (
                <View style={authorScreenStyles.ownEmptyState}>
                  <Text style={authorScreenStyles.ownEmptyText}>아직 쌓인 글이 없어요</Text>
                </View>
              ) : (
                <AppEmpty title="작성한 글이 없어요" />
              )}
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

          if (postsLoading && visibleItems.length > 0) {
            return (
              <View style={authorScreenStyles.listFooter}>
                <AppLoading />
              </View>
            );
          }

          return null;
        }}
      />
      <SafetyReasonModal
        visible={reportReasonVisible}
        title="작가 신고"
        description="신고가 접수되면 운영팀이 24시간 내 검토하고, 위반 시 콘텐츠 삭제 및 계정 제재가 이루어질 수 있어요."
        reasons={userSafetyReasons}
        detailMaxLength={reportDetailMaxLength}
        detailRequiredReasonCodes={reportDetailRequiredReasonCodes}
        submitLabel="신고 접수"
        submitting={reportSubmitting}
        onClose={() => {
          if (reportSubmitting) return;
          setReportReasonVisible(false);
        }}
        onSubmit={({ reasonCode, detail }) => handleReportAuthor(reasonCode, detail)}
      />
    </SafeAreaView>
  );
}

function AuthorFeedItem({
  item,
  likePending,
  onLikePress,
}: {
  item: Post;
  likePending: Record<string, boolean>;
  onLikePress: (postId: string) => void;
}) {
  const fallbackLiked = Boolean(item.viewer?.isLiked);
  const fallbackCount = item.stats?.likeCount ?? 0;
  const { liked, likeCount } = useLikeSnapshot(item.id, fallbackLiked, fallbackCount);
  const fallbackBookmarked = Boolean(item.viewer?.isBookmarked);
  const { bookmarked } = useBookmarkSnapshot(item.id, fallbackBookmarked);
  const postSnapshot = {
    ...item,
    stats: { ...item.stats, likeCount },
  };

  return (
    <FeedCard
      post={postSnapshot}
      onPress={() => router.push(`/posts/${item.id}`)}
      testID={`author-post-card-${item.id}`}
      onLikePress={() => onLikePress(item.id)}
      likeDisabled={Boolean(likePending[item.id])}
      likeTestID={`feed-like-btn-${item.id}`}
      liked={liked}
      bookmarked={bookmarked}
    />
  );
}
