import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { buildAuthRoute } from "@/lib/authRedirect";
import { apiGet, apiPost } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import {
  type AccountClosureMode,
  type AccountClosureResponse,
  type MeResponse,
  formatDateTime,
} from "@/features/me/accountCenter";
import { tokens } from "@/theme/tokens";

export default function AccountCenterAccountClosureScreen() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [mode, setMode] = React.useState<AccountClosureMode>("delete");
  const [currentPw, setCurrentPw] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<MeResponse>("/api/me");
      setMe(response);
    } catch (e) {
      setError(normalizeApiError(e));
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function onSubmit() {
    const trimmedPw = currentPw.trim();
    const normalizedConfirmText = confirmText.trim().toUpperCase();

    if (!trimmedPw) {
      setMessage("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (normalizedConfirmText !== "DELETE") {
      setMessage("확인 문구 DELETE를 정확히 입력해주세요.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await apiPost<AccountClosureResponse>("/api/me/account-closure", {
        mode,
        currentPw,
        confirmText: normalizedConfirmText,
      });
      if (!response?.ok) {
        throw new Error(response?.message || "계정 정리 처리에 실패했어요.");
      }

      const successMessage =
        response?.scheduled_purge_at
          ? `${response.message}\n예정 삭제 시각: ${formatDateTime(response.scheduled_purge_at)}`
          : response?.message || "계정 정리가 완료되었어요.";

      Alert.alert(
        mode === "delete" ? "회원 탈퇴 완료" : "계정 비활성화 완료",
        successMessage,
        [
          {
            text: "확인",
            onPress: () => {
              void (async () => {
                await signOut();
                router.replace("/(auth)");
              })();
            },
          },
        ]
      );
    } catch (e) {
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        router.replace(buildAuthRoute("/(auth)/login", pathname));
        return;
      }
      setMessage(normalized.description || normalized.title);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="계정 관리" />
        <View style={styles.center}>
          <AppLoading message="계정 정보를 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="계정 관리" />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="계정 관리는 로그인 후 이용할 수 있어요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.replace(buildAuthRoute("/(auth)/login", pathname)),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="계정 관리" />
        <View style={styles.center}>
          <AppError error={error} onRetry={loadMe} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="계정 관리" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>계정 정리</Text>
          <Text style={styles.heroDescription}>
            계정 정리는 가장 민감한 작업이라 계정 센터 안에서도 별도 화면에서만 다뤄요.
          </Text>
          {me?.email ? <Text style={styles.heroMeta}>현재 계정: {me.email}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>정리 방식 선택</Text>
          <View style={styles.modeToggleRow}>
            <Pressable
              onPress={() => setMode("deactivate")}
              style={[styles.modeToggleChip, mode === "deactivate" && styles.modeToggleChipActive]}
            >
              <Text
                style={[
                  styles.modeToggleChipText,
                  mode === "deactivate" && styles.modeToggleChipTextActive,
                ]}
              >
                30일 비활성화
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("delete")}
              style={[styles.modeToggleChip, mode === "delete" && styles.modeToggleChipDanger]}
            >
              <Text
                style={[
                  styles.modeToggleChipText,
                  mode === "delete" && styles.modeToggleChipDangerText,
                ]}
              >
                즉시 회원 탈퇴
              </Text>
            </Pressable>
          </View>
          <Text style={styles.modeDescription}>
            {mode === "delete"
              ? "즉시 회원 탈퇴를 선택하면 계정과 작성 글, 관련 데이터가 바로 삭제되며 되돌릴 수 없어요."
              : "비활성화를 선택하면 계정은 30일 동안 비공개 상태로 유지되고, 다시 로그인하면 복구할 수 있어요."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>본인 확인</Text>
          <Text style={styles.cardDescription}>
            현재 비밀번호와 `DELETE` 확인 문구를 정확히 입력해야 진행할 수 있어요.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>현재 비밀번호</Text>
            <TextInput
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder="현재 비밀번호"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>확인 문구</Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            onPress={() => void onSubmit()}
            style={[styles.dangerBtn, busy && styles.disabledBtn]}
            disabled={busy}
          >
            <Text style={styles.dangerBtnText}>
              {busy
                ? mode === "delete"
                  ? "탈퇴 처리 중..."
                  : "비활성화 처리 중..."
                : mode === "delete"
                  ? "회원 탈퇴 실행"
                  : "비활성화 실행"}
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
  heroCard: {
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.dangerSoft,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  heroDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  heroMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.danger,
    fontWeight: "800",
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
  modeToggleRow: {
    flexDirection: "row",
    gap: tokens.space.xs as any,
    flexWrap: "wrap",
  },
  modeToggleChip: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: tokens.colors.surface,
  },
  modeToggleChipActive: {
    backgroundColor: tokens.colors.green100,
    borderColor: tokens.colors.green700,
  },
  modeToggleChipDanger: {
    backgroundColor: tokens.colors.dangerSoft,
    borderColor: tokens.colors.dangerBorder,
  },
  modeToggleChipText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  modeToggleChipTextActive: {
    color: tokens.colors.green900,
  },
  modeToggleChipDangerText: {
    color: tokens.colors.danger,
  },
  modeDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
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
  message: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  dangerBtn: {
    backgroundColor: tokens.colors.danger,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtnText: {
    color: tokens.colors.textInverse,
    fontSize: 15,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
