import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { type Href, router, usePathname } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import {
  decrementNotificationUnreadCount,
  setNotificationUnreadCount,
} from "@/features/notifications/notificationStore";
import { useToast } from "@/feedback/ToastProvider";
import { buildAuthRoute } from "@/lib/authRedirect";
import { formatRelativeKorean } from "@/lib/dateTime";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import * as haptics from "@/lib/haptics";
import {
  listNotifications,
  markNotificationRead,
  type AppNotification,
  type NotificationType,
} from "@/services/notificationService";
import { tokens } from "@/theme/tokens";

const PAGE_SIZE = 30;
const NOW_READ_AT = "optimistic";

function iconForType(type: NotificationType) {
  if (type === "post_reaction") return "heart-outline";
  if (type === "post_comment") return "chatbubble-outline";
  if (type === "comment_reply") return "return-down-forward-outline";
  if (type === "following_new_post") return "newspaper-outline";
  if (type === "admin_operational_alert") return "alert-circle-outline";
  if (type === "marketing_campaign") return "leaf-outline";
  return "person-add-outline";
}

function sanitizeTestId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function asInternalRoute(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/(auth)")) return null;
  return trimmed as Href;
}

function TopBar() {
  const goBack = React.useCallback(() => {
    haptics.selection();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  }, []);

  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        testID="notifications-back-btn"
      >
        <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topTitle}>알림</Text>
      <View style={styles.topSpacer} />
    </View>
  );
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (notification: AppNotification) => void;
}) {
  const unread = !item.readAt;
  const timeLabel = formatRelativeKorean(item.createdAt);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      testID={`notification-item-${sanitizeTestId(item.id)}`}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={iconForType(item.type)} size={20} color={tokens.colors.green700} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {unread ? <View style={styles.unreadDot} testID={`notification-unread-${sanitizeTestId(item.id)}`} /> : null}
        </View>
        {item.body ? (
          <Text style={styles.rowBody} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        {timeLabel ? <Text style={styles.rowTime}>{timeLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const pathname = usePathname();
  const { token, signOut } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const offsetRef = React.useRef(0);
  const [error, setError] = React.useState<AppErrorModel | null>(null);

  const redirectToLogin = React.useCallback(async () => {
    showToast("알림은 로그인 후 확인할 수 있어요.", { tone: "error" });
    await signOut();
    router.replace(buildAuthRoute("/(auth)/login", "/notifications"));
  }, [showToast, signOut]);

  const loadNotifications = React.useCallback(
    async (options: { reset?: boolean; quiet?: boolean } = {}) => {
      if (!token) return;
      const reset = options.reset !== false;
      const nextOffset = reset ? 0 : offsetRef.current;

      if (reset && !options.quiet) {
        setLoading(true);
      } else if (reset) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const result = await listNotifications({ limit: PAGE_SIZE, offset: nextOffset });
        setItems((current) => {
          if (reset) return result.items;
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...result.items.filter((item) => !seen.has(item.id))];
        });
        setHasMore(result.hasMore);
        offsetRef.current = nextOffset + result.items.length;
        setNotificationUnreadCount(result.unreadCount);
      } catch (e) {
        const normalized = normalizeApiError(e);
        setError(normalized);
        if (normalized.kind === "auth") {
          await redirectToLogin();
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [redirectToLogin, token]
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!token) {
        router.replace(buildAuthRoute("/(auth)/login", "/notifications"));
        return;
      }

      void loadNotifications({ reset: true });
    }, [loadNotifications, token])
  );

  React.useEffect(() => {
    if (token) return;
    router.replace(buildAuthRoute("/(auth)/login", pathname || "/notifications"));
  }, [pathname, token]);

  const refresh = React.useCallback(() => {
    void loadNotifications({ reset: true, quiet: true });
  }, [loadNotifications]);

  const loadMore = React.useCallback(() => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    void loadNotifications({ reset: false });
  }, [hasMore, loadNotifications, loading, loadingMore, refreshing]);

  const onPressNotification = React.useCallback(
    (notification: AppNotification) => {
      haptics.selection();
      const wasUnread = !notification.readAt;
      if (wasUnread) {
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, readAt: NOW_READ_AT } : item
          )
        );
        decrementNotificationUnreadCount();
      }

      void markNotificationRead(notification.id).catch(() => {
        showToast("알림 읽음 처리를 저장하지 못했어요.", { tone: "error" });
      });

      const target = asInternalRoute(notification.targetPath) ?? "/notifications";
      if (target !== "/notifications") {
        router.push(target);
      }
    },
    [showToast]
  );

  const renderEmpty = React.useCallback(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <AppLoading message="알림을 불러오는 중..." />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <AppError error={error} onRetry={() => loadNotifications({ reset: true })} />
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <AppEmpty
          title="아직 알림이 없어요"
          description="내 글의 댓글, 답글, 새 팔로워와 팔로잉 작가의 새 글 소식이 생기면 여기에 모아둘게요."
        />
      </View>
    );
  }, [error, loadNotifications, loading]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="notifications-screen">
      <TopBar />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={onPressNotification} />
        )}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={tokens.colors.green700} size="small" />
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={tokens.colors.green700}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
      />
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
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  topSpacer: {
    width: 42,
    height: 42,
  },
  listContent: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  row: {
    minHeight: 78,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rowUnread: {
    backgroundColor: "transparent",
  },
  rowPressed: {
    opacity: 0.76,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  rowBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: tokens.colors.textMuted,
  },
  rowTime: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.textFaint,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: tokens.colors.green700,
  },
  separator: {
    height: 1,
    backgroundColor: tokens.colors.border,
    marginLeft: 50,
  },
  center: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 280,
    justifyContent: "center",
  },
  footerLoading: {
    paddingVertical: 18,
  },
});
