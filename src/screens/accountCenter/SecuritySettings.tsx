import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/feedback/ToastProvider";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import {
  describePushRegistrationResult,
  registerForPushNotificationsAsync,
} from "@/lib/pushNotifications";
import {
  type MeResponse,
  type SessionsResponse,
  type SessionItem,
  type UpdateMeResponse,
  formatDateTime,
  normalizeSession,
  parseFlag,
} from "@/features/me/accountCenter";
import {
  getMarketingPushConsent,
  updateMarketingPushConsent,
  type MarketingPushConsent,
} from "@/services/marketingPushService";
import { tokens } from "@/theme/tokens";

function replaceWithRootLogin() {
  try {
    if (router.canDismiss()) {
      router.dismissAll();
    }
  } catch {
    // dismissAll can be unavailable in preview/navigation edge cases.
  }
  router.replace("/(auth)/login");
}

export default function AccountCenterSecuritySettingsScreen() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [rememberLoginEnabled, setRememberLoginEnabled] = React.useState(false);
  const [savingRemember, setSavingRemember] = React.useState(false);
  const [marketingPushConsent, setMarketingPushConsent] =
    React.useState<MarketingPushConsent | null>(null);
  const [savingMarketingPush, setSavingMarketingPush] = React.useState(false);
  const [logoutAllBusy, setLogoutAllBusy] = React.useState(false);
  const [sessionBusySid, setSessionBusySid] = React.useState<string | null>(null);

  const loadSecurity = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meResponse, sessionsResponse, marketingConsentResponse] = await Promise.all([
        apiGet<MeResponse>("/api/me"),
        apiGet<SessionsResponse>("/api/me/sessions"),
        getMarketingPushConsent(),
      ]);
      setMe(meResponse);
      setRememberLoginEnabled(parseFlag(meResponse.remember_login_enabled));
      setMarketingPushConsent(marketingConsentResponse);
      setSessions(
        Array.isArray(sessionsResponse?.sessions)
          ? sessionsResponse.sessions.map(normalizeSession)
          : []
      );
    } catch (e) {
      setError(normalizeApiError(e));
      setMe(null);
      setMarketingPushConsent(null);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  async function onSaveRememberSetting(nextValue: boolean) {
    setRememberLoginEnabled(nextValue);
    setSavingRemember(true);
    try {
      const response = await apiPut<UpdateMeResponse>("/api/me", {
        remember_login_enabled: nextValue,
      });
      if (response?.ok === false) {
        throw new Error(response.message || "로그인 유지 설정 저장에 실패했어요.");
      }
      showToast("로그인 유지 설정을 저장했어요.", { tone: "success" });
    } catch (e) {
      setRememberLoginEnabled((current) => !current);
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        replaceWithRootLogin();
        return;
      }
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setSavingRemember(false);
    }
  }

  async function onSaveMarketingPushConsent(nextValue: boolean) {
    if (!marketingPushConsent || savingMarketingPush) return;

    const previous = marketingPushConsent;
    setMarketingPushConsent((current) =>
      current ? { ...current, marketingPushOptIn: nextValue } : current
    );
    setSavingMarketingPush(true);
    try {
      const nextConsent = await updateMarketingPushConsent({
        marketingPushOptIn: nextValue,
        marketingVersion: previous.marketingVersion,
      });
      setMarketingPushConsent(nextConsent);

      if (nextValue) {
        try {
          const pushResult = await registerForPushNotificationsAsync({
            requestPermission: true,
          });
          showToast(describePushRegistrationResult(pushResult), {
            tone: "success",
            durationMs: 2600,
          });
        } catch {
          showToast("동의는 저장했어요. 알림 등록은 나중에 다시 시도돼요.", {
            tone: "success",
            durationMs: 2600,
          });
        }
        return;
      }

      showToast("마케팅 알림 수신 동의를 철회했어요.", { tone: "success" });
    } catch (e) {
      setMarketingPushConsent(previous);
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        replaceWithRootLogin();
        return;
      }
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setSavingMarketingPush(false);
    }
  }

  async function onLogoutAll() {
    setLogoutAllBusy(true);
    try {
      await apiPost("/api/logout-all", {});
      await signOut();
      replaceWithRootLogin();
    } catch (e) {
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        replaceWithRootLogin();
        return;
      }
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setLogoutAllBusy(false);
    }
  }

  async function onLogoutSession(session: SessionItem) {
    if (!session.sid || sessionBusySid) return;

    setSessionBusySid(session.sid);
    try {
      await apiDelete(`/api/me/sessions/${encodeURIComponent(session.sid)}`);
      if (session.current) {
        await signOut();
        replaceWithRootLogin();
        return;
      }

      setSessions((current) => current.filter((item) => item.sid !== session.sid));
      showToast("선택한 기기에서 로그아웃했어요.", { tone: "success" });
    } catch (e) {
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        await signOut();
        replaceWithRootLogin();
        return;
      }
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setSessionBusySid(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="보안 및 로그인" />
        <View style={styles.center}>
          <AppLoading message="보안 설정을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="보안 및 로그인" />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="보안 설정은 로그인 후 이용할 수 있어요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: replaceWithRootLogin,
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="보안 및 로그인" />
        <View style={styles.center}>
          <AppError error={error} onRetry={loadSecurity} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="보안 및 로그인" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>로그인 유지</Text>
          <Text style={styles.cardDescription}>
            현재 기기에서 로그인 유지 여부를 조절해요.
          </Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => void onSaveRememberSetting(true)}
              style={[styles.toggleChip, rememberLoginEnabled && styles.toggleChipActive]}
              disabled={savingRemember}
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
              onPress={() => void onSaveRememberSetting(false)}
              style={[styles.toggleChip, !rememberLoginEnabled && styles.toggleChipActive]}
              disabled={savingRemember}
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>광고성 마케팅 알림</Text>
          <Text style={styles.cardDescription}>
            이벤트, 새 기능, 글쓰기 리마인드처럼 앱 이용을 권유하는 광고성 정보를 푸시로 받을지 선택해요. 댓글, 답글, 팔로워 같은 거래성 알림과는 별도로 관리됩니다.
          </Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => void onSaveMarketingPushConsent(true)}
              style={[
                styles.toggleChip,
                marketingPushConsent?.marketingPushOptIn && styles.toggleChipActive,
              ]}
              disabled={savingMarketingPush || !marketingPushConsent}
              testID="marketing-push-opt-in-btn"
              accessibilityRole="button"
              accessibilityLabel="광고성 마케팅 알림 수신 동의"
            >
              <Text
                style={[
                  styles.toggleChipText,
                  marketingPushConsent?.marketingPushOptIn && styles.toggleChipTextActive,
                ]}
              >
                동의
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onSaveMarketingPushConsent(false)}
              style={[
                styles.toggleChip,
                marketingPushConsent &&
                  !marketingPushConsent.marketingPushOptIn &&
                  styles.toggleChipActive,
              ]}
              disabled={savingMarketingPush || !marketingPushConsent}
              testID="marketing-push-opt-out-btn"
              accessibilityRole="button"
              accessibilityLabel="광고성 마케팅 알림 수신 철회"
            >
              <Text
                style={[
                  styles.toggleChipText,
                  marketingPushConsent &&
                    !marketingPushConsent.marketingPushOptIn &&
                    styles.toggleChipTextActive,
                ]}
              >
                철회
              </Text>
            </Pressable>
          </View>
          <Text style={styles.consentNote}>
            동의 여부는 언제든 여기에서 바꿀 수 있어요.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>활성 세션</Text>
          <Text style={styles.cardDescription}>
            현재 로그인된 기기를 확인하고 필요한 기기만 로그아웃할 수 있어요.
          </Text>

          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>활성 세션이 없어요.</Text>
          ) : (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <View key={session.sid} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTitle}>
                      {session.current ? "현재 기기" : "다른 기기"}
                    </Text>
                    <Pressable
                      onPress={() => void onLogoutSession(session)}
                      style={[
                        styles.sessionLogoutBtn,
                        session.current && styles.sessionLogoutBtnDanger,
                        (sessionBusySid === session.sid || logoutAllBusy) && styles.disabledBtn,
                      ]}
                      disabled={sessionBusySid === session.sid || logoutAllBusy}
                      accessibilityRole="button"
                      accessibilityLabel={`${session.current ? "현재 기기" : "다른 기기"} 로그아웃`}
                    >
                      <Text
                        style={[
                          styles.sessionLogoutBtnText,
                          session.current && styles.sessionLogoutBtnDangerText,
                        ]}
                      >
                        {sessionBusySid === session.sid ? "처리 중..." : "로그아웃"}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.sessionMeta}>{session.userAgent}</Text>
                  <Text style={styles.sessionMeta}>
                    최근 활동 {formatDateTime(session.lastSeenAt)}
                  </Text>
                  <Text style={styles.sessionMeta}>만료 {formatDateTime(session.expiresAt)}</Text>
                  <Text style={styles.sessionMeta}>
                    {session.rememberMe ? "로그인 유지" : "기본 세션"}
                    {session.ipHint ? ` · ${session.ipHint}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => void onLogoutAll()}
            style={[styles.secondaryBtn, logoutAllBusy && styles.disabledBtn]}
            disabled={logoutAllBusy}
          >
            <Text style={styles.secondaryBtnText}>
              {logoutAllBusy ? "처리 중..." : "전체 로그아웃"}
            </Text>
          </Pressable>
        </View>
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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  cardDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
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
  emptyText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  consentNote: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textFaint,
    lineHeight: 18,
  },
  sessionList: {
    gap: tokens.space.sm as any,
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
    gap: 6,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
    flex: 1,
  },
  sessionMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  sessionLogoutBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: tokens.colors.surfaceStrong,
    minWidth: 78,
    alignItems: "center",
  },
  sessionLogoutBtnDanger: {
    borderColor: tokens.colors.danger,
  },
  sessionLogoutBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sessionLogoutBtnDangerText: {
    color: tokens.colors.danger,
  },
  secondaryBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: tokens.colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
