import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { buildAuthRoute } from "@/lib/authRedirect";
import { AppError } from "@/components/state/AppError";
import { apiPost } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type PasswordResetRequestResponse = {
  ok?: boolean;
  message?: string;
};

export default function AuthForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = params?.redirect ? String(params.redirect) : undefined;
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

  async function onSubmit() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiPost<PasswordResetRequestResponse>("/api/password-reset-request", {
        email: email.trim(),
      });
      setMessage(res?.message || "입력하신 이메일이 등록되어 있다면 안내 메일이 발송됩니다.");
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
              <Text style={styles.h1}>비밀번호 찾기</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.sub}>
              가입한 이메일을 입력하면 비밀번호 재설정 안내를 보낼게요.
            </Text>

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
              />

              <Pressable
                onPress={onSubmit}
                disabled={busy || !email.trim()}
                style={[
                  styles.primaryBtn,
                  (busy || !email.trim()) && styles.primaryBtnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {busy ? "전송 중..." : "재설정 메일 보내기"}
                </Text>
              </Pressable>

              {message ? <Text style={styles.helper}>{message}</Text> : null}

              <Pressable onPress={() => router.replace(buildAuthRoute("/(auth)/login", redirect))}>
                <Text style={styles.link}>로그인으로 돌아가기</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl * 1.5,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: tokens.space.lg as any,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: { width: 36 },
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
  sub: { fontSize: tokens.font.body, color: tokens.colors.textMuted, lineHeight: 22 },
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
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontSize: 15, fontWeight: "800" },
  helper: { fontSize: tokens.font.small, color: tokens.colors.textMuted, lineHeight: 20 },
  link: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "800",
    marginTop: tokens.space.sm,
  },
});
