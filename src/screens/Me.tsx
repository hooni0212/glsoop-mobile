import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FeedCard } from "@/components/FeedCard";
import { SafetyActionSheet } from "@/components/safety/SafetyActionSheet";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useToast } from "@/feedback/ToastProvider";
import {
  type MeResponse,
  parseFlag,
  pickFirstNumber,
  pickFirstString,
} from "@/features/me/accountCenter";
import { apiGet } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { buildPostExcerpt } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { normalizePublicDisplayName, pickOptionalText } from "@/lib/publicDisplayName";
import { deletePost } from "@/services/postService";
import { softPanelShadowStyle } from "@/theme/shadows";
import { tokens } from "@/theme/tokens";
import type { Post } from "@/types/post";

type PostListResponse = {
  ok?: boolean;
  posts?: any[];
  message?: string;
};

type FollowingsResponse = {
  ok?: boolean;
  followings?: any[];
  message?: string;
};

type GrowthSummaryResponse = {
  ok?: boolean;
  summary?: {
    level?: number;
    current_xp?: number;
    next_level_xp?: number;
    today_xp?: number;
    weekly_posts?: number;
    streak_days?: number;
    max_streak_days?: number;
    title?: string;
  };
  message?: string;
};

type FollowingUser = {
  id: string;
  name: string;
  nickname?: string | null;
  bio?: string | null;
  about?: string | null;
  followerCount: number;
};

type MeTab = "summary" | "myPosts" | "likedPosts" | "followings";

function parseTags(row: any) {
  if (Array.isArray(row?.tags)) return row.tags.map(String).filter(Boolean);

  const raw = pickFirstString(row?.hashtags, row?.tag, row?.tagsCsv);
  if (!raw) return [];

  return raw
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);
}

function normalizePost(row: any): Post {
  const id = String(row?.id ?? row?.post_id ?? "");
  const title = pickFirstString(row?.title, row?.post_title);
  const content = pickFirstString(row?.content, row?.body, row?.html, row?.text);
  const createdAt = pickFirstString(row?.createdAt, row?.created_at, row?.created, row?.date);
  const authorName = normalizePublicDisplayName(
    row?.display_name,
    row?.author_display_name,
    row?.nickname,
    row?.author_nickname
  );
  const authorId = String(row?.author_id ?? row?.user_id ?? row?.uid ?? "");
  const likeCount = pickFirstNumber(row?.like_count, row?.likeCount, row?.likes, row?.likes_count);
  const bookmarkCount = pickFirstNumber(
    row?.bookmark_count,
    row?.bookmarkCount,
    row?.bookmarks,
    row?.bookmarks_count
  );

  return {
    id,
    type: (pickFirstString(row?.category, row?.type) || "short") as Post["type"],
    title: title || undefined,
    excerpt: buildPostExcerpt(content, 90),
    createdAt,
    author: {
      id: authorId || "",
      name: authorName,
    },
    stats: {
      likeCount,
      bookmarkCount,
    },
    tags: parseTags(row),
    viewer: {
      isLiked: parseFlag(row?.user_liked, row?.liked, row?.isLiked),
      isBookmarked: parseFlag(row?.user_bookmarked, row?.bookmarked, row?.isBookmarked),
    },
    ...normalizePostRenderImageFields(row, { fallbackPostId: id }),
  };
}

function normalizeFollowing(row: any): FollowingUser {
  return {
    id: String(row?.id ?? ""),
    name: normalizePublicDisplayName(row?.display_name, row?.nickname),
    nickname: pickOptionalText(row?.nickname),
    bio: typeof row?.bio === "string" ? row.bio : null,
    about: typeof row?.about === "string" ? row.about : null,
    followerCount: pickFirstNumber(row?.follower_count, row?.followerCount),
  };
}

export default function MeScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [activeTab, setActiveTab] = React.useState<MeTab>("summary");

  const [myPosts, setMyPosts] = React.useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = React.useState<Post[]>([]);
  const [followings, setFollowings] = React.useState<FollowingUser[]>([]);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [tabError, setTabError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [deletingPostId, setDeletingPostId] = React.useState<string | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = React.useState<Post | null>(null);
  const [growthSummary, setGrowthSummary] = React.useState<GrowthSummaryResponse["summary"] | null>(null);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, growth] = await Promise.all([
        apiGet<MeResponse>("/api/me"),
        apiGet<GrowthSummaryResponse>("/api/growth/summary").catch(() => null),
      ]);
      setMe(data);
      setGrowthSummary(growth?.summary ?? null);
    } catch (e) {
      const normalized = normalizeApiError(e);
      setError(normalized);
      setMe(null);
      setGrowthSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveTab = React.useCallback(async () => {
    if (activeTab === "summary") {
      setTabError(null);
      return;
    }

    setTabLoading(true);
    setTabError(null);
    try {
      if (activeTab === "myPosts") {
        const data = await apiGet<PostListResponse>("/api/posts/my");
        setMyPosts(Array.isArray(data?.posts) ? data.posts.map(normalizePost) : []);
        return;
      }

      if (activeTab === "likedPosts") {
        const data = await apiGet<PostListResponse>("/api/posts/liked");
        setLikedPosts(Array.isArray(data?.posts) ? data.posts.map(normalizePost) : []);
        return;
      }

      if (activeTab === "followings") {
        const data = await apiGet<FollowingsResponse>("/api/me/followings");
        setFollowings(
          Array.isArray(data?.followings) ? data.followings.map(normalizeFollowing) : []
        );
      }
    } catch (e) {
      setTabError(normalizeApiError(e));
    } finally {
      setTabLoading(false);
    }
  }, [activeTab]);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  React.useEffect(() => {
    void loadActiveTab();
  }, [loadActiveTab]);

  function openDeleteMyPost(item: Post) {
    if (deletingPostId) return;
    setPendingDeletePost(item);
  }

  function confirmDeleteMyPost() {
    const target = pendingDeletePost;
    if (!target || deletingPostId) return;

    setDeletingPostId(target.id);
    void (async () => {
      setTabError(null);
      try {
        await deletePost(target.id);
        setMyPosts((prev) => prev.filter((item) => item.id !== target.id));
        setPendingDeletePost(null);
        showToast("글을 삭제했어요.", { tone: "success" });
      } catch (e) {
        setTabError(normalizeApiError(e));
        showToast("글 삭제에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      } finally {
        setDeletingPostId((current) => (current === target.id ? null : current));
      }
    })();
  }

  const renderSummaryBody = () => {
    const displayName = me?.nickname || me?.name || "익명";
    const initial = displayName.trim().slice(0, 1).toUpperCase() || "글";
    const followerCount = pickFirstNumber(me?.follower_count);
    const followingCount = pickFirstNumber(me?.following_count);
    const verified = Boolean(me?.is_verified);

    return (
      <View style={styles.summaryActions}>
        <View style={styles.card}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.identityBlock}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {me?.email ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {me.email}
                </Text>
              ) : null}
              <View style={[styles.statusChip, !verified && styles.statusChipWarn]}>
                <Ionicons
                  name={verified ? "checkmark-circle" : "alert-circle-outline"}
                  size={15}
                  color={verified ? tokens.colors.green700 : tokens.colors.danger}
                />
                <Text style={[styles.statusChipText, !verified && styles.statusChipTextWarn]}>
                  {verified ? "이메일 인증 완료" : "이메일 미인증"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>Lv. {pickFirstNumber(me?.level)}</Text>
              <Text style={styles.statLabel}>레벨</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{pickFirstNumber(me?.xp)}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{pickFirstNumber(me?.streak_days)}일</Text>
              <Text style={styles.statLabel}>연속 기록</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>팔로워</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>팔로잉</Text>
            </View>
          </View>

          {me?.bio ? <Text style={styles.bodyText}>{me.bio}</Text> : null}
          {me?.about ? <Text style={styles.bodyText}>{me.about}</Text> : null}
        </View>

        <View style={styles.profileHomeCard}>
          <View style={styles.profileHomeHeader}>
            <View style={styles.profileHomeIcon}>
              <Ionicons name="person-circle-outline" size={22} color={tokens.colors.green700} />
            </View>
            <View style={styles.profileHomeCopy}>
              <Text style={styles.profileHomeTitle}>프로필 홈</Text>
              <Text style={styles.profileHomeDescription}>
                계정 설정은 계정 센터에서 관리해요.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/account-center")}
              style={({ pressed }) => [styles.accountCenterBtn, pressed && styles.controlPressed]}
              accessibilityRole="button"
              accessibilityLabel="계정 센터 열기"
            >
              <Text style={styles.accountCenterBtnText}>계정 센터</Text>
            </Pressable>
          </View>

          <View style={styles.quickActionRow}>
            <Pressable
              onPress={() => router.push("/profile-customize")}
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
              testID="me-profile-customize-btn"
              accessibilityRole="button"
              accessibilityLabel="프로필 꾸미기 열기"
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="sparkles-outline" size={18} color={tokens.colors.green700} />
              </View>
              <View style={styles.quickActionCopy}>
                <Text style={styles.quickActionBtnTitle}>프로필 꾸미기</Text>
                <Text style={styles.quickActionBtnDescription}>뱃지와 스티커</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textFaint} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/account-center")}
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="계정 센터 열기"
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="settings-outline" size={18} color={tokens.colors.green700} />
              </View>
              <View style={styles.quickActionCopy}>
                <Text style={styles.quickActionBtnTitle}>계정 센터</Text>
                <Text style={styles.quickActionBtnDescription}>프로필과 보안 설정</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textFaint} />
            </Pressable>
          </View>
        </View>

        {growthSummary ? (
          <View style={styles.growthCard}>
            <View style={styles.growthHeaderRow}>
              <View style={styles.growthHeaderCopy}>
                <Text style={styles.growthTitle}>성장 요약</Text>
                <Text style={styles.growthDescription}>
                  Lv.{pickFirstNumber(growthSummary.level)} {pickFirstString(growthSummary.title)}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/growth")}
                style={({ pressed }) => [styles.growthShortcutBtn, pressed && styles.controlPressed]}
                accessibilityRole="button"
                accessibilityLabel="성장 상세 열기"
              >
                <Text style={styles.growthShortcutBtnText}>자세히</Text>
              </Pressable>
            </View>

            <View style={styles.growthStatRow}>
              <Text style={styles.growthStatChip}>
                오늘 +{pickFirstNumber(growthSummary.today_xp)} XP
              </Text>
              <Text style={styles.growthStatChip}>
                이번 주 {pickFirstNumber(growthSummary.weekly_posts)}개
              </Text>
              <Text style={styles.growthStatChip}>
                연속 {pickFirstNumber(growthSummary.streak_days)}일
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderTabBody = () => {
    if (activeTab === "summary") {
      return renderSummaryBody();
    }

    if (tabLoading) {
      return (
        <View style={styles.center}>
          <AppLoading message="목록을 불러오는 중..." />
        </View>
      );
    }

    if (tabError) {
      return (
        <View style={styles.center}>
          <AppError error={tabError} onRetry={tabError.canRetry ? loadActiveTab : undefined} />
        </View>
      );
    }

    if (activeTab === "myPosts" || activeTab === "likedPosts") {
      const items = activeTab === "myPosts" ? myPosts : likedPosts;
      if (items.length === 0) {
        return (
          <View style={styles.center}>
            <AppEmpty
              title={activeTab === "myPosts" ? "작성한 글이 없어요" : "좋아요한 글이 없어요"}
            />
          </View>
        );
      }

      return (
        <View style={styles.postList}>
          {items.map((item) => (
            <View key={item.id} style={styles.postItem}>
              <FeedCard
                post={item}
                onPress={() => router.push(`/posts/${item.id}`)}
                liked={Boolean(item.viewer?.isLiked)}
                bookmarked={Boolean(item.viewer?.isBookmarked)}
              />
              {activeTab === "myPosts" ? (
                <View style={styles.postActionRow}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/write", params: { postId: item.id } })}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.controlPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="내 글 수정"
                  >
                    <Ionicons name="create-outline" size={16} color={tokens.colors.text} />
                    <Text style={styles.secondaryBtnText}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openDeleteMyPost(item)}
                    style={({ pressed }) => [
                      styles.dangerBtn,
                      deletingPostId === item.id && styles.disabledBtn,
                      pressed && deletingPostId !== item.id && styles.controlPressed,
                    ]}
                    disabled={deletingPostId === item.id}
                    accessibilityRole="button"
                    accessibilityLabel="내 글 삭제"
                    testID={`me-post-delete-btn-${item.id}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={tokens.colors.danger} />
                    <Text style={styles.dangerBtnText}>
                      {deletingPostId === item.id ? "삭제 중..." : "삭제"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      );
    }

    if (followings.length === 0) {
      return (
        <View style={styles.center}>
          <AppEmpty title="팔로잉한 사용자가 없어요" />
        </View>
      );
    }

    return (
      <View style={styles.followingList}>
        {followings.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/users/${item.id}`)}
            style={({ pressed }) => [styles.followingCard, pressed && styles.followingCardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`팔로잉 프로필 열기: ${item.name}`}
          >
            <View style={styles.followingAvatar}>
              <Ionicons name="person-outline" size={17} color={tokens.colors.green700} />
            </View>
            <View style={styles.followingCopy}>
              <Text style={styles.followingName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.bio ? <Text style={styles.followingBody} numberOfLines={2}>{item.bio}</Text> : null}
              {item.about ? <Text style={styles.followingBody} numberOfLines={2}>{item.about}</Text> : null}
              <Text style={styles.followingFoot}>팔로워 {item.followerCount}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={tokens.colors.textFaint} />
          </Pressable>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppLoading message="내 정보를 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="내 정보를 보려면 로그인해 주세요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.replace("/(auth)"),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppError error={error} onRetry={error.canRetry ? loadMe : undefined} />
        </View>
      </SafeAreaView>
    );
  }

  if (!me) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="표시할 정보가 없어요"
            description="잠시 후 다시 시도해 주세요."
            primaryAction={{ label: "새로고침", onPress: loadMe }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>내 정보</Text>
        <View style={styles.tabRow}>
          {([
            ["summary", "요약"],
            ["myPosts", "내 글"],
            ["likedPosts", "좋아요"],
            ["followings", "팔로잉"],
          ] as const).map(([value, label]) => {
            const active = activeTab === value;
            return (
              <Pressable
                key={value}
                onPress={() => setActiveTab(value)}
                style={({ pressed }) => [
                  styles.tabBtn,
                  active && styles.tabBtnActive,
                  pressed && styles.controlPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {renderTabBody()}
      </ScrollView>
      <SafetyActionSheet
        visible={!!pendingDeletePost}
        title="글 삭제"
        description={
          pendingDeletePost
            ? `"${pendingDeletePost.title || "제목 없는 글"}"을 삭제할까요? 삭제한 글은 되돌릴 수 없어요.`
            : ""
        }
        onRequestClose={() => {
          if (!deletingPostId) setPendingDeletePost(null);
        }}
        actions={[
          {
            label: deletingPostId ? "삭제 중..." : "삭제하기",
            variant: "danger",
            disabled: Boolean(deletingPostId),
            onPress: confirmDeleteMyPost,
            testID: "me-post-delete-confirm-btn",
          },
          {
            label: "취소",
            variant: "ghost",
            disabled: Boolean(deletingPostId),
            onPress: () => setPendingDeletePost(null),
            testID: "me-post-delete-cancel-btn",
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  h1: { fontSize: tokens.font.h1, fontWeight: "900", color: tokens.colors.text },
  card: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    ...softPanelShadowStyle,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  identityBlock: {
    flex: 1,
    gap: 5,
  },
  name: { fontSize: 20, fontWeight: "900", color: tokens.colors.text },
  meta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  statusChip: {
    alignSelf: "flex-start",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  statusChipWarn: {
    backgroundColor: tokens.colors.dangerSoft,
    borderColor: tokens.colors.dangerBorder,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  statusChipTextWarn: {
    color: tokens.colors.danger,
  },
  bodyText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  statTile: {
    minWidth: 96,
    flexGrow: 1,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.white,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  row: { flexDirection: "row", gap: tokens.space.sm as any, flexWrap: "wrap" },
  badge: {
    fontSize: tokens.font.small,
    color: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  tabBtn: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: tokens.colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: tokens.colors.green100,
    borderColor: tokens.colors.green700,
  },
  tabBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  tabBtnTextActive: {
    color: tokens.colors.green700,
  },
  controlPressed: {
    opacity: 0.82,
  },
  summaryActions: { gap: tokens.space.sm as any },
  profileHomeCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.md as any,
    ...softPanelShadowStyle,
  },
  profileHomeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  profileHomeIcon: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  profileHomeCopy: {
    flex: 1,
    gap: 4,
  },
  profileHomeTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  profileHomeDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  accountCenterBtn: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.green700,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.colors.green100,
  },
  accountCenterBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  quickActionRow: {
    gap: tokens.space.sm as any,
  },
  quickActionBtn: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
  },
  quickActionBtnPressed: {
    backgroundColor: tokens.colors.green100,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  quickActionCopy: {
    flex: 1,
    gap: 4,
  },
  quickActionBtnTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  quickActionBtnDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  growthCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
    ...softPanelShadowStyle,
  },
  growthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  growthHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  growthTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  growthDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  growthShortcutBtn: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.green700,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.colors.green100,
  },
  growthShortcutBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  growthStatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  growthStatChip: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
    backgroundColor: tokens.colors.white,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  postList: { gap: tokens.space.md as any },
  postItem: { gap: tokens.space.xs as any },
  postActionRow: {
    flexDirection: "row",
    gap: tokens.space.xs as any,
  },
  followingList: { gap: tokens.space.sm as any },
  followingCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.sm as any,
    ...softPanelShadowStyle,
  },
  followingCardPressed: {
    opacity: 0.92,
  },
  followingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  followingCopy: {
    flex: 1,
    gap: 4,
  },
  followingName: { fontSize: 15, fontWeight: "900", color: tokens.colors.text },
  followingMeta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  followingBody: { fontSize: tokens.font.small, color: tokens.colors.textMuted, lineHeight: 20 },
  followingFoot: { fontSize: tokens.font.small, color: tokens.colors.green700, fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    gap: 6,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: tokens.colors.text, fontSize: 15, fontWeight: "800" },
  dangerBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    gap: 6,
    backgroundColor: tokens.colors.dangerSoft,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.55,
  },
  dangerBtnText: {
    color: tokens.colors.danger,
    fontSize: tokens.font.small,
    fontWeight: "800",
  },
});
