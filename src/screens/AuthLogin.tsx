import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { AppError } from "@/components/state/AppError";
import { apiPost } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type LoginResponse = {
  ok: boolean;
  message?: string;
  token?: string;
};

export default function AuthLogin() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

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
      if (!res.token) {
        setMessage("서버가 token을 응답하지 않았어요. (Bearer 계약 필요)");
        return;
      }

      await signIn(res.token);
      router.replace("/(tabs)");
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
            />
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="비밀번호"
              secureTextEntry
              style={styles.input}
            />

            <Pressable
              onPress={onLogin}
              disabled={busy || !email || !pw}
              style={({ pressed }) => [
                styles.primaryBtn,
                (busy || !email || !pw) && styles.primaryBtnDisabled,
                pressed && !busy && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>{busy ? "로그인 중..." : "로그인"}</Text>
            </Pressable>

            {message ? <Text style={styles.helper}>{message}</Text> : null}

            <Pressable onPress={() => router.replace("/(auth)/signup")}>
              <Text style={styles.link}>계정이 없나요? 회원가입</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
});
