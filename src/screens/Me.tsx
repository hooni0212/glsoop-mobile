import React from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import {
  type MeResponse,
  parseFlag,
  pickFirstNumber,
  pickFirstString,
} from "@/features/me/accountCenter";
import { apiGet } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { deletePost } from "@/services/postService";
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
  email: string;
  followerCount: number;
};

type MeTab = "summary" | "myPosts" | "likedPosts" | "followings";

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toExcerpt(content: any, maxLen = 90) {
  const raw = typeof content === "string" ? content : "";
  const plain = stripHtml(raw);
  return plain.length > maxLen ? `${plain.slice(0, maxLen).trim()}...` : plain;
}

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
  const authorName = pickFirstString(row?.author_name, row?.authorName, row?.nickname, row?.name);
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
    excerpt: toExcerpt(content),
    createdAt,
    author: {
      id: authorId || "",
      name: authorName || "익명",
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
  };
}

function normalizeFollowing(row: any): FollowingUser {
  return {
    id: String(row?.id ?? ""),
    name: pickFirstString(row?.name) || "익명",
    nickname: typeof row?.nickname === "string" ? row.nickname : null,
    bio: typeof row?.bio === "string" ? row.bio : null,
    about: typeof row?.about === "string" ? row.about : null,
    email: pickFirstString(row?.email),
    followerCount: pickFirstNumber(row?.follower_count, row?.followerCount),
  };
}

export default function MeScreen() {
  const router = useRouter();

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

  function onDeleteMyPost(postId: string) {
    setDeletingPostId(postId);
    void (async () => {
      setTabError(null);
      try {
        await deletePost(postId);
        setMyPosts((prev) => prev.filter((item) => item.id !== postId));
      } catch (e) {
        setTabError(normalizeApiError(e));
      } finally {
        setDeletingPostId((current) => (current === postId ? null : current));
      }
    })();
  }

  const renderSummaryBody = () => {
    const displayName = me?.nickname || me?.name || "익명";
    const followerCount = pickFirstNumber(me?.follower_count);
    const followingCount = pickFirstNumber(me?.following_count);

    return (
      <View style={styles.summaryActions}>
        <View style={styles.card}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.meta}>{me?.email}</Text>
          <View style={styles.row}>
            <Text style={styles.badge}>Lv. {pickFirstNumber(me?.level)}</Text>
            <Text style={styles.badge}>XP {pickFirstNumber(me?.xp)}</Text>
            <Text style={styles.badge}>연속 {pickFirstNumber(me?.streak_days)}일</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.badge}>팔로워 {followerCount}</Text>
            <Text style={styles.badge}>팔로잉 {followingCount}</Text>
          </View>
          {me?.bio ? <Text style={styles.bodyText}>{me.bio}</Text> : null}
          {me?.about ? <Text style={styles.bodyText}>{me.about}</Text> : null}
        </View>

        <View style={styles.profileHomeCard}>
          <View style={styles.profileHomeHeader}>
            <View style={styles.profileHomeCopy}>
              <Text style={styles.profileHomeTitle}>프로필 홈</Text>
              <Text style={styles.profileHomeDescription}>
                활동은 여기서 보고, 보안과 계정 정리는 계정 센터에서 따로 관리해요.
              </Text>
            </View>
            <Pressable onPress={() => router.push("/account-center")} style={styles.accountCenterBtn}>
              <Text style={styles.accountCenterBtnText}>계정 센터</Text>
            </Pressable>
          </View>

          <View style={styles.quickActionRow}>
            <Pressable
              onPress={() => router.push("/profile-customize")}
              style={styles.quickActionBtn}
              testID="me-profile-customize-btn"
            >
              <Text style={styles.quickActionBtnTitle}>프로필 꾸미기</Text>
              <Text style={styles.quickActionBtnDescription}>뱃지와 스티커를 정리해요</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/account-center")}
              style={styles.quickActionBtn}
            >
              <Text style={styles.quickActionBtnTitle}>계정 센터</Text>
              <Text style={styles.quickActionBtnDescription}>프로필, 보안, 탈퇴를 관리해요</Text>
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
              <Pressable onPress={() => router.push("/growth")} style={styles.growthShortcutBtn}>
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
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnText}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteMyPost(item.id)}
                    style={styles.dangerBtn}
                    disabled={deletingPostId === item.id}
                  >
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
            style={styles.followingCard}
          >
            <Text style={styles.followingName}>{item.nickname || item.name}</Text>
            <Text style={styles.followingMeta}>{item.email}</Text>
            {item.bio ? <Text style={styles.followingBody}>{item.bio}</Text> : null}
            {item.about ? <Text style={styles.followingBody}>{item.about}</Text> : null}
            <Text style={styles.followingFoot}>팔로워 {item.followerCount}</Text>
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
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {renderTabBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    paddingHorizontal: tokens.space.xl,
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
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  name: { fontSize: 20, fontWeight: "900", color: tokens.colors.text },
  meta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  bodyText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  row: { flexDirection: "row", gap: tokens.space.sm as any, flexWrap: "wrap" },
  badge: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
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
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.colors.surfaceStrong,
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
    color: tokens.colors.green900,
  },
  summaryActions: { gap: tokens.space.sm as any },
  profileHomeCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.md as any,
  },
  profileHomeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
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
    color: tokens.colors.green900,
  },
  quickActionRow: {
    gap: tokens.space.sm as any,
  },
  quickActionBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
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
    color: tokens.colors.green900,
  },
  growthStatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  growthStatChip: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
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
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: 6,
  },
  followingName: { fontSize: 15, fontWeight: "900", color: tokens.colors.text },
  followingMeta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  followingBody: { fontSize: tokens.font.small, color: tokens.colors.textMuted, lineHeight: 20 },
  followingFoot: { fontSize: tokens.font.small, color: tokens.colors.green900, fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: tokens.colors.text, fontSize: 15, fontWeight: "800" },
  dangerBtn: {
    flex: 1,
    backgroundColor: tokens.colors.dangerSoft,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBtnText: {
    color: tokens.colors.danger,
    fontSize: tokens.font.small,
    fontWeight: "800",
  },
});
