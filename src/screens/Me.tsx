import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { deletePost } from "@/services/postService";
import { tokens } from "@/theme/tokens";
import type { Post } from "@/types/post";

type MeResponse = {
  ok?: boolean;
  id: number;
  name: string;
  nickname?: string | null;
  email: string;
  bio?: string | null;
  about?: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
  remember_login_enabled?: boolean;
  marketing_email_opt_in?: boolean;
  level: number;
  xp: number;
  streak_days: number;
  max_streak_days: number;
  follower_count?: number;
  following_count?: number;
};

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

type SessionsResponse = {
  ok?: boolean;
  sessions?: any[];
  message?: string;
};

type UpdateMeResponse = {
  ok?: boolean;
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

type SessionItem = {
  sid: string;
  current: boolean;
  rememberMe: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string;
  ipHint?: string | null;
};

type MeTab = "summary" | "myPosts" | "likedPosts" | "followings" | "sessions";

function pickFirstString(...vals: any[]) {
  for (const value of vals) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function pickFirstNumber(...vals: any[]) {
  for (const value of vals) {
    const next = Number(value);
    if (!Number.isNaN(next)) return next;
  }
  return 0;
}

function parseFlag(...vals: any[]) {
  for (const value of vals) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "1" || normalized === "true") return true;
      if (normalized === "0" || normalized === "false" || normalized === "") return false;
    }
  }
  return false;
}

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

function normalizeSession(row: any): SessionItem {
  return {
    sid: pickFirstString(row?.sid),
    current: parseFlag(row?.current),
    rememberMe: parseFlag(row?.remember_me, row?.rememberMe),
    createdAt: pickFirstString(row?.created_at, row?.createdAt),
    lastSeenAt: pickFirstString(row?.last_seen_at, row?.lastSeenAt),
    expiresAt: pickFirstString(row?.expires_at, row?.expiresAt),
    userAgent: pickFirstString(row?.user_agent, row?.userAgent) || "알 수 없는 기기",
    ipHint: pickFirstString(row?.ip_hint, row?.ipHint) || null,
  };
}

function formatDateTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export default function MeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [activeTab, setActiveTab] = React.useState<MeTab>("summary");

  const [myPosts, setMyPosts] = React.useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = React.useState<Post[]>([]);
  const [followings, setFollowings] = React.useState<FollowingUser[]>([]);
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [tabError, setTabError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [logoutAllBusy, setLogoutAllBusy] = React.useState(false);
  const [deletingPostId, setDeletingPostId] = React.useState<string | null>(null);
  const [showEdit, setShowEdit] = React.useState(false);
  const [editNickname, setEditNickname] = React.useState("");
  const [editBio, setEditBio] = React.useState("");
  const [editAbout, setEditAbout] = React.useState("");
  const [rememberLoginEnabled, setRememberLoginEnabled] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MeResponse>("/api/me");
      setMe(data);
    } catch (e) {
      const normalized = normalizeApiError(e);
      setError(normalized);
      setMe(null);
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
        return;
      }

      if (activeTab === "sessions") {
        const data = await apiGet<SessionsResponse>("/api/me/sessions");
        setSessions(Array.isArray(data?.sessions) ? data.sessions.map(normalizeSession) : []);
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
    if (!me) return;
    setEditNickname(me.nickname ?? "");
    setEditBio(me.bio ?? "");
    setEditAbout(me.about ?? "");
    setRememberLoginEnabled(parseFlag(me.remember_login_enabled));
  }, [me]);

  React.useEffect(() => {
    void loadActiveTab();
  }, [loadActiveTab]);

  async function onLogout() {
    await signOut();
    router.replace("/(auth)");
  }

  async function onLogoutAll() {
    setLogoutAllBusy(true);
    try {
      await apiPost("/api/logout-all", {});
      await signOut();
      router.replace("/(auth)");
    } catch (e) {
      setTabError(normalizeApiError(e));
    } finally {
      setLogoutAllBusy(false);
    }
  }

  async function onSaveProfile() {
    const nickname = editNickname.trim();
    if (!nickname) {
      setSaveMessage(null);
      setSaveError(normalizeApiError(new Error("닉네임을 입력해주세요.")));
      return;
    }

    setSavingProfile(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await apiPut<UpdateMeResponse>("/api/me", {
        nickname,
        bio: editBio.trim(),
        about: editAbout.trim(),
        remember_login_enabled: rememberLoginEnabled,
      });
      if (res?.ok === false) {
        throw new Error(res.message || "프로필 수정에 실패했어요.");
      }
      setSaveMessage(res?.message || "프로필을 저장했어요.");
      setShowEdit(false);
      await loadMe();
    } catch (e) {
      setSaveError(normalizeApiError(e));
    } finally {
      setSavingProfile(false);
    }
  }

  function onDeleteMyPost(postId: string) {
    Alert.alert("글 삭제", "정말 이 글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setDeletingPostId(postId);
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
        },
      },
    ]);
  }

  const renderTabBody = () => {
    if (activeTab === "summary") {
      return (
        <View style={styles.summaryActions}>
          <View style={styles.editCard}>
            <View style={styles.editHeaderRow}>
              <View style={styles.editHeaderCopy}>
                <Text style={styles.editTitle}>프로필 관리</Text>
                <Text style={styles.editDescription}>
                  닉네임, 소개, 로그인 유지 설정을 바로 수정할 수 있어요.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowEdit((prev) => !prev);
                  setSaveMessage(null);
                  setSaveError(null);
                }}
                style={styles.editToggleBtn}
              >
                <Text style={styles.editToggleBtnText}>{showEdit ? "닫기" : "수정"}</Text>
              </Pressable>
            </View>

            {showEdit ? (
              <View style={styles.editForm}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>닉네임</Text>
                  <TextInput
                    value={editNickname}
                    onChangeText={setEditNickname}
                    placeholder="닉네임"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>한 줄 소개</Text>
                  <TextInput
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="한 줄 소개"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>자기소개</Text>
                  <TextInput
                    value={editAbout}
                    onChangeText={setEditAbout}
                    placeholder="자기소개"
                    multiline
                    textAlignVertical="top"
                    style={[styles.input, styles.textArea]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>로그인 유지</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      onPress={() => setRememberLoginEnabled(true)}
                      style={[
                        styles.toggleChip,
                        rememberLoginEnabled && styles.toggleChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleChipText,
                          rememberLoginEnabled && styles.toggleChipTextActive,
                        ]}
                      >
                        켜기
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRememberLoginEnabled(false)}
                      style={[
                        styles.toggleChip,
                        !rememberLoginEnabled && styles.toggleChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleChipText,
                          !rememberLoginEnabled && styles.toggleChipTextActive,
                        ]}
                      >
                        끄기
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {saveError ? (
                  <Text style={styles.formErrorText}>{saveError.message}</Text>
                ) : null}
                {saveMessage ? <Text style={styles.formSuccessText}>{saveMessage}</Text> : null}

                <View style={styles.editActionRow}>
                  <Pressable
                    onPress={() => void onSaveProfile()}
                    style={[styles.primaryBtn, savingProfile && styles.disabledBtn]}
                    disabled={savingProfile}
                  >
                    <Text style={styles.primaryBtnText}>
                      {savingProfile ? "저장 중..." : "저장하기"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!me) return;
                      setEditNickname(me.nickname ?? "");
                      setEditBio(me.bio ?? "");
                      setEditAbout(me.about ?? "");
                      setRememberLoginEnabled(parseFlag(me.remember_login_enabled));
                      setSaveMessage(null);
                      setSaveError(null);
                      setShowEdit(false);
                    }}
                    style={styles.secondaryBtn}
                    disabled={savingProfile}
                  >
                    <Text style={styles.secondaryBtnText}>취소</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => router.push("/profile-customize")}
            style={styles.primaryBtn}
            testID="me-profile-customize-btn"
          >
            <Text style={styles.primaryBtnText}>프로필 꾸미기</Text>
          </Pressable>

          <Pressable
            onPress={() => void onLogoutAll()}
            style={styles.secondaryBtn}
            disabled={logoutAllBusy}
          >
            <Text style={styles.secondaryBtnText}>
              {logoutAllBusy ? "처리 중..." : "전체 로그아웃"}
            </Text>
          </Pressable>

          <Pressable onPress={onLogout} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>로그아웃</Text>
          </Pressable>

          <Pressable onPress={loadMe} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>새로고침</Text>
          </Pressable>
        </View>
      );
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

    if (activeTab === "followings") {
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
    }

    if (sessions.length === 0) {
      return (
        <View style={styles.center}>
          <AppEmpty title="활성 세션이 없어요" />
        </View>
      );
    }

    return (
      <View style={styles.sessionList}>
        {sessions.map((session) => (
          <View key={session.sid} style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>
              {session.current ? "현재 기기" : "다른 기기"}
            </Text>
            <Text style={styles.sessionMeta}>{session.userAgent}</Text>
            <Text style={styles.sessionMeta}>최근 활동 {formatDateTime(session.lastSeenAt)}</Text>
            <Text style={styles.sessionMeta}>만료 {formatDateTime(session.expiresAt)}</Text>
            <Text style={styles.sessionMeta}>
              {session.rememberMe ? "로그인 유지" : "기본 세션"}
              {session.ipHint ? ` · ${session.ipHint}` : ""}
            </Text>
          </View>
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

  const displayName = me.nickname || me.name;
  const followerCount = pickFirstNumber(me.follower_count);
  const followingCount = pickFirstNumber(me.following_count);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>내 정보</Text>

        <View style={styles.card}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.meta}>{me.email}</Text>
          <View style={styles.row}>
            <Text style={styles.badge}>Lv. {me.level}</Text>
            <Text style={styles.badge}>XP {me.xp}</Text>
            <Text style={styles.badge}>연속 {me.streak_days}일</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.badge}>팔로워 {followerCount}</Text>
            <Text style={styles.badge}>팔로잉 {followingCount}</Text>
          </View>
          {me.bio ? <Text style={styles.bodyText}>{me.bio}</Text> : null}
          {me.about ? <Text style={styles.bodyText}>{me.about}</Text> : null}
          <View style={styles.row}>
            <Text style={styles.badgeSecondary}>
              로그인 유지 {parseFlag(me.remember_login_enabled) ? "켜짐" : "꺼짐"}
            </Text>
            <Text style={styles.badgeSecondary}>
              마케팅 {parseFlag(me.marketing_email_opt_in) ? "동의" : "미동의"}
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {([
            ["summary", "요약"],
            ["myPosts", "내 글"],
            ["likedPosts", "좋아요"],
            ["followings", "팔로잉"],
            ["sessions", "세션"],
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
  badgeSecondary: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    backgroundColor: tokens.colors.surface,
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
  editCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: tokens.space.md as any,
  },
  editHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
  },
  editHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  editDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  editToggleBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.colors.surface,
  },
  editToggleBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  editForm: {
    gap: tokens.space.md as any,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: tokens.colors.text,
  },
  textArea: {
    minHeight: 108,
  },
  toggleRow: {
    flexDirection: "row",
    gap: tokens.space.xs as any,
  },
  toggleChip: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tokens.colors.surface,
  },
  toggleChipActive: {
    backgroundColor: tokens.colors.green100,
    borderColor: tokens.colors.green700,
  },
  toggleChipText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  toggleChipTextActive: {
    color: tokens.colors.green900,
  },
  formErrorText: {
    fontSize: tokens.font.small,
    color: tokens.colors.red700,
    lineHeight: 20,
  },
  formSuccessText: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    lineHeight: 20,
  },
  editActionRow: {
    gap: tokens.space.sm as any,
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
  sessionList: { gap: tokens.space.sm as any },
  sessionCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
    gap: 6,
  },
  sessionTitle: { fontSize: 15, fontWeight: "900", color: tokens.colors.text },
  sessionMeta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  primaryBtn: {
    backgroundColor: tokens.colors.green900,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: tokens.colors.textInverse,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  secondaryBtnText: { color: tokens.colors.text, fontSize: 15, fontWeight: "800" },
  dangerBtn: {
    flex: 1,
    backgroundColor: tokens.colors.red100,
    borderWidth: 1,
    borderColor: tokens.colors.red300,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBtnText: {
    color: tokens.colors.red700,
    fontSize: tokens.font.small,
    fontWeight: "800",
  },
  ghostBtn: { paddingVertical: 10, alignItems: "center" },
  ghostBtnText: { color: tokens.colors.textMuted, fontSize: tokens.font.small, fontWeight: "800" },
});
