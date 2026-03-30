import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { AppError } from "@/components/state/AppError";
import { extractAuthToken } from "@/lib/authResponse";
import { buildAuthRoute, resolvePostAuthRedirect } from "@/lib/authRedirect";
import { apiPost } from "@/lib/api";
import { COOKIE_SESSION_TOKEN } from "@/lib/authToken";
import { formatKstDateTime } from "@/lib/dateTime";
import { ApiError, normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type LoginResponse = {
  ok: boolean;
  message?: string;
  token?: string;
  reactivation_required?: boolean;
  scheduled_purge_at?: string | null;
};

type PendingReactivation = {
  email: string;
  pw: string;
  message: string;
  scheduledPurgeAt?: string | null;
};

function formatReactivationDeadline(iso?: string | null) {
  return formatKstDateTime(iso);
}

export default function AuthLogin() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const { signIn } = useAuth();
  const redirect = params?.redirect ? String(params.redirect) : undefined;

  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [pendingReactivation, setPendingReactivation] = React.useState<PendingReactivation | null>(
    null
  );
  const [reactivationBusy, setReactivationBusy] = React.useState(false);

  async function finishLogin(res: LoginResponse) {
    const nextAuthToken =
      Platform.OS === "web" ? COOKIE_SESSION_TOKEN : extractAuthToken(res);
    if (!nextAuthToken) {
      setMessage("로그인 응답에 네이티브 인증 토큰이 없어요. 서버 로그인 응답 형식을 확인해 주세요.");
      return;
    }

    await signIn(nextAuthToken);
    router.replace(resolvePostAuthRedirect(redirect));
  }

  async function onReactivate() {
    if (!pendingReactivation || reactivationBusy) return;

    setReactivationBusy(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiPost<LoginResponse>("/api/login/reactivate", {
        email: pendingReactivation.email,
        pw: pendingReactivation.pw,
      });
      if (!res?.ok) {
        setPendingReactivation(null);
        setMessage(res?.message || "계정 재활성화에 실패했어요.");
        return;
      }

      setPendingReactivation(null);
      await finishLogin(res);
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : "";
      if (e instanceof ApiError && e.status && e.status < 500) {
        setPendingReactivation(null);
        setMessage(rawMessage || "계정 재활성화에 실패했어요.");
        return;
      }
      setPendingReactivation(null);
      setError(normalizeApiError(e));
    } finally {
      setReactivationBusy(false);
    }
  }

  async function onLogin() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiPost<LoginResponse>("/api/login", { email, pw });
      if (!res?.ok) {
        setMessage(res?.message || "로그인에 실패했어요.");
        return;
      }
      if (res?.reactivation_required) {
        setPendingReactivation({
          email,
          pw,
          message:
            res.message || "비활성화된 계정입니다. 다시 활성화할지 한 번 더 확인해주세요.",
          scheduledPurgeAt: res.scheduled_purge_at ?? null,
        });
        setMessage(
          res.message || "비활성화된 계정입니다. 다시 활성화할지 한 번 더 확인해주세요."
        );
        return;
      }

      await finishLogin(res);
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : "";
      if (e instanceof ApiError && e.status && e.status < 500) {
        setMessage(rawMessage || "로그인에 실패했어요.");
        return;
      }
      setError(normalizeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="auth-login-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.h1}>로그인</Text>
            <View style={{ width: 36 }} />
          </View>

          <Text style={styles.sub}>이메일과 비밀번호로 로그인해요.</Text>

          {error ? (
            <View style={styles.block}>
              <AppError error={error} />
            </View>
          ) : null}

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              editable={!busy && !reactivationBusy}
              testID="login-email-input"
            />
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="비밀번호"
              secureTextEntry
              style={styles.input}
              editable={!busy && !reactivationBusy}
              testID="login-password-input"
            />

            <Pressable
              onPress={onLogin}
              disabled={busy || reactivationBusy || !email || !pw}
              testID="login-submit-btn"
              style={({ pressed }) => [
                styles.primaryBtn,
                (busy || reactivationBusy || !email || !pw) && styles.primaryBtnDisabled,
                pressed && !busy && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>{busy ? "로그인 중..." : "로그인"}</Text>
            </Pressable>

            {message ? <Text style={styles.helper}>{message}</Text> : null}

            <Pressable onPress={() => router.push(buildAuthRoute("/(auth)/forgot-password", redirect))}>
              <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
            </Pressable>

            <Pressable onPress={() => router.push(buildAuthRoute("/(auth)/signup", redirect))}>
              <Text style={styles.link}>계정이 없나요? 회원가입</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={!!pendingReactivation} animationType="fade">
        <View style={styles.modalOverlay} testID="login-reactivation-modal">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>계정 다시 활성화</Text>
            <Text style={styles.modalDescription}>
              계속 진행하면 계정이 다시 활성화되고 로그인됩니다.
            </Text>
            <Text style={styles.modalMessage}>
              {pendingReactivation?.message ||
                "비활성화된 계정입니다. 다시 활성화할지 한 번 더 확인해주세요."}
            </Text>
            {pendingReactivation?.scheduledPurgeAt ? (
              <Text style={styles.modalMeta}>
                예정 삭제 시각: {formatReactivationDeadline(pendingReactivation.scheduledPurgeAt)}
              </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => {
                  if (reactivationBusy) return;
                  setPendingReactivation(null);
                  setMessage("계정 재활성화는 아직 진행되지 않았습니다.");
                }}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                disabled={reactivationBusy}
                testID="login-reactivation-cancel-btn"
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextCancel]}>취소</Text>
              </Pressable>

              <Pressable
                onPress={() => void onReactivate()}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                disabled={reactivationBusy}
                testID="login-reactivation-continue-btn"
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                  {reactivationBusy ? "다시 활성화 중..." : "계속 진행"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    gap: tokens.space.lg as any,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  backText: { fontSize: 18, fontWeight: "900", color: tokens.colors.text },
  h1: { fontSize: tokens.font.h1, fontWeight: "900", color: tokens.colors.text },
  sub: { fontSize: tokens.font.body, color: tokens.colors.textMuted },
  block: { marginTop: tokens.space.sm },
  form: { gap: tokens.space.sm as any },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 12,
    fontSize: tokens.font.body,
    color: tokens.colors.text,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.green700,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: tokens.space.sm,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontSize: 15, fontWeight: "800" },
  helper: { fontSize: tokens.font.small, color: tokens.colors.textMuted, marginTop: 4 },
  link: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "800",
    marginTop: tokens.space.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.space.xl,
    gap: tokens.space.sm as any,
  },
  modalTitle: {
    fontSize: tokens.font.h1,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  modalDescription: {
    fontSize: tokens.font.body,
    color: tokens.colors.text,
    lineHeight: 22,
  },
  modalMessage: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  modalMeta: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "700",
  },
  modalButtons: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
    marginTop: tokens.space.sm,
  },
  modalBtn: {
    flex: 1,
    borderRadius: tokens.radius.lg,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalBtnCancel: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.borderStrong,
  },
  modalBtnPrimary: {
    backgroundColor: tokens.colors.green700,
    borderColor: tokens.colors.green700,
  },
  modalBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
  },
  modalBtnTextCancel: {
    color: tokens.colors.text,
  },
  modalBtnTextPrimary: {
    color: tokens.colors.textInverse,
  },
});
