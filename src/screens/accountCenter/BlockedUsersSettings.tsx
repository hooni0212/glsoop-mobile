import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useToast } from "@/feedback/ToastProvider";
import { buildAuthRoute } from "@/lib/authRedirect";
import { normalizeApiError } from "@/lib/errors";
import { formatDateTime } from "@/features/me/accountCenter";
import {
  listBlockedUsers,
  unblockUserById,
  type BlockedUser,
} from "@/services/safetyService";
import { tokens } from "@/theme/tokens";

export default function AccountCenterBlockedUsersScreen() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [items, setItems] = React.useState<BlockedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);

  const loadBlockedUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextItems = await listBlockedUsers();
      setItems(nextItems);
    } catch (e) {
      setError(normalizeApiError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const confirmUnblock = React.useCallback(
    (item: BlockedUser) => {
      Alert.alert(
        "차단 해제",
        `${item.displayName} 사용자의 차단을 해제할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "차단 해제",
            onPress: () => {
              void (async () => {
                setBusyUserId(item.userId);
                try {
                  const result = await unblockUserById(item.userId);
                  setItems((current) =>
                    current.filter((entry) => entry.userId !== item.userId)
                  );
                  showToast(result.message, { tone: "success" });
                } catch (e) {
                  const normalized = normalizeApiError(e);
                  if (normalized.kind === "auth") {
                    router.replace(buildAuthRoute("/(auth)", pathname));
                    return;
                  }
                  showToast(normalized.description || normalized.title, { tone: "error" });
                } finally {
                  setBusyUserId((current) => (current === item.userId ? null : current));
                }
              })();
            },
          },
        ]
      );
    },
    [pathname, showToast]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="차단한 사용자" />
        <View style={styles.center}>
          <AppLoading message="차단 목록을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="차단한 사용자" />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="차단 목록은 로그인 후 확인할 수 있어요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.replace(buildAuthRoute("/(auth)", pathname)),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="차단한 사용자" />
        <View style={styles.center}>
          <AppError error={error} onRetry={loadBlockedUsers} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="차단한 사용자" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>내 화면에서 숨긴 사용자</Text>
          <Text style={styles.heroDescription}>
            여기에서 차단 목록을 확인하고 언제든 차단을 해제할 수 있어요.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <AppEmpty
              title="아직 차단한 사용자가 없어요"
              description="차단한 사용자가 생기면 여기에서 한 번에 관리할 수 있어요."
            />
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const nicknameVisible =
                item.nickname && item.nickname.trim().length > 0 && item.nickname !== item.displayName;

              return (
                <View key={item.userId} style={styles.card}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{item.displayName}</Text>
                    {nicknameVisible ? (
                      <Text style={styles.cardNickname}>@{item.nickname}</Text>
                    ) : null}
                    <Text style={styles.cardMeta}>
                      차단한 시각 · {formatDateTime(item.createdAt ?? undefined)}
                    </Text>
                    <Text style={styles.cardDescription}>
                      차단을 해제하면 이 사용자의 글과 프로필이 다시 보일 수 있어요.
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => confirmUnblock(item)}
                    style={[
                      styles.unblockBtn,
                      busyUserId === item.userId && styles.disabledBtn,
                    ]}
                    disabled={busyUserId === item.userId}
                  >
                    <Text style={styles.unblockBtnText}>
                      {busyUserId === item.userId ? "처리 중..." : "차단 해제"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
        <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  topBar: {
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  heroDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  emptyWrap: {
    minHeight: 280,
    justifyContent: "center",
  },
  list: {
    gap: tokens.space.sm as any,
  },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  cardCopy: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  cardNickname: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  cardMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
  },
  cardDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  unblockBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
  },
  unblockBtnText: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  disabledBtn: {
    opacity: 0.45,
  },
});
