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

type FollowingsResponse = {
  ok?: boolean;
  followings?: any[];
  message?: string;
};

type FollowingUser = {
  id: string;
  name: string;
  bio?: string | null;
  about?: string | null;
  followerCount: number;
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

function normalizeFollowing(row: any): FollowingUser {
  return {
    id: toIdText(row?.id),
    name: normalizePublicDisplayName(row?.display_name, row?.nickname, row?.name),
    bio: pickOptionalText(row?.bio),
    about: pickOptionalText(row?.about),
    followerCount: toNumber(row?.follower_count ?? row?.followerCount),
  };
}

export default function FollowingsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const bottomPadding = useMemo(() => Math.max(tokens.space.xl, insets.bottom + 20), [
    insets.bottom,
  ]);

  const loadFollowings = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await apiGet<FollowingsResponse>("/api/me/followings");
      setItems(Array.isArray(data?.followings) ? data.followings.map(normalizeFollowing) : []);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFollowings();
  }, [loadFollowings]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    void navigateFromAppRoot("/me");
  }, []);

  const renderItem = useCallback(({ item }: { item: FollowingUser }) => {
    const intro = item.bio || item.about;
    return (
      <Pressable
        onPress={() => router.push(`/users/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        testID={`followings-item-${item.id}`}
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
          <Text style={styles.meta}>팔로워 {item.followerCount}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.textFaint} />
      </Pressable>
    );
  }, []);

  const content = loading ? (
    <View style={styles.center}>
      <AppLoading message="팔로잉을 불러오는 중..." />
    </View>
  ) : error ? (
    <View style={styles.center}>
      <AppError error={error} onRetry={error.canRetry ? () => loadFollowings() : undefined} />
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
      onRefresh={() => void loadFollowings("refresh")}
      ListEmptyComponent={
        <View style={styles.center}>
          <AppEmpty title="팔로잉한 작가가 없어요" description="좋아하는 작가를 팔로우하면 이곳에 모여요." />
        </View>
      }
      testID="followings-list"
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
          accessibilityLabel="팔로잉 목록 닫기"
          testID="followings-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>팔로잉</Text>
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
  meta: {
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  controlPressed: {
    opacity: 0.72,
  },
});
