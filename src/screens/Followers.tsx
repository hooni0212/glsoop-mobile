import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { normalizePublicDisplayName, pickOptionalText } from "@/lib/publicDisplayName";
import { navigateFromAppRoot } from "@/navigation/rootNavigation";
import { softPanelShadowStyle } from "@/theme/shadows";
import { tokens } from "@/theme/tokens";

type FollowersResponse = {
  ok?: boolean;
  followers?: any[];
  message?: string;
};

type FollowerUser = {
  id: string;
  name: string;
  bio?: string | null;
  about?: string | null;
  followerCount: number;
  isFollowing: boolean;
};

function toIdText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

function normalizeFollower(row: any): FollowerUser {
  return {
    id: toIdText(row?.id),
    name: normalizePublicDisplayName(row?.display_name, row?.nickname, row?.name),
    bio: pickOptionalText(row?.bio),
    about: pickOptionalText(row?.about),
    followerCount: toNumber(row?.follower_count ?? row?.followerCount),
    isFollowing: parseFlag(row?.is_following ?? row?.isFollowing),
  };
}

export default function FollowersScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const bottomPadding = useMemo(() => Math.max(tokens.space.xl, insets.bottom + 20), [
    insets.bottom,
  ]);

  const loadFollowers = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await apiGet<FollowersResponse>("/api/me/followers");
      setItems(Array.isArray(data?.followers) ? data.followers.map(normalizeFollower) : []);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFollowers();
  }, [loadFollowers]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    void navigateFromAppRoot("/me");
  }, []);

  const renderItem = useCallback(({ item }: { item: FollowerUser }) => {
    const intro = item.bio || item.about;
    const relationLabel = item.isFollowing ? "팔로잉 중" : "나를 팔로우";

    return (
      <Pressable
        onPress={() => router.push(`/users/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        testID={`followers-item-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} 작가 프로필 열기`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.trim().slice(0, 1).toUpperCase() || "글"}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {intro ? (
            <Text style={styles.bio} numberOfLines={2}>
              {intro}
            </Text>
          ) : (
            <Text style={styles.bioMuted} numberOfLines={1}>
              소개가 아직 없어요.
            </Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>팔로워 {item.followerCount}</Text>
            <Text style={[styles.relation, item.isFollowing && styles.relationActive]}>
              {relationLabel}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.textFaint} />
      </Pressable>
    );
  }, []);

  const content = loading ? (
    <View style={styles.center}>
      <AppLoading message="팔로워를 불러오는 중..." />
    </View>
  ) : error ? (
    <View style={styles.center}>
      <AppError error={error} onRetry={error.canRetry ? () => loadFollowers() : undefined} />
    </View>
  ) : (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: bottomPadding },
        items.length === 0 && styles.emptyListContent,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshing={refreshing}
      onRefresh={() => void loadFollowers("refresh")}
      ListEmptyComponent={
        <View style={styles.center}>
          <AppEmpty
            title="아직 나를 팔로우한 독자가 없어요"
            description="글을 꾸준히 남기면 천천히 독자가 모일 거예요."
          />
        </View>
      }
      testID="followers-list"
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.controlPressed]}
          accessibilityRole="button"
          accessibilityLabel="팔로워 목록 닫기"
          testID="followers-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>팔로워</Text>
          <Text style={styles.subtitle}>{items.length}명</Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  topBar: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: tokens.space.xs,
    paddingBottom: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  titleBlock: {
    alignItems: "center",
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  listContent: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: tokens.space.sm,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  separator: {
    height: tokens.space.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  card: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
    ...softPanelShadowStyle,
  },
  cardPressed: {
    opacity: 0.86,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.green050,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  bio: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    color: tokens.colors.textMuted,
  },
  bioMuted: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  relation: {
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.textFaint,
  },
  relationActive: {
    color: tokens.colors.green700,
  },
  controlPressed: {
    opacity: 0.72,
  },
});
